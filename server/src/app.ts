import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import institutionRoutes from './routes/institution.routes.js';
import declarationRoutes from './routes/declaration.routes.js';
import aiRoutes from './routes/ai.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { ERROR_CODES } from '@iata-app/shared';
import type { ErrorResponse } from '@iata-app/shared';

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Route Registration ─────────────────────────────────────────────────────
// Auth routes (public — rate limited internally)
app.use('/api/auth', authRoutes);

// Course routes (mix of public and protected endpoints)
app.use('/api/courses', courseRoutes);

// Institution routes (JWT required)
app.use('/api/institutions', institutionRoutes);

// Declaration routes (mix of public and protected endpoints)
app.use('/api/declarations', declarationRoutes);

// AI routes (JWT required)
app.use('/api/ai', aiRoutes);

// Dashboard routes (JWT required)
app.use('/api/dashboard', dashboardRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
// Catches any unhandled errors from route handlers and middleware.
// Returns 503 for infrastructure/connection errors, 500 for unexpected errors.
// NEVER reveals internal details (stack traces, table names, IPs, etc.)
// to the client.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  // Log internally for debugging (never sent to client)
  console.error('[GlobalErrorHandler]', err.message);

  // Determine if this is a DB/infrastructure error
  const isInfraError =
    err.message?.toLowerCase().includes('econnrefused') ||
    err.message?.toLowerCase().includes('timeout') ||
    err.message?.toLowerCase().includes('database') ||
    err.message?.toLowerCase().includes('connect');

  const statusCode = isInfraError ? 503 : 500;
  const errorCode = isInfraError ? ERROR_CODES.SERVICE_UNAVAILABLE : ERROR_CODES.SERVICE_UNAVAILABLE;
  const message = isInfraError
    ? 'El servicio no está disponible temporalmente. Intente de nuevo más tarde.'
    : 'Ha ocurrido un error interno. Intente de nuevo más tarde.';

  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
    },
  };

  res.status(statusCode).json(errorResponse);
});

export default app;
