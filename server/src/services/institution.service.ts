import crypto from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
  institutions,
  institutionMemberships,
  inviteCodes,
  teachers,
} from '../models/schema.js';
import { VALIDATION_RULES } from '@iata-app/shared';

// ─── Constants ──────────────────────────────────────────────────────────────

const INVITE_CODE_LENGTH = VALIDATION_RULES.inviteCode.codeLength;
const INVITE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// ─── Error Types ────────────────────────────────────────────────────────────

export class InstitutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'InstitutionError';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random 8-character alphanumeric code.
 */
function generateRandomCode(): string {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS[bytes[i] % INVITE_CODE_CHARS.length];
  }
  return code;
}

/**
 * Generates a unique invite code by checking against existing codes in the DB.
 */
async function generateUniqueInviteCode(): Promise<string> {
  const MAX_ATTEMPTS = 10;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateRandomCode();
    const [existing] = await db
      .select({ id: inviteCodes.id })
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code))
      .limit(1);

    if (!existing) {
      return code;
    }
  }
  throw new InstitutionError(
    'No se pudo generar un código único. Intente de nuevo.',
    'SERVICE_UNAVAILABLE',
    503
  );
}

/**
 * Verifies that the given teacher is an admin of the specified institution.
 * Returns the membership record if found, otherwise throws ACCESS_DENIED.
 */
async function verifyAdmin(teacherId: string, institutionId?: string) {
  const conditions = institutionId
    ? and(
        eq(institutionMemberships.teacherId, teacherId),
        eq(institutionMemberships.institutionId, institutionId),
        eq(institutionMemberships.role, 'admin')
      )
    : and(
        eq(institutionMemberships.teacherId, teacherId),
        eq(institutionMemberships.role, 'admin')
      );

  const [membership] = await db
    .select()
    .from(institutionMemberships)
    .where(conditions)
    .limit(1);

  if (!membership) {
    throw new InstitutionError(
      'No tiene permisos para realizar esta acción.',
      'ACCESS_DENIED',
      403
    );
  }

  return membership;
}

// ─── InstitutionService ─────────────────────────────────────────────────────

