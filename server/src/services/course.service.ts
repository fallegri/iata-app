import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { courses } from '../models/schema.js';
import type { EmailJSConfig, PublicCourseInfo } from '@iata-app/shared';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Character set excluding ambiguous chars (O/0, I/1, L) */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_CODE_GENERATION_RETRIES = 8;

// ─── Error Types ────────────────────────────────────────────────────────────

export class CourseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CourseError';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateCourseData {
  name: string;
  teacherName: string;
  teacherEmail: string;
  expectedStudents?: number;
  emailjsConfig?: EmailJSConfig | null;
}

export interface UpdateCourseData {
  name?: string;
  teacherName?: string;
  teacherEmail?: string;
  expectedStudents?: number;
  emailjsConfig?: EmailJSConfig | null;
}

// ─── CourseService ──────────────────────────────────────────────────────────

export const CourseService = {
  /**
   * Create a new course with a unique 6-char code.
   * Associates the course with the teacher and their institution.
   */
  async create(
    teacherId: string,
    institutionId: string,
    data: CreateCourseData
  ) {
    const code = await CourseService.generateUniqueCode();

    const [course] = await db
      .insert(courses)
      .values({
        code,
        name: data.name,
        teacherName: data.teacherName,
        teacherEmail: data.teacherEmail,
        ownerId: teacherId,
        institutionId,
        expectedStudents: data.expectedStudents ?? 0,
        emailjsConfig: data.emailjsConfig ?? null,
      })
      .returning();

    return course;
  },

  /**
   * Update a course. Only the course owner can update.
   * Throws ACCESS_DENIED if teacherId is not the owner (doesn't reveal if course exists).
   */
  async update(teacherId: string, courseId: string, data: UpdateCourseData) {
    // Verify ownership
    const [existing] = await db
      .select({ ownerId: courses.ownerId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existing || existing.ownerId !== teacherId) {
      throw new CourseError(
        'Acceso denegado.',
        'ACCESS_DENIED',
        403
      );
    }

    // Build update fields — only include provided values
    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.teacherName !== undefined) updateFields.teacherName = data.teacherName;
    if (data.teacherEmail !== undefined) updateFields.teacherEmail = data.teacherEmail;
    if (data.expectedStudents !== undefined) updateFields.expectedStudents = data.expectedStudents;
    if (data.emailjsConfig !== undefined) updateFields.emailjsConfig = data.emailjsConfig;

    // Always update the updatedAt timestamp
    updateFields.updatedAt = new Date();

    const [updated] = await db
      .update(courses)
      .set(updateFields)
      .where(eq(courses.id, courseId))
      .returning();

    return updated;
  },

  /**
   * Delete a course. Only the course owner can delete.
   * Cascade delete will remove all associated declarations (via ON DELETE CASCADE in schema).
   * Throws ACCESS_DENIED if teacherId is not the owner.
   */
  async delete(teacherId: string, courseId: string): Promise<void> {
    // Verify ownership
    const [existing] = await db
      .select({ ownerId: courses.ownerId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existing || existing.ownerId !== teacherId) {
      throw new CourseError(
        'Acceso denegado.',
        'ACCESS_DENIED',
        403
      );
    }

    await db.delete(courses).where(eq(courses.id, courseId));
  },

  /**
   * Find all courses owned by a teacher, ordered by creation date descending.
   */
  async findByTeacher(teacherId: string) {
    return db
      .select()
      .from(courses)
      .where(eq(courses.ownerId, teacherId))
      .orderBy(desc(courses.createdAt));
  },

  /**
   * Find a course by its public code.
   * Returns only public fields (code, name, teacherName, teacherEmail).
   * Returns null if the code doesn't exist.
   */
  async findByCode(code: string): Promise<PublicCourseInfo | null> {
    const [course] = await db
      .select({
        code: courses.code,
        name: courses.name,
        teacherName: courses.teacherName,
        teacherEmail: courses.teacherEmail,
      })
      .from(courses)
      .where(eq(courses.code, code.toUpperCase()))
      .limit(1);

    return course ?? null;
  },

  /**
   * Generate a unique 6-character course code using [A-Z0-9] (no ambiguous chars).
   * Retries up to 8 times if a collision is detected.
   */
  async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_RETRIES; attempt++) {
      const code = generateRandomCode();

      // Check uniqueness
      const [existing] = await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.code, code))
        .limit(1);

      if (!existing) {
        return code;
      }
    }

    throw new CourseError(
      'No se pudo generar un código único para el curso. Intente de nuevo.',
      'SERVICE_UNAVAILABLE',
      503
    );
  },
};

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Generate a random 6-character code from the allowed character set.
 */
function generateRandomCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}
