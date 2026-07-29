import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '@iata-app/shared';
import { ERROR_CODES, ErrorResponse } from '@iata-app/shared';
import { findActiveMembership } from './membership-lookup.js';

// Extend Express Request to include teacher payload
declare global {
  namespace Express {
    interface Request {
      teacher?: AuthPayload;
    }
  }
}

/**
 * Auth middleware — extracts JWT from Authorization header (Bearer <token>),
 * verifies it, and attaches the teacher payload to req.teacher.
 * After JWT verification, queries institution_memberships to determine
 * the teacher's current active membership and enriches the payload.
 * Returns 401 with AUTH_REQUIRED if token is missing, invalid, or expired.
 * Does NOT reveal internal system details in error messages.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Se requiere autenticación para acceder a este recurso.',
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (!token) {
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Se requiere autenticación para acceder a este recurso.',
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Log internally but don't expose to client
    console.error('JWT_SECRET environment variable is not configured.');
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Se requiere autenticación para acceder a este recurso.',
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;

    // Query active membership from the database
    findActiveMembership(payload.id)
      .then((membership) => {
        if (membership) {
          req.teacher = {
            id: payload.id,
            email: payload.email,
            institutionId: membership.institutionId,
            role: membership.role as 'admin' | 'member',
          };
        } else {
          // No active membership — allow access but with null institution/role
          req.teacher = {
            id: payload.id,
            email: payload.email,
            institutionId: null,
            role: null,
          };
        }
        next();
      })
      .catch(() => {
        // DB error during membership lookup — fall back to JWT payload values
        req.teacher = {
          id: payload.id,
          email: payload.email,
          institutionId: payload.institutionId,
          role: payload.role,
        };
        next();
      });
  } catch {
    // Don't reveal whether token was expired, malformed, or had wrong signature
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Se requiere autenticación para acceder a este recurso.',
      },
    };
    res.status(401).json(errorResponse);
  }
}

/**
 * Middleware that requires the authenticated teacher to have an active
 * institution membership. Apply this AFTER authMiddleware on routes that
 * need institution-scoped access (courses, declarations, dashboard, AI).
 *
 * If the teacher has no active membership (institutionId is null),
 * returns 403 with ACCESS_DENIED.
 *
 * Routes like auth, institution create/join should NOT use this middleware,
 * as teachers need to access them to establish a membership.
 */
export function requireMembership(req: Request, res: Response, next: NextFunction): void {
  if (!req.teacher || !req.teacher.institutionId) {
    const errorResponse: ErrorResponse = {
      error: {
        code: ERROR_CODES.ACCESS_DENIED,
        message: 'Debe pertenecer a una institución para acceder a este recurso. Cree o únase a una institución.',
      },
    };
    res.status(403).json(errorResponse);
    return;
  }
  next();
}
