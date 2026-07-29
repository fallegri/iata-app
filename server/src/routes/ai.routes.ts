import { Router, Request, Response } from 'express';
import { authMiddleware, requireMembership } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { AIService, AIServiceError } from '../services/ai.service.js';
import type { LLMProvider } from '../llm/adapter.interface.js';
import { VALIDATION_RULES, ERROR_CODES, ErrorResponse } from '@iata-app/shared';
import type { ValidationResult } from '@iata-app/shared';

const router = Router();

// All AI routes require authentication and active membership
router.use(authMiddleware);
router.use(requireMembership);

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_PROVIDERS: LLMProvider[] = ['gemini', 'claude', 'grok', 'nvidia', 'ollama'];

// ─── Validation functions ────────────────────────────────────────────────────

function validateConfigBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate provider
  if (!body.provider || (typeof body.provider === 'string' && body.provider.trim() === '')) {
    errors.push({
      field: 'provider',
      rule: 'required',
      message: 'El proveedor de IA es obligatorio.',
    });
  } else if (typeof body.provider !== 'string') {
    errors.push({
      field: 'provider',
      rule: 'type',
      message: 'El proveedor de IA debe ser una cadena de texto.',
    });
  } else if (!VALID_PROVIDERS.includes(body.provider as LLMProvider)) {
    errors.push({
      field: 'provider',
      rule: 'enum',
      message: `El proveedor debe ser uno de: ${VALID_PROVIDERS.join(', ')}.`,
    });
  }

  // Validate apiKey
  if (!body.apiKey || (typeof body.apiKey === 'string' && body.apiKey.trim() === '')) {
    errors.push({
      field: 'apiKey',
      rule: 'required',
      message: 'La API key es obligatoria.',
    });
  } else if (typeof body.apiKey !== 'string') {
    errors.push({
      field: 'apiKey',
      rule: 'type',
      message: 'La API key debe ser una cadena de texto.',
    });
  } else if (body.apiKey.length > VALIDATION_RULES.ai.apiKeyMaxLength) {
    errors.push({
      field: 'apiKey',
      rule: 'maxLength',
      message: `La API key no debe exceder ${VALIDATION_RULES.ai.apiKeyMaxLength} caracteres.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateChatBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate query
  if (!body.query || (typeof body.query === 'string' && body.query.trim() === '')) {
    errors.push({
      field: 'query',
      rule: 'required',
      message: 'La consulta es obligatoria.',
    });
  } else if (typeof body.query !== 'string') {
    errors.push({
      field: 'query',
      rule: 'type',
      message: 'La consulta debe ser una cadena de texto.',
    });
  } else if (body.query.length > VALIDATION_RULES.ai.queryMaxLength) {
    errors.push({
      field: 'query',
      rule: 'maxLength',
      message: `La consulta no debe exceder ${VALIDATION_RULES.ai.queryMaxLength} caracteres.`,
    });
  }

  // courseId is optional — validate only if provided
  if (body.courseId !== undefined && body.courseId !== null && body.courseId !== '') {
    if (typeof body.courseId !== 'string') {
      errors.push({
        field: 'courseId',
        rule: 'type',
        message: 'El ID del curso debe ser una cadena de texto.',
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Helper: map AIServiceError to HTTP response ─────────────────────────────

function handleAIError(error: unknown, res: Response): void {
  if (error instanceof AIServiceError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: error.code as ErrorResponse['error']['code'],
        message: error.message,
      },
    };
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Unexpected error — don't reveal internals
  const errorResponse: ErrorResponse = {
    error: {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'El servicio de IA no está disponible temporalmente. Intente de nuevo más tarde.',
    },
  };
  res.status(503).json(errorResponse);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * PUT /api/ai/config
 * Configure AI provider and API key for the authenticated teacher.
 * Body: { provider, apiKey }
 * Returns: { message: "..." }
 */
router.put('/config', validate(validateConfigBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.teacher!.id;
    const { provider, apiKey } = req.body;

    await AIService.configure(teacherId, provider, apiKey);

    res.status(200).json({
      message: 'Configuración de IA actualizada exitosamente.',
    });
  } catch (error) {
    handleAIError(error, res);
  }
});

/**
 * GET /api/ai/config
 * Get current AI configuration for the authenticated teacher.
 * Returns: { provider, hasKey }
 */
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.teacher!.id;
    const config = await AIService.getConfig(teacherId);

    if (!config) {
      res.status(200).json({ provider: null, hasKey: false });
      return;
    }

    res.status(200).json(config);
  } catch (error) {
    handleAIError(error, res);
  }
});

/**
 * POST /api/ai/chat
 * Send a chat query to the configured AI provider.
 * Body: { query, courseId? }
 * Returns: { response }
 */
router.post('/chat', validate(validateChatBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.teacher!.id;
    const { query, courseId } = req.body;

    const response = await AIService.chat(teacherId, query, courseId);

    res.status(200).json({ response });
  } catch (error) {
    handleAIError(error, res);
  }
});

export default router;
