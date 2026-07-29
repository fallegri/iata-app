import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { InstitutionService, InstitutionError } from '../services/institution.service.js';
import { VALIDATION_RULES, ERROR_CODES, ErrorResponse } from '@iata-app/shared';
import type { ValidationResult } from '@iata-app/shared';

const router = Router();

// All institution routes require authentication
router.use(authMiddleware);

// ─── Admin role check middleware ─────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: () => void): void {
  if (req.teacher?.role !== 'admin') {
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.ACCESS_DENIED,
        message: 'No tiene permisos para realizar esta acción.',
      },
    };
    res.status(403).json(errorResponse);
    return;
  }
  next();
}

// ─── Validation functions ────────────────────────────────────────────────────

function validateCreateInstitutionBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.name || (typeof body.name === 'string' && body.name.trim() === '')) {
    errors.push({
      field: 'name',
      rule: 'required',
      message: 'El nombre de la institución es obligatorio.',
    });
  } else if (typeof body.name !== 'string') {
    errors.push({
      field: 'name',
      rule: 'type',
      message: 'El nombre de la institución debe ser una cadena de texto.',
    });
  } else if (body.name.length > VALIDATION_RULES.institution.name.maxLength) {
    errors.push({
      field: 'name',
      rule: 'maxLength',
      message: `El nombre de la institución no debe exceder ${VALIDATION_RULES.institution.name.maxLength} caracteres.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateInviteBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  // maxUses validation
  if (body.maxUses === undefined || body.maxUses === null) {
    errors.push({
      field: 'maxUses',
      rule: 'required',
      message: 'El número máximo de usos es obligatorio.',
    });
  } else if (typeof body.maxUses !== 'number' || !Number.isInteger(body.maxUses)) {
    errors.push({
      field: 'maxUses',
      rule: 'type',
      message: 'El número máximo de usos debe ser un entero.',
    });
  } else if (
    body.maxUses < VALIDATION_RULES.inviteCode.minMaxUses ||
    body.maxUses > VALIDATION_RULES.inviteCode.maxMaxUses
  ) {
    errors.push({
      field: 'maxUses',
      rule: 'range',
      message: `El número máximo de usos debe ser entre ${VALIDATION_RULES.inviteCode.minMaxUses} y ${VALIDATION_RULES.inviteCode.maxMaxUses}.`,
    });
  }

  // validityDays validation
  if (body.validityDays === undefined || body.validityDays === null) {
    errors.push({
      field: 'validityDays',
      rule: 'required',
      message: 'La validez en días es obligatoria.',
    });
  } else if (typeof body.validityDays !== 'number' || !Number.isInteger(body.validityDays)) {
    errors.push({
      field: 'validityDays',
      rule: 'type',
      message: 'La validez en días debe ser un entero.',
    });
  } else if (
    body.validityDays < VALIDATION_RULES.inviteCode.minValidityDays ||
    body.validityDays > VALIDATION_RULES.inviteCode.maxValidityDays
  ) {
    errors.push({
      field: 'validityDays',
      rule: 'range',
      message: `La validez debe ser entre ${VALIDATION_RULES.inviteCode.minValidityDays} y ${VALIDATION_RULES.inviteCode.maxValidityDays} días.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateJoinBody(data: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.code || (typeof body.code === 'string' && body.code.trim() === '')) {
    errors.push({
      field: 'code',
      rule: 'required',
      message: 'El código de invitación es obligatorio.',
    });
  } else if (typeof body.code !== 'string') {
    errors.push({
      field: 'code',
      rule: 'type',
      message: 'El código de invitación debe ser una cadena de texto.',
    });
  } else if (!VALIDATION_RULES.inviteCode.codePattern.test(body.code)) {
    errors.push({
      field: 'code',
      rule: 'format',
      message: 'El código de invitación debe ser de 8 caracteres alfanuméricos.',
    });
  }

  return { valid: errors.length === 0, errors };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/institutions
 * Creates a new institution and assigns the teacher as admin.
 * Body: { name }
 * Returns: { id, name, createdAt }
 */
router.post('/', validate(validateCreateInstitutionBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.teacher!.id;
    const { name } = req.body;

    const institution = await InstitutionService.create(teacherId, name);

    res.status(201).json(institution);
  } catch (error) {
    if (error instanceof InstitutionError) {
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
 * POST /api/institutions/invite
 * Generates an invite code for the admin's institution.
 * Body: { maxUses, validityDays }
 * Returns: { id, code, maxUses, currentUses, expiresAt, createdAt }
 * Requires: admin role
 */
router.post('/invite', requireAdmin, validate(validateInviteBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.teacher!.id;
    const { maxUses, validityDays } = req.body;

    const inviteCode = await InstitutionService.generateInviteCode(adminId, {
      maxUses,
      validityDays,
    });

    res.status(201).json(inviteCode);
  } catch (error) {
    if (error instanceof InstitutionError) {
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
 * POST /api/institutions/join
 * Joins an institution using an invite code.
 * Body: { code }
 * Returns: { id, teacherId, institutionId, role, joinedAt }
 */
router.post('/join', validate(validateJoinBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.teacher!.id;
    const { code } = req.body;

    const membership = await InstitutionService.joinWithCode(teacherId, code);

    res.status(200).json(membership);
  } catch (error) {
    if (error instanceof InstitutionError) {
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
 * GET /api/institutions/members
 * Lists members of the admin's institution.
 * Query: institutionId (optional — derives from token if not provided)
 * Returns: Array of { id, name, email, role, joinedAt }
 * Requires: admin role
 */
router.get('/members', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.teacher!.id;
    const institutionId = (req.query.institutionId as string) || req.teacher!.institutionId;

    if (!institutionId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'No se pudo determinar la institución. Proporcione el institutionId.',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const members = await InstitutionService.getMembers(adminId, institutionId);

    res.status(200).json(members);
  } catch (error) {
    if (error instanceof InstitutionError) {
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
 * DELETE /api/institutions/members/:id
 * Revokes a membership from the institution.
 * Requires: admin role
 * Returns: { message: "Membresía revocada exitosamente." }
 */
router.delete('/members/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.teacher!.id;
    const memberId = req.params.id;

    await InstitutionService.revokeMembership(adminId, memberId);

    res.status(200).json({ message: 'Membresía revocada exitosamente.' });
  } catch (error) {
    if (error instanceof InstitutionError) {
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

export default router;