export const InstitutionService = {
  /**
   * Creates a new institution and assigns the teacher as admin.
   */
  async create(
    teacherId: string,
    name: string
  ): Promise<{ id: string; name: string; createdAt: Date }> {
    // Validate name
    if (!name || name.trim() === '') {
      throw new InstitutionError(
        'El nombre de la institución es obligatorio.',
        'VALIDATION_FAILED',
        400
      );
    }
    if (name.length > VALIDATION_RULES.institution.name.maxLength) {
      throw new InstitutionError(
        `El nombre de la institución no debe exceder ${VALIDATION_RULES.institution.name.maxLength} caracteres.`,
        'VALIDATION_FAILED',
        400
      );
    }

    // Create institution
    const [institution] = await db
      .insert(institutions)
      .values({
        name: name.trim(),
        createdBy: teacherId,
      })
      .returning({
        id: institutions.id,
        name: institutions.name,
        createdAt: institutions.createdAt,
      });

    // Assign the teacher as admin
    await db.insert(institutionMemberships).values({
      teacherId,
      institutionId: institution.id,
      role: 'admin',
    });

    return institution;
  },

  /**
   * Generates an invite code for the institution.
   * Only admins can generate codes.
   * Config: { maxUses: 1-100, validityDays: 1-30 }
   */
  async generateInviteCode(
    adminId: string,
    config: { maxUses: number; validityDays: number }
  ): Promise<{
    id: string;
    code: string;
    maxUses: number;
    currentUses: number;
    expiresAt: Date;
    createdAt: Date;
  }> {
    // Verify admin role and get their institution
    const membership = await verifyAdmin(adminId);

    // Validate config
    const { maxUses, validityDays } = config;

    if (
      !Number.isInteger(maxUses) ||
      maxUses < VALIDATION_RULES.inviteCode.minMaxUses ||
      maxUses > VALIDATION_RULES.inviteCode.maxMaxUses
    ) {
      throw new InstitutionError(
        `El número máximo de usos debe ser entre ${VALIDATION_RULES.inviteCode.minMaxUses} y ${VALIDATION_RULES.inviteCode.maxMaxUses}.`,
        'VALIDATION_FAILED',
        400
      );
    }

    if (
      !Number.isInteger(validityDays) ||
      validityDays < VALIDATION_RULES.inviteCode.minValidityDays ||
      validityDays > VALIDATION_RULES.inviteCode.maxValidityDays
    ) {
      throw new InstitutionError(
        `La validez debe ser entre ${VALIDATION_RULES.inviteCode.minValidityDays} y ${VALIDATION_RULES.inviteCode.maxValidityDays} días.`,
        'VALIDATION_FAILED',
        400
      );
    }

    // Generate unique code
    const code = await generateUniqueInviteCode();

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    // Store invite code
    const [inviteCode] = await db
      .insert(inviteCodes)
      .values({
        institutionId: membership.institutionId,
        createdBy: adminId,
        code,
        maxUses,
        currentUses: 0,
        expiresAt,
      })
      .returning({
        id: inviteCodes.id,
        code: inviteCodes.code,
        maxUses: inviteCodes.maxUses,
        currentUses: inviteCodes.currentUses,
        expiresAt: inviteCodes.expiresAt,
        createdAt: inviteCodes.createdAt,
      });

    return inviteCode;
  },

  /**
   * Joins an institution using an invite code.
   * Validates: code exists, not expired, current_uses < max_uses, teacher not already a member.
   */
  async joinWithCode(
    teacherId: string,
    code: string
  ): Promise<{
    id: string;
    teacherId: string;
    institutionId: string;
    role: string;
    joinedAt: Date;
  }> {
    // Find the invite code
    const [inviteRecord] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code))
      .limit(1);

    if (!inviteRecord) {
      throw new InstitutionError(
        'El código de invitación no es válido.',
        'INVITE_INVALID',
        422
      );
    }

    // Check if expired
    if (new Date(inviteRecord.expiresAt) < new Date()) {
      throw new InstitutionError(
        'El código de invitación ha expirado.',
        'INVITE_INVALID',
        422
      );
    }

    // Check if max uses reached
    if (inviteRecord.currentUses >= inviteRecord.maxUses) {
      throw new InstitutionError(
        'El código de invitación ha alcanzado el límite de usos.',
        'INVITE_INVALID',
        422
      );
    }

    // Check if teacher is already a member of this institution
    const [existingMembership] = await db
      .select({ id: institutionMemberships.id })
      .from(institutionMemberships)
      .where(
        and(
          eq(institutionMemberships.teacherId, teacherId),
          eq(institutionMemberships.institutionId, inviteRecord.institutionId)
        )
      )
      .limit(1);

    if (existingMembership) {
      throw new InstitutionError(
        'Ya es miembro de esta institución.',
        'VALIDATION_FAILED',
        409
      );
    }

    // Create membership
    const [membership] = await db
      .insert(institutionMemberships)
      .values({
        teacherId,
        institutionId: inviteRecord.institutionId,
        role: 'member',
      })
      .returning({
        id: institutionMemberships.id,
        teacherId: institutionMemberships.teacherId,
        institutionId: institutionMemberships.institutionId,
        role: institutionMemberships.role,
        joinedAt: institutionMemberships.joinedAt,
      });

    // Increment current_uses
    await db
      .update(inviteCodes)
      .set({ currentUses: sql`${inviteCodes.currentUses} + 1` })
      .where(eq(inviteCodes.id, inviteRecord.id));

    return membership;
  },

  /**
   * Gets the list of members of an institution.
   * Only admins can see members.
   * Returns: name, email, role, joinedAt (NO courses, declarations, or academic data).
   */
  async getMembers(
    adminId: string,
    institutionId: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    // Verify admin role for the specific institution
    await verifyAdmin(adminId, institutionId);

    // Query members joined with teachers
    const members = await db
      .select({
        id: institutionMemberships.id,
        name: teachers.name,
        email: teachers.email,
        role: institutionMemberships.role,
        joinedAt: institutionMemberships.joinedAt,
      })
      .from(institutionMemberships)
      .innerJoin(teachers, eq(institutionMemberships.teacherId, teachers.id))
      .where(eq(institutionMemberships.institutionId, institutionId));

    return members;
  },

  /**
   * Revokes a membership from an institution.
   * Only admins can revoke. Admin cannot revoke their own membership.
   * The membership record is deleted but courses/declarations remain in DB.
   */
  async revokeMembership(adminId: string, memberId: string): Promise<void> {
    // Find the membership to be revoked
    const [membershipToRevoke] = await db
      .select()
      .from(institutionMemberships)
      .where(eq(institutionMemberships.id, memberId))
      .limit(1);

    if (!membershipToRevoke) {
      throw new InstitutionError(
        'La membresía no fue encontrada.',
        'NOT_FOUND',
        404
      );
    }

    // Verify admin has admin role in the same institution
    await verifyAdmin(adminId, membershipToRevoke.institutionId);

    // Admin cannot revoke their own membership
    if (membershipToRevoke.teacherId === adminId) {
      throw new InstitutionError(
        'No puede revocar su propia membresía.',
        'VALIDATION_FAILED',
        400
      );
    }

    // Remove the membership record
    await db
      .delete(institutionMemberships)
      .where(eq(institutionMemberships.id, memberId));
  },
};
