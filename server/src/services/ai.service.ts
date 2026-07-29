import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { aiConfigs, courses, declarations } from '../models/schema.js';
import { createLLMAdapter } from '../llm/factory.js';
import { LLMError } from '../llm/adapter.interface.js';
import type { LLMProvider } from '../llm/adapter.interface.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const MAX_QUERY_LENGTH = 2000;

export const VALID_AI_PROVIDERS = ['gemini', 'claude', 'grok', 'nvidia', 'ollama'] as const;

// ─── Error Types ────────────────────────────────────────────────────────────

export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/** Alias for backward compatibility with routes */
export { AIError as AIServiceError };

// ─── Encryption Helpers ─────────────────────────────────────────────────────

/**
 * Returns the 32-byte encryption key from the ENCRYPTION_KEY env variable.
 * The env variable must be a 64-character hex string (32 bytes).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new AIError(
      'Encryption key no configurada correctamente.',
      'SERVICE_UNAVAILABLE',
      503
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a single Buffer containing: IV (12 bytes) + authTag (16 bytes) + ciphertext.
 */
export function encrypt(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Store as: IV | AuthTag | Ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer that was encrypted with the encrypt() function.
 * Expects format: IV (12 bytes) + authTag (16 bytes) + ciphertext.
 * Returns the original plaintext string.
 */
export function decrypt(data: Buffer): string {
  const key = getEncryptionKey();

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new AIError(
      'Datos cifrados inválidos.',
      'SERVICE_UNAVAILABLE',
      503
    );
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

// ─── AIService ──────────────────────────────────────────────────────────────

export const AIService = {
  /**
   * Configure (store/update) the AI provider and encrypted API key for a teacher.
   * Encrypts the API key with AES-256-GCM before storing.
   */
  async configure(teacherId: string, provider: LLMProvider, apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new AIError(
        'La API key no puede estar vacía.',
        'VALIDATION_FAILED',
        400
      );
    }

    const encryptedKey = encrypt(apiKey);

    // Check if config exists for this teacher
    const [existing] = await db
      .select({ id: aiConfigs.id })
      .from(aiConfigs)
      .where(eq(aiConfigs.teacherId, teacherId))
      .limit(1);

    if (existing) {
      // Update existing config
      await db
        .update(aiConfigs)
        .set({
          provider,
          encryptedApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(eq(aiConfigs.teacherId, teacherId));
    } else {
      // Insert new config
      await db.insert(aiConfigs).values({
        teacherId,
        provider,
        encryptedApiKey: encryptedKey,
      });
    }
  },

  /**
   * Send a chat query to the configured LLM provider.
   * Builds context from the teacher's declarations, enforces 2000-char max on query.
   * Only sends data from the authenticated teacher's courses.
   */
  async chat(teacherId: string, query: string, courseId?: string): Promise<string> {
    // Enforce max query length
    if (!query || query.trim().length === 0) {
      throw new AIError(
        'La consulta no puede estar vacía.',
        'VALIDATION_FAILED',
        400
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      throw new AIError(
        `La consulta excede el máximo de ${MAX_QUERY_LENGTH} caracteres.`,
        'VALIDATION_FAILED',
        400
      );
    }

    // Get teacher's AI config
    const config = await getTeacherConfig(teacherId);
    if (!config) {
      throw new AIError(
        'No se ha configurado un proveedor de IA.',
        'VALIDATION_FAILED',
        400
      );
    }

    // Decrypt the API key
    const apiKey = decrypt(config.encryptedApiKey as Buffer);

    // Build context from teacher's declarations
    const context = await buildContext(teacherId, courseId);

    // Call the LLM adapter
    try {
      const adapter = createLLMAdapter(config.provider as LLMProvider, apiKey);
      const response = await adapter.chat(query, context);
      return response;
    } catch (error) {
      if (error instanceof LLMError) {
        throw mapLLMError(error);
      }
      throw new AIError(
        'Error al comunicarse con el proveedor de IA.',
        'SERVICE_UNAVAILABLE',
        503
      );
    }
  },

  /**
   * Generate a summary for a specific course using the LLM.
   * Builds a summary prompt with: count of learnings, top 5 tools, verified vs unverified ratio.
   */
  async summarize(teacherId: string, courseId: string): Promise<string> {
    // Verify the teacher owns the course
    const [course] = await db
      .select({ ownerId: courses.ownerId, name: courses.name })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course || course.ownerId !== teacherId) {
      throw new AIError(
        'Acceso denegado.',
        'ACCESS_DENIED',
        403
      );
    }

    // Get teacher's AI config
    const config = await getTeacherConfig(teacherId);
    if (!config) {
      throw new AIError(
        'No se ha configurado un proveedor de IA.',
        'VALIDATION_FAILED',
        400
      );
    }

    // Decrypt the API key
    const apiKey = decrypt(config.encryptedApiKey as Buffer);

    // Build summary data from course declarations
    const summaryData = await buildSummaryData(courseId);

    // Build the summary prompt
    const prompt = buildSummaryPrompt(course.name, summaryData);

    // Call the LLM adapter
    try {
      const adapter = createLLMAdapter(config.provider as LLMProvider, apiKey);
      const response = await adapter.chat(prompt, '');
      return response;
    } catch (error) {
      if (error instanceof LLMError) {
        throw mapLLMError(error);
      }
      throw new AIError(
        'Error al comunicarse con el proveedor de IA.',
        'SERVICE_UNAVAILABLE',
        503
      );
    }
  },

  /**
   * Get the current AI configuration for a teacher.
   * Returns provider and hasKey boolean — never exposes the actual key.
   */
  async getConfig(teacherId: string): Promise<{ provider: string; hasKey: boolean } | null> {
    const [config] = await db
      .select({
        provider: aiConfigs.provider,
        encryptedApiKey: aiConfigs.encryptedApiKey,
      })
      .from(aiConfigs)
      .where(eq(aiConfigs.teacherId, teacherId))
      .limit(1);

    if (!config) {
      return null;
    }

    return {
      provider: config.provider,
      hasKey: config.encryptedApiKey !== null && (config.encryptedApiKey as Buffer).length > 0,
    };
  },
};

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Fetch the teacher's AI config from the database.
 */
async function getTeacherConfig(teacherId: string) {
  const [config] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.teacherId, teacherId))
    .limit(1);

  return config ?? null;
}

/**
 * Build context string from the teacher's declarations.
 * Only includes data from the authenticated teacher's courses.
 * If courseId is provided, only that course's declarations are included.
 */
async function buildContext(teacherId: string, courseId?: string): Promise<string> {
  // Get teacher's courses (enforce data isolation)
  const teacherCourses = await db
    .select({ id: courses.id, name: courses.name })
    .from(courses)
    .where(eq(courses.ownerId, teacherId));

  if (teacherCourses.length === 0) {
    return 'No hay cursos registrados.';
  }

  // If courseId is specified, verify it belongs to the teacher
  const targetCourseIds = courseId
    ? teacherCourses.filter((c) => c.id === courseId).map((c) => c.id)
    : teacherCourses.map((c) => c.id);

  if (targetCourseIds.length === 0) {
    return 'No hay datos disponibles para el curso seleccionado.';
  }

  // Fetch declarations for the target courses
  const allDeclarations = [];
  for (const cId of targetCourseIds) {
    const courseDeclarations = await db
      .select()
      .from(declarations)
      .where(eq(declarations.courseId, cId));
    allDeclarations.push(...courseDeclarations);
  }

  if (allDeclarations.length === 0) {
    return 'No hay declaraciones registradas.';
  }

  // Build a summarized context for the LLM
  const totalDeclarations = allDeclarations.length;
  const usedAI = allDeclarations.filter((d) => d.usedAi).length;
  const notUsedAI = totalDeclarations - usedAI;

  // Top tools
  const toolCounts: Record<string, number> = {};
  for (const d of allDeclarations) {
    if (d.aiTool) {
      toolCounts[d.aiTool] = (toolCounts[d.aiTool] || 0) + 1;
    }
  }
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, count]) => `${tool} (${count})`);

  // Sample learnings (up to 10 recent entries to avoid context overload)
  const recentLearnings = allDeclarations
    .filter((d) => d.learnings)
    .slice(0, 10)
    .map((d) => `- ${d.studentName}: ${d.learnings}`);

  const coursesContext = teacherCourses
    .filter((c) => targetCourseIds.includes(c.id))
    .map((c) => c.name)
    .join(', ');

  return [
    `Cursos: ${coursesContext}`,
    `Total declaraciones: ${totalDeclarations}`,
    `Usaron IA: ${usedAI}, No usaron IA: ${notUsedAI}`,
    `Herramientas más usadas: ${topTools.length > 0 ? topTools.join(', ') : 'ninguna'}`,
    recentLearnings.length > 0
      ? `Aprendizajes recientes:\n${recentLearnings.join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

interface SummaryData {
  totalDeclarations: number;
  learningsCount: number;
  topTools: Array<{ tool: string; count: number }>;
  verifiedCount: number;
  unverifiedCount: number;
}

/**
 * Build summary statistics for a course's declarations.
 */
async function buildSummaryData(courseId: string): Promise<SummaryData> {
  const courseDeclarations = await db
    .select()
    .from(declarations)
    .where(eq(declarations.courseId, courseId));

  const totalDeclarations = courseDeclarations.length;

  // Count learnings (non-null, non-empty learnings field)
  const learningsCount = courseDeclarations.filter(
    (d) => d.learnings && d.learnings.trim().length > 0
  ).length;

  // Top 5 tools by frequency
  const toolCounts: Record<string, number> = {};
  for (const d of courseDeclarations) {
    if (d.aiTool) {
      toolCounts[d.aiTool] = (toolCounts[d.aiTool] || 0) + 1;
    }
  }
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, count]) => ({ tool, count }));

  // Verified vs unverified (has verification_method = verified)
  const verifiedCount = courseDeclarations.filter(
    (d) => d.verificationMethod && d.verificationMethod.trim().length > 0
  ).length;
  const unverifiedCount = totalDeclarations - verifiedCount;

  return {
    totalDeclarations,
    learningsCount,
    topTools,
    verifiedCount,
    unverifiedCount,
  };
}

/**
 * Build a prompt for the LLM to generate a course summary.
 */
function buildSummaryPrompt(courseName: string, data: SummaryData): string {
  const toolsList = data.topTools.length > 0
    ? data.topTools.map((t) => `  - ${t.tool}: ${t.count} uso(s)`).join('\n')
    : '  Ninguna herramienta reportada';

  const verifiedRatio =
    data.totalDeclarations > 0
      ? `${data.verifiedCount}/${data.totalDeclarations} (${Math.round((data.verifiedCount / data.totalDeclarations) * 100)}%)`
      : '0/0';

  return [
    `Genera un resumen analítico del curso "${courseName}" basándote en los siguientes datos:`,
    '',
    `- Total de declaraciones: ${data.totalDeclarations}`,
    `- Declaraciones con aprendizajes reportados: ${data.learningsCount}`,
    `- Top 5 herramientas de IA más usadas:`,
    toolsList,
    `- Proporción verificadas vs no verificadas: ${verifiedRatio}`,
    '',
    'Proporciona un resumen conciso con conclusiones y recomendaciones para el docente.',
  ].join('\n');
}

/**
 * Map LLM-specific errors to AIError with appropriate error codes.
 */
function mapLLMError(error: LLMError): AIError {
  switch (error.code) {
    case 'INVALID_KEY':
      return new AIError(
        'La API key configurada es inválida. Verifique su configuración.',
        'AI_INVALID_KEY',
        422
      );
    case 'TIMEOUT':
      return new AIError(
        'El proveedor de IA no respondió dentro del tiempo límite (30s).',
        'AI_TIMEOUT',
        504
      );
    case 'QUOTA_EXCEEDED':
      return new AIError(
        'Se ha excedido la cuota del proveedor de IA. Intente más tarde.',
        'AI_QUOTA_EXCEEDED',
        429
      );
    default:
      return new AIError(
        'Error al comunicarse con el proveedor de IA.',
        'SERVICE_UNAVAILABLE',
        503
      );
  }
}
