import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { teachers, passwordResets, institutionMemberships } from '../models/schema.js';
import { validateEmail, validatePassword } from '@iata-app/shared';
import type { AuthPayload } from '@iata-app/shared';

// ─── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_COST_FACTOR = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_EXPIRATION_MS = 60 * 60 * 1000; // 60 minutes
const DEFAULT_JWT_EXPIRATION_HOURS = 24;
const MIN_JWT_EXPIRATION_HOURS = 1;
const MAX_JWT_EXPIRATION_HOURS = 168;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }
  return secret;
}

function getJwtExpirationHours(): number {
  const envValue = process.env.JWT_EXPIRATION_HOURS;
  if (!envValue) return DEFAULT_JWT_EXPIRATION_HOURS;

  const hours = parseInt(envValue, 10);
  if (isNaN(hours) || hours < MIN_JWT_EXPIRATION_HOURS || hours > MAX_JWT_EXPIRATION_HOURS) {
    return DEFAULT_JWT_EXPIRATION_HOURS;
  }
  return hours;
}

function generateToken(payload: AuthPayload): string {
  const secret = getJwtSecret();
  const expirationHours = getJwtExpirationHours();
  return jwt.sign(payload, secret, { expiresIn: `${expirationHours}h` });
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Array<{ field: string; rule: string; message: string }>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── AuthService ────────────────────────────────────────────────────────────

export const AuthService = {
  /**
   * Register a new teacher account.
   * Validates email and password, hashes the password, and creates the teacher record.
   * Does NOT handle institution joining — that's done separately by routes.
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ teacher: { id: string; email: string; name: string }; token: string }> {
    // Validate email
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      throw new AuthError(
        'Los datos enviados contienen errores.',
        'VALIDATION_FAILED',
        400,
        emailResult.errors
      );
    }

    // Validate password
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      throw new AuthError(
        'Los datos enviados contienen errores.',
        'VALIDATION_FAILED',
        400,
        passwordResult.errors
      );
    }

    // Check if email already exists
    const existing = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new AuthError(
        'El correo electrónico ya se encuentra registrado.',
        'VALIDATION_FAILED',
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

    // Create teacher record
    const [newTeacher] = await db
      .insert(teachers)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash,
      })
      .returning({ id: teachers.id, email: teachers.email, name: teachers.name });

    // Generate JWT (no institution yet at this point)
    const payload: AuthPayload = {
      id: newTeacher.id,
      email: newTeacher.email,
      institutionId: null,
      role: null,
    };
    const token = generateToken(payload);

    return {
      teacher: { id: newTeacher.id, email: newTeacher.email, name: newTeacher.name },
      token,
    };
  },

  /**
   * Authenticate a teacher with email and password.
   * Tracks failed login attempts and enforces account lockout.
   */
  async login(
    email: string,
    password: string
  ): Promise<{ teacher: { id: string; email: string; name: string }; token: string }> {
    // Generic error message — must not reveal which field is incorrect
    const genericError = new AuthError(
      'Las credenciales proporcionadas son incorrectas.',
      'AUTH_REQUIRED',
      401
    );

    // Find teacher by email
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.email, email.toLowerCase()))
      .limit(1);

    if (!teacher) {
      throw genericError;
    }

    // Check if account is locked
    if (teacher.lockedUntil && new Date(teacher.lockedUntil) > new Date()) {
      throw new AuthError(
        'La cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intente de nuevo en 15 minutos.',
        'ACCOUNT_LOCKED',
        403
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, teacher.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = teacher.failedLoginAttempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock account
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await db
          .update(teachers)
          .set({ failedLoginAttempts: newAttempts, lockedUntil })
          .where(eq(teachers.id, teacher.id));

        throw new AuthError(
          'La cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intente de nuevo en 15 minutos.',
          'ACCOUNT_LOCKED',
          403
        );
      } else {
        await db
          .update(teachers)
          .set({ failedLoginAttempts: newAttempts })
          .where(eq(teachers.id, teacher.id));
      }

      throw genericError;
    }

    // Successful login — reset failed attempts
    await db
      .update(teachers)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(teachers.id, teacher.id));

    // Look up institution membership for the token payload
    const [membership] = await db
      .select({
        institutionId: institutionMemberships.institutionId,
        role: institutionMemberships.role,
      })
      .from(institutionMemberships)
      .where(eq(institutionMemberships.teacherId, teacher.id))
      .limit(1);

    const payload: AuthPayload = {
      id: teacher.id,
      email: teacher.email,
      institutionId: membership?.institutionId ?? null,
      role: (membership?.role as 'admin' | 'member') ?? null,
    };
    const token = generateToken(payload);

    return {
      teacher: { id: teacher.id, email: teacher.email, name: teacher.name },
      token,
    };
  },

  /**
   * Verify a JWT token and return the payload.
   * Returns null if the token is invalid or expired.
   */
  verifyToken(token: string): AuthPayload | null {
    try {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as AuthPayload & { iat: number; exp: number };
      return {
        id: decoded.id,
        email: decoded.email,
        institutionId: decoded.institutionId,
        role: decoded.role,
      };
    } catch {
      return null;
    }
  },

  /**
   * Request a password reset. Generates a hashed token and stores it in the DB.
   * Always succeeds (doesn't reveal whether email exists).
   */
  async requestPasswordReset(email: string): Promise<{ token: string } | null> {
    // Find teacher by email
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.email, email.toLowerCase()))
      .limit(1);

    if (!teacher) {
      // Don't reveal if email exists — return null silently
      return null;
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (so DB compromise doesn't expose tokens)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set expiration to 60 minutes from now
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS);

    // Store the hashed token
    await db.insert(passwordResets).values({
      teacherId: teacher.id,
      tokenHash,
      expiresAt,
    });

    // Return the raw token (would be sent via email in production)
    return { token: rawToken };
  },

  /**
   * Reset a password using a valid reset token.
   * Validates the new password, verifies the token, and updates the password hash.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.valid) {
      throw new AuthError(
        'Los datos enviados contienen errores.',
        'VALIDATION_FAILED',
        400,
        passwordResult.errors
      );
    }

    // Hash the provided token to compare against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the password reset record
    const [resetRecord] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          eq(passwordResets.used, false)
        )
      )
      .limit(1);

    if (!resetRecord) {
      throw new AuthError(
        'El enlace de restablecimiento no es válido o ha expirado.',
        'VALIDATION_FAILED',
        400
      );
    }

    // Check if token has expired
    if (new Date(resetRecord.expiresAt) < new Date()) {
      throw new AuthError(
        'El enlace de restablecimiento no es válido o ha expirado.',
        'VALIDATION_FAILED',
        400
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);

    // Update teacher's password
    await db
      .update(teachers)
      .set({ passwordHash })
      .where(eq(teachers.id, resetRecord.teacherId));

    // Mark token as used
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.id, resetRecord.id));
  },
};
