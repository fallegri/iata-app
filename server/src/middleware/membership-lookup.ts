import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { institutionMemberships } from '../models/schema.js';

/**
 * Queries the database for an active institution membership for the given teacher.
 * Returns the membership record or null if not found.
 */
export async function findActiveMembership(teacherId: string): Promise<{ institutionId: string; role: string } | null> {
  const memberships = await db
    .select()
    .from(institutionMemberships)
    .where(eq(institutionMemberships.teacherId, teacherId))
    .limit(1);

  if (memberships.length > 0) {
    return { institutionId: memberships[0].institutionId, role: memberships[0].role };
  }
  return null;
}
