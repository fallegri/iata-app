import { Router, Request, Response } from 'express';
import { authMiddleware, requireMembership } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { CourseService, CourseError } from '../services/course.service.js';
import { validateCourseFields, validateEmail, ERROR_CODES } from '@iata-app/shared';
import type { ErrorResponse, ValidationResult } from '@iata-app/shared';

const router = Router();

// ─── Validation functions ────────────────────────────────────────────────────

/**
 * Validates EmailJS config fields if provided.
 * serviceId, templateId, and publicKey are all required when emailjsConfig is present.
 */
function validateEmailJSConfig(config: unknown): ValidationResult {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  if (config === null || config === undefined) {
    return { valid: true, errors: [] };
  }

  if (typeof config !== 'object') {
    errors.push({
      field: 'emailjsConfig',
      rule: 'type',
      message: 'La configuración de EmailJS debe ser un objeto.',
    });
    return { valid: false, errors };
  }

  const obj = config as Record<string, unknown>;

  if (!obj.serviceId || typeof obj.serviceId !== 'string' || obj.serviceId.trim() === '') {
    errors.push({
      field: 'emailjsConfig.serviceId',
      rule: 'required',
      message: 'El ID del servicio EmailJS es obligatorio.',
    });
  }

  if (!obj.templateId || typeof obj.templateId !== 'string' || obj.templateId.trim() === '') {
    errors.push({
      field: 'emailjsConfig.templateId',
      rule: 'required',
      message: 'El ID de la plantilla EmailJS es obligatorio.',
    });
  }

  if (!obj.publicKey || typeof obj.publicKey !== 'string' || obj.publicKey.trim() === '') {
    errors.push({
      field: 'emailjsConfig.publicKey',
      rule: 'required',
      message: 'La clave pública de EmailJS es obligatoria.',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates course creation body: required course fields + optional EmailJS config.
 */
function validateCreateCourseBody(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate core course fields
  const courseResult = validateCourseFields(body);
  const errors = [...courseResult.errors];

  // Validate EmailJS config if provided
  if (body.emailjsConfig !== undefined) {
    const emailjsResult = validateEmailJSConfig(body.emailjsConfig);
    if (!emailjsResult.valid) {
      errors.push(...emailjsResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates course update body: optional course fields + optional EmailJS config.
 * At least one field should be present for an update to make sense,
 * but we allow empty updates (no-op) gracefully.
 */
function validateUpdateCourseBody(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
    };
  }

  const body = data as Record<string, unknown>;
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  // For updates, fields are optional — only validate if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push({ field: 'name', rule: 'required', message: 'El nombre del curso no puede estar vacío.' });
    } else if (body.name.length > 150) {
      errors.push({ field: 'name', rule: 'maxLength', message: 'El nombre del curso no debe exceder 150 caracteres.' });
    }
  }

  if (body.teacherName !== undefined) {
    if (typeof body.teacherName !== 'string' || body.teacherName.trim() === '') {
      errors.push({ field: 'teacherName', rule: 'required', message: 'El nombre del docente no puede estar vacío.' });
    } else if (body.teacherName.length > 100) {
      errors.push({ field: 'teacherName', rule: 'maxLength', message: 'El nombre del docente no debe exceder 100 caracteres.' });
    }
  }

  if (body.teacherEmail !== undefined) {
    if (typeof body.teacherEmail !== 'string' || body.teacherEmail.trim() === '') {
      errors.push({ field: 'teacherEmail', rule: 'required', message: 'El correo del docente no puede estar vacío.' });
    } else {
      const emailResult = validateEmail(body.teacherEmail);
      if (!emailResult.valid) {
        errors.push(...emailResult.errors.map((e) => ({ ...e, field: 'teacherEmail' })));
      }
    }
  }

  if (body.expectedStudents !== undefined && body.expectedStudents !== null) {
    if (typeof body.expectedStudents !== 'number' || !Number.isInteger(body.expectedStudents)) {
      errors.push({ field: 'expectedStudents', rule: 'type', message: 'El número esperado de estudiantes debe ser un entero.' });
    } else if (body.expectedStudents < 0) {
      errors.push({ field: 'expectedStudents', rule: 'min', message: 'El número esperado de estudiantes no puede ser negativo.' });
    }
  }

  // Validate EmailJS config if provided
  if (body.emailjsConfig !== undefined) {
    const emailjsResult = validateEmailJSConfig(body.emailjsConfig);
    if (!emailjsResult.valid) {
      errors.push(...emailjsResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Public Routes (no auth required) ───────────────────────────────────────

/**
 * GET /api/courses/public/:code
 * Returns public course info for student access. Rate limited.
 * No authentication required.
 */
router.get('/public/:code', rateLimiter(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const course = await CourseService.findByCode(code);

    if (!course) {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'No se encontró un curso con ese código.',
        },
      };
      res.status(404).json(errorResponse);
      return;
    }

    res.status(200).json(course);
  } catch (error) {
    if (error instanceof CourseError) {
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

// ─── Protected Routes (JWT required) ────────────────────────────────────────

/**
 * GET /api/courses
 * Returns all courses owned by the authenticated teacher.
 */
router.get('/', authMiddleware, requireMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const courses = await CourseService.findByTeacher(req.teacher!.id);
    res.status(200).json(courses);
  } catch (error) {
    if (error instanceof CourseError) {
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
 * POST /api/courses
 * Creates a new course for the authenticated teacher.
 * Body: { name, teacherName, teacherEmail, expectedStudents?, emailjsConfig? }
 * Returns: created course with code and shareable link (201)
 */
router.post('/', authMiddleware, requireMembership, validate(validateCreateCourseBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, teacherName, teacherEmail, expectedStudents, emailjsConfig } = req.body;

    const course = await CourseService.create(
      req.teacher!.id,
      req.teacher!.institutionId ?? '',
      { name, teacherName, teacherEmail, expectedStudents, emailjsConfig }
    );

    // Build shareable link
    const shareableLink = `/declare/${course.code}`;

    res.status(201).json({
      ...course,
      shareableLink,
    });
  } catch (error) {
    if (error instanceof CourseError) {
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
 * PUT /api/courses/:id
 * Updates an existing course. Only the owner can update.
 * Body: { name?, teacherName?, teacherEmail?, expectedStudents?, emailjsConfig? }
 * Returns: updated course
 */
router.put('/:id', authMiddleware, requireMembership, validate(validateUpdateCourseBody), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, teacherName, teacherEmail, expectedStudents, emailjsConfig } = req.body;

    const updated = await CourseService.update(
      req.teacher!.id,
      req.params.id,
      { name, teacherName, teacherEmail, expectedStudents, emailjsConfig }
    );

    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof CourseError) {
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
 * DELETE /api/courses/:id
 * Deletes a course. Only the owner can delete.
 * Cascade deletes all associated declarations.
 * Returns: { message: "Curso eliminado exitosamente." }
 */
router.delete('/:id', authMiddleware, requireMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    await CourseService.delete(req.teacher!.id, req.params.id);

    res.status(200).json({ message: 'Curso eliminado exitosamente.' });
  } catch (error) {
    if (error instanceof CourseError) {
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
