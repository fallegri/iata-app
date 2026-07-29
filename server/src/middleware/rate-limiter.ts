import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES, ErrorResponse } from '@iata-app/shared';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter store.
 * Maps IP address → { count, resetTime }.
 */
const store = new Map<string, RateLimitEntry>();

/** Default: 60 requests per minute per IP */
const DEFAULT_MAX_REQUESTS = 60;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

export interface RateLimiterConfig {
  maxRequests?: number;
  windowMs?: number;
}

/**
 * Creates a rate limiter middleware.
 * Limits requests per IP within a sliding window.
 * Returns 429 with Retry-After header when limit is exceeded.
 */
export function rateLimiter(config: RateLimiterConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    // If no entry or window has expired, reset
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(ip, entry);
      next();
      return;
    }

    // Increment count within the window
    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);

      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Demasiadas solicitudes. Por favor, intente de nuevo más tarde.',
        },
      };

      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json(errorResponse);
      return;
    }

    next();
  };
}

/**
 * Clears the rate limiter store. Useful for testing.
 */
export function clearRateLimiterStore(): void {
  store.clear();
}
