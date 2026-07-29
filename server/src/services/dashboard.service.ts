import { db } from '../db/connection.js';
import { courses, declarations } from '../models/schema.js';
import { eq, and, sql, count } from 'drizzle-orm';

export interface DashboardStats {
  totalDeclarations: number;
  usedAI: number;
  notUsedAI: number;
  topTools: Array<{ tool: string; count: number }>;
  declarationsPerCourse: Array<{ courseId: string; courseName: string; count: number }>;
  progressByCourse: Array<{ courseId: string; courseName: string; received: number; expected: number; percentage: number }>;
}

/**
 * DashboardService provides statistics about declarations for a teacher's courses.
 */
export class DashboardService {
  /**
   * Returns dashboard statistics for a teacher, optionally filtered by courseId.
   * Handles empty state gracefully (no courses/declarations returns zeroed stats).
   */
  static async getStats(teacherId: string, courseId?: string): Promise<DashboardStats> {

    // Get all courses for this teacher (or a specific one)
    const courseCondition = courseId
      ? and(eq(courses.ownerId, teacherId), eq(courses.id, courseId))
      : eq(courses.ownerId, teacherId);

    const teacherCourses = await db
      .select({ id: courses.id, name: courses.name, expectedStudents: courses.expectedStudents })
      .from(courses)
      .where(courseCondition);

    // Empty state — teacher has no courses (or courseId doesn't match)
    if (teacherCourses.length === 0) {
      return {
        totalDeclarations: 0,
        usedAI: 0,
        notUsedAI: 0,
        topTools: [],
        declarationsPerCourse: [],
        progressByCourse: [],
      };
    }

    const courseIds = teacherCourses.map((c) => c.id);

    // Build the IN condition for course IDs
    const courseInCondition = sql`${declarations.courseId} IN (${sql.join(
      courseIds.map((id) => sql`${id}`),
      sql`, `
    )})`;

    // Total declarations
    const [totals] = await db
      .select({
        total: count(),
        usedAI: count(sql`CASE WHEN ${declarations.usedAi} = true THEN 1 END`),
        notUsedAI: count(sql`CASE WHEN ${declarations.usedAi} = false THEN 1 END`),
      })
      .from(declarations)
      .where(courseInCondition);

    // Top tools (top 10 AI tools by frequency)
    const topToolsResult = await db
      .select({
        tool: declarations.aiTool,
        count: count(),
      })
      .from(declarations)
      .where(and(courseInCondition, eq(declarations.usedAi, true), sql`${declarations.aiTool} IS NOT NULL`))
      .groupBy(declarations.aiTool)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Declarations per course
    const declarationsPerCourse = await db
      .select({
        courseId: declarations.courseId,
        count: count(),
      })
      .from(declarations)
      .where(courseInCondition)
      .groupBy(declarations.courseId);

    // Map course names
    const courseMap = new Map(teacherCourses.map((c) => [c.id, c]));

    const declarationsPerCourseResult = declarationsPerCourse.map((d) => ({
      courseId: d.courseId,
      courseName: courseMap.get(d.courseId)?.name ?? '',
      count: d.count,
    }));

    // Progress by course
    const progressByCourse = teacherCourses.map((c) => {
      const decCount = declarationsPerCourse.find((d) => d.courseId === c.id)?.count ?? 0;
      const expected = c.expectedStudents ?? 0;
      const percentage = expected > 0 ? Math.round((decCount / expected) * 100) : 0;
      return {
        courseId: c.id,
        courseName: c.name,
        received: decCount,
        expected,
        percentage,
      };
    });

    return {
      totalDeclarations: totals.total,
      usedAI: totals.usedAI,
      notUsedAI: totals.notUsedAI,
      topTools: topToolsResult.map((t) => ({ tool: t.tool ?? '', count: t.count })),
      declarationsPerCourse: declarationsPerCourseResult,
      progressByCourse,
    };
  }
}
