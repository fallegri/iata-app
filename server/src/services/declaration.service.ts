import { eq, desc, ilike, or, and, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { courses, declarations } from '../models/schema.js';
import { validateDeclarationFields } from '@iata-app/shared';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;
const MIN_SEARCH_LENGTH = 2;

// ─── Error Types ────────────────────────────────────────────────────────────

export class DeclarationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DeclarationError';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateDeclarationData {
  studentIdNumber: string;
  studentName: string;
  studentGroup: string;
  career: string;
  subject: string;
  activityType: 'tarea' | 'proyecto';
  usedAi: boolean;
  aiTool?: string | null;
  learnings?: string | null;
  verificationMethod?: string | null;
}

export interface FindByCourseOptions {
  page?: number;
  search?: string;
}

// ─── DeclarationService ─────────────────────────────────────────────────────

export const DeclarationService = {
  /**
   * Create a new declaration for a course identified by its code.
   * Validates the course exists and validates conditional AI fields.
   */
  async create(courseCode: string, data: CreateDeclarationData) {
    // Verify the course exists
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.code, courseCode.toUpperCase()))
      .limit(1);

    if (!course) {
      throw new DeclarationError(
        'El curso no fue encontrado.',
        'NOT_FOUND',
        404
      );
    }

    // Validate declaration fields (including conditional AI fields)
    const validation = validateDeclarationFields(data);
    if (!validation.valid) {
      throw new DeclarationError(
        'Los datos enviados contienen errores.',
        'VALIDATION_FAILED',
        400
      );
    }

    // Persist the declaration
    const [declaration] = await db
      .insert(declarations)
      .values({
        courseId: course.id,
        studentIdNumber: data.studentIdNumber,
        studentName: data.studentName,
        studentGroup: data.studentGroup,
        career: data.career,
        subject: data.subject,
        activityType: data.activityType,
        usedAi: data.usedAi,
        aiTool: data.usedAi ? (data.aiTool ?? null) : null,
        learnings: data.usedAi ? (data.learnings ?? null) : null,
        verificationMethod: data.usedAi ? (data.verificationMethod ?? null) : null,
      })
      .returning();

    return declaration;
  },

  /**
   * Find declarations for a specific course with pagination and optional search.
   * Verifies the teacher owns the course.
   */
  async findByCourse(teacherId: string, courseId: string, options?: FindByCourseOptions) {
    // Verify the teacher owns the course
    const [course] = await db
      .select({ ownerId: courses.ownerId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course || course.ownerId !== teacherId) {
      throw new DeclarationError(
        'Acceso denegado.',
        'ACCESS_DENIED',
        403
      );
    }

    const page = Math.max(1, options?.page ?? 1);
    const search = options?.search?.trim() ?? '';
    const offset = (page - 1) * PAGE_SIZE;

    // Build conditions
    const conditions = [eq(declarations.courseId, courseId)];

    if (search.length >= MIN_SEARCH_LENGTH) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(declarations.studentName, searchPattern),
          ilike(declarations.studentIdNumber, searchPattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(declarations)
      .where(whereClause);

    // Get paginated data
    const data = await db
      .select()
      .from(declarations)
      .where(whereClause)
      .orderBy(desc(declarations.submittedAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    const totalCount = Number(total);

    return {
      data,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: totalCount,
        totalPages: Math.ceil(totalCount / PAGE_SIZE),
      },
    };
  },

  /**
   * Search declarations across ALL courses owned by the teacher.
   * Filters by student_name or student_id_number matching the query.
   */
  async findByStudent(teacherId: string, query: string) {
    const search = query.trim();
    if (search.length < MIN_SEARCH_LENGTH) {
      return [];
    }

    const searchPattern = `%${search}%`;

    const results = await db
      .select({
        id: declarations.id,
        courseId: declarations.courseId,
        studentIdNumber: declarations.studentIdNumber,
        studentName: declarations.studentName,
        studentGroup: declarations.studentGroup,
        career: declarations.career,
        subject: declarations.subject,
        activityType: declarations.activityType,
        usedAi: declarations.usedAi,
        aiTool: declarations.aiTool,
        learnings: declarations.learnings,
        verificationMethod: declarations.verificationMethod,
        submittedAt: declarations.submittedAt,
      })
      .from(declarations)
      .innerJoin(courses, eq(declarations.courseId, courses.id))
      .where(
        and(
          eq(courses.ownerId, teacherId),
          or(
            ilike(declarations.studentName, searchPattern),
            ilike(declarations.studentIdNumber, searchPattern)
          )
        )
      )
      .orderBy(desc(declarations.submittedAt));

    return results;
  },

  /**
   * Get a single declaration by ID.
   * Verifies the declaration belongs to a course owned by the teacher.
   */
  async getById(teacherId: string, declarationId: string) {
    const [result] = await db
      .select({
        id: declarations.id,
        courseId: declarations.courseId,
        studentIdNumber: declarations.studentIdNumber,
        studentName: declarations.studentName,
        studentGroup: declarations.studentGroup,
        career: declarations.career,
        subject: declarations.subject,
        activityType: declarations.activityType,
        usedAi: declarations.usedAi,
        aiTool: declarations.aiTool,
        learnings: declarations.learnings,
        verificationMethod: declarations.verificationMethod,
        submittedAt: declarations.submittedAt,
      })
      .from(declarations)
      .innerJoin(courses, eq(declarations.courseId, courses.id))
      .where(
        and(
          eq(declarations.id, declarationId),
          eq(courses.ownerId, teacherId)
        )
      )
      .limit(1);

    return result ?? null;
  },

  /**
   * Export declarations as CSV for a specific course with optional search filter.
   * Same filters as findByCourse.
   */
  async exportCSV(teacherId: string, courseId: string, options?: FindByCourseOptions) {
    // Verify the teacher owns the course
    const [course] = await db
      .select({ ownerId: courses.ownerId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course || course.ownerId !== teacherId) {
      throw new DeclarationError(
        'Acceso denegado.',
        'ACCESS_DENIED',
        403
      );
    }

    const search = options?.search?.trim() ?? '';

    // Build conditions
    const conditions = [eq(declarations.courseId, courseId)];

    if (search.length >= MIN_SEARCH_LENGTH) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(declarations.studentName, searchPattern),
          ilike(declarations.studentIdNumber, searchPattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Get ALL matching declarations (no pagination for export)
    const data = await db
      .select()
      .from(declarations)
      .where(whereClause)
      .orderBy(desc(declarations.submittedAt));

    // Generate CSV
    const headers = [
      'Matrícula',
      'Nombre',
      'Grupo',
      'Carrera',
      'Materia',
      'Actividad',
      'Usó IA',
      'Herramienta',
      'Aprendizajes',
      'Verificación',
      'Fecha',
    ];

    const rows = data.map((d) => [
      escapeCSV(d.studentIdNumber),
      escapeCSV(d.studentName),
      escapeCSV(d.studentGroup),
      escapeCSV(d.career),
      escapeCSV(d.subject),
      escapeCSV(d.activityType),
      d.usedAi ? 'Sí' : 'No',
      escapeCSV(d.aiTool ?? ''),
      escapeCSV(d.learnings ?? ''),
      escapeCSV(d.verificationMethod ?? ''),
      escapeCSV(d.submittedAt.toISOString()),
    ]);

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.join(',')),
    ];

    return csvLines.join('\n');
  },
};

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Escape a value for CSV output.
 * Wraps in quotes if it contains commas, quotes, or newlines.
 * Doubles internal quotes per RFC 4180.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
