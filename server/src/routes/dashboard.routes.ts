import { Router, Request, Response } from 'express';
import { authMiddleware, requireMembership } from '../middleware/auth.middleware.js';
import { DashboardService } from '../services/dashboard.service.js';
import { ERROR_CODES } from '@iata-app/shared';
import type { ErrorResponse } from '@iata-app/shared';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the authenticated teacher.
 * Accepts optional `courseId` query param to filter stats for a specific course.
 * JWT required.
 * Returns: stats object with totalDeclarations, usedAI, notUsedAI, topTools[], declarationsPerCourse[], progressByCourse[]
 * Empty state: returns zeroed stats when teacher has no courses or declarations.
 */
router.get('/stats', authMiddleware, requireMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.query.courseId as string | undefined;

    const stats = await DashboardService.getStats(req.teacher!.id, courseId);

    res.status(200).json(stats);
  } catch (error) {
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
