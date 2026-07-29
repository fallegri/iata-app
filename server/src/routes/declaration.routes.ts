import { Router, Request, Response } from 'express';
import { authMiddleware, requireMembership } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { DeclarationService, DeclarationError } from '../services/declaration.service.js';
import { validateDeclarationFields, ERROR_CODES } from '@iata-app/shared';
import type { ErrorResponse } from '@iata-app/shared';

const router = Router();

// ─── Public Routes (no auth required) ───────────────────────────────────────

/**
 * POST /api/declarations
 * Creates a new declaration for a course identified by courseCode.
 * Public endpoint — rate limited, no JWT required.
 * Body: { courseCode, studentIdNumber, studentName, studentGroup, career, subject, activityType, usedAi, aiTool?, learnings?, verificationMethod? }
 * Returns: created declaration (201)
 * Errors: 404 (course not found), 400 (validation)
 */
router.post(
  '/',
  rateLimiter(),
  validate((data: unknown) => {
    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'body', rule: 'required', message: 'El cuerpo de la solicitud es obligatorio.' }],
      };
    }

    const body = data as Record<string, unknown>;

    // courseCode is required separately from declaration field validation
    const errors: Array<{ field: string; rule: string; message: string }> = [];

    if (!body.courseCode || typeof body.courseCode !== 'string' || body.courseCode.trim() === '') {
      errors.push({
        field: 'courseCode',
        rule: 'required',
        message: 'El código del curso es obligatorio.',
      });
    }

    // Validate declaration fields
    const declarationResult = validateDeclarationFields(body);
    if (!declarationResult.valid) {
      errors.push(...declarationResult.errors);
    }

    return { valid: errors.length === 0, errors };
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        courseCode,
        studentIdNumber,
        studentName,
        studentGroup,
        career,
        subject,
        activityType,
        usedAi,
        aiTool,
        learnings,
        verificationMethod,
      } = req.body;

      const declaration = await DeclarationService.create(courseCode, {
        studentIdNumber,
        studentName,
        studentGroup,
        career,
        subject,
        activityType,
        usedAi,
        aiTool: aiTool ?? null,
        learnings: learnings ?? null,
        verificationMethod: verificationMethod ?? null,
      });

      res.status(201).json(declaration);
    } catch (error) {
      if (error instanceof DeclarationError) {
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
  }
);

// ─── Protected Routes (JWT required) ────────────────────────────────────────

/**
 * GET /api/declarations/export
 * Exports declarations as CSV for a specific course with optional search filter.
 * Query params: courseId (required), search (optional)
 * Returns: CSV file with Content-Type: text/csv
 * Note: This route must be defined BEFORE /:id to avoid path collision.
 */
router.get('/export', authMiddleware, requireMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const search = req.query.search as string | undefined;

    if (!courseId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'El parámetro courseId es obligatorio.',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const csv = await DeclarationService.exportCSV(req.teacher!.id, courseId, { search });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="declaraciones.csv"');
    res.status(200).send(csv);
  } catch (error) {
    if (error instanceof DeclarationError) {
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
 * GET /api/declarations
 * Lists declarations for a specific course with pagination and search.
 * Query params: courseId (required), page (optional, default 1), search (optional)
 * Also supports: ?studentQuery=... for findByStudent across all courses.
 * Returns: { data: declarations[], pagination: { page, pageSize, total, totalPages } }
 */
router.get('/', authMiddleware, requireMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const search = req.query.search as string | undefined;
    const studentQuery = req.query.studentQuery as string | undefined;

    // If studentQuery is provided, search across all courses
    if (studentQuery) {
      const results = await DeclarationService.findByStudent(req.teacher!.id, studentQuery);
      res.status(200).json({ data: results });
      return;
    }

    // courseId is required for course-scoped listing
    if (!courseId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'El parámetro courseId es obligatorio.',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const result = await DeclarationService.findByCourse(req.teacher!.id, courseId, {
      page: isNaN(page) ? 1 : page,
      search,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof DeclarationError) {
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
 * GET /api/declarations/:id
 * Returns a single declaration by ID.
 * Verifies the declaration belongs to a course owned by the authenticated teacher.
 * Returns: declaration object or 404
 */
router.get('/:id', authMiddleware, requireMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const declaration = await DeclarationService.getById(req.teacher!.id, req.params.id);

    if (!declaration) {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'No se encontró la declaración solicitada.',
        },
      };
      res.status(404).json(errorResponse);
      return;
    }

    res.status(200).json(declaration);
  } catch (error) {
    if (error instanceof DeclarationError) {
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
