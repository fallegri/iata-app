import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { AuthService, AuthError } from '../services/auth.service.js';
import { validateEmail, validatePassword, ERROR_CODES, ErrorResponse } from '@iata-app/shared';
import type { ValidationResult } from '@iata-app/shared';

const router = Router();

// Apply rate limiter to all auth routes (public endpoints)
router.use(rateLimiter());

// ─── Validation functions for request bodies ─────────────────────────────────

function validateRegisterBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate email
  const emailResult = validateEmail(body.email);
  if (!emailResult.valid) {
    errors.push(...emailResult.errors);
  }

  // Validate password
  const passwordResult = validatePassword(body.password);
  if (!passwordResult.valid) {
    errors.push(...passwordResult.errors);
  }

  // Validate name
  if (!body.name || (typeof body.name === 'string' && body.name.trim() === '')) {
    errors.push({ field: 'name', rule: 'required', message: 'El nombre es obligatorio.' });
  } else if (typeof body.name !== 'string') {
    errors.push({ field: 'name', rule: 'type', message: 'El nombre debe ser una cadena de texto.' });
  } else if (body.name.length > 100) {
    errors.push({ field: 'name', rule: 'maxLength', message: 'El nombre no debe exceder 100 caracteres.' });
  }

  return { valid: errors.length === 0, errors };
}

function validateLoginBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.email || (typeof body.email === 'string' && body.email.trim() === '')) {
    errors.push({ field: 'email', rule: 'required', message: 'El correo electrónico es obligatorio.' });
  } else if (typeof body.email !== 'string') {
    errors.push({ field: 'email', rule: 'type', message: 'El correo electrónico debe ser una cadena de texto.' });
  }

  if (!body.password || (typeof body.password === 'string' && body.password.trim() === '')) {
    errors.push({ field: 'password', rule: 'required', message: 'La contraseña es obligatoria.' });
  } else if (typeof body.password !== 'string') {
    errors.push({ field: 'password', rule: 'type', message: 'La contraseña debe ser una cadena de texto.' });
  }

  return { valid: errors.length === 0, errors };
}

function validateForgotPasswordBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.email || (typeof body.email === 'string' && body.email.trim() === '')) {
    errors.push({ field: 'email', rule: 'required', message: 'El correo electrónico es obligatorio.' });
  } else if (typeof body.email !== 'string') {
    errors.push({ field: 'email', rule: 'type', message: 'El correo electrónico debe ser una cadena de texto.' });
  }

  return { valid: errors.length === 0, errors };
}

function validateResetPasswordBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.token || (typeof body.token === 'string' && body.token.trim() === '')) {
    errors.push({ field: 'token', rule: 'required', message: 'El token de restablecimiento es obligatorio.' });
  } else if (typeof body.token !== 'string') {
    errors.push({ field: 'token', rule: 'type', message: 'El token debe ser una cadena de texto.' });
  }

  // Validate new password using shared validation
  const passwordResult = validatePassword(body.newPassword);
  if (!passwordResult.valid) {
    errors.push(
      ...passwordResult.errors.map((e) => ({
        ...e,
        field: 'newPassword',
      }))
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new teacher account.
 * Body: { email, password, name }
 * Returns: { token, teacher: { id, email, name } }
 */
router.post('/register', validate(validateRegisterBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    const result = await AuthService.register(email, password, name);

    res.status(201).json({
      token: result.token,
      teacher: result.teacher,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const errorResponse: ErrorResponse = {
        error: {
          code: error.code as ErrorResponse['error']['code'],
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      };
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Unexpected error — don't reveal internals
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'El servicio no está disponible temporalmente. Intente de nuevo más tarde.',
      },
    };
    res.status(503).json(errorResponse);
  }
});

/**
 * POST /api/auth/login
 * Authenticates a teacher with email and password.
 * Body: { email, password }
 * Returns: { token, teacher: { id, email, name } }
 * Errors: 401 (invalid credentials — generic message), 403 (account locked)
 */
router.post('/login', validate(validateLoginBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    res.status(200).json({
      token: result.token,
      teacher: result.teacher,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const errorResponse: ErrorResponse = {
        error: {
          code: error.code as ErrorResponse['error']['code'],
          message: error.message,
        },
      };
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'El servicio no está disponible temporalmente. Intente de nuevo más tarde.',
      },
    };
    res.status(503).json(errorResponse);
  }
});

/**
 * POST /api/auth/forgot-password
 * Requests a password reset. Always returns 200 (doesn't reveal if email exists).
 * Body: { email }
 * Returns: { message: "..." }
 */
router.post('/forgot-password', validate(validateForgotPasswordBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Always returns success regardless of whether the email exists
    await AuthService.requestPasswordReset(email);

    res.status(200).json({
      message: 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.',
    });
  } catch {
    // Even on internal errors, return a generic success to avoid leaking info
    res.status(200).json({
      message: 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Resets a password using a valid reset token.
 * Body: { token, newPassword }
 * Returns: { message: "Contraseña actualizada exitosamente." }
 * Errors: 400 (invalid/expired token)
 */
router.post('/reset-password', validate(validateResetPasswordBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);

    res.status(200).json({
      message: 'Contraseña actualizada exitosamente.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const errorResponse: ErrorResponse = {
        error: {
          code: error.code as ErrorResponse['error']['code'],
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      };
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'El servicio no está disponible temporalmente. Intente de nuevo más tarde.',
      },
    };
    res.status(503).json(errorResponse);
  }
});

export default router;
