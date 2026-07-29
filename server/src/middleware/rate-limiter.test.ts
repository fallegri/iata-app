import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { rateLimiter, clearRateLimiterStore } from './rate-limiter.js';
import { ERROR_CODES } from '@iata-app/shared';

function createMockReq(ip: string = '127.0.0.1'): Partial<Request> {
  return {
    ip,
    socket: { remoteAddress: ip } as never,
  };
}

function createMockRes(): Partial<Response> & { statusCode?: number; body?: unknown; headers: Record<string, string> } {
  const res: Partial<Response> & { statusCode?: number; body?: unknown; headers: Record<string, string> } = {
    headers: {},
  };
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: unknown) => {
    res.body = data;
    return res;
  });
  res.set = vi.fn().mockImplementation((key: string, value: string) => {
    res.headers[key] = value;
    return res;
  });
  return res;
}

describe('rateLimiter', () => {
  beforeEach(() => {
    clearRateLimiterStore();
  });

  it('should allow requests within the limit', () => {
    const middleware = rateLimiter({ maxRequests: 5, windowMs: 60000 });

    for (let i = 0; i < 5; i++) {
      const req = createMockReq('192.168.1.1');
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    }
  });

  it('should return 429 when limit is exceeded', () => {
    const middleware = rateLimiter({ maxRequests: 3, windowMs: 60000 });

    // Make 3 allowed requests
    for (let i = 0; i < 3; i++) {
      const req = createMockReq('10.0.0.1');
      const res = createMockRes();
      const next = vi.fn();
      middleware(req as Request, res as Response, next as NextFunction);
    }

    // 4th request should be blocked
    const req = createMockReq('10.0.0.1');
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(429);
    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      error: { code: ERROR_CODES.RATE_LIMITED },
    });
  });

  it('should include Retry-After header when limit is exceeded', () => {
    const middleware = rateLimiter({ maxRequests: 1, windowMs: 60000 });

    // First request OK
    const req1 = createMockReq('10.0.0.2');
    const res1 = createMockRes();
    middleware(req1 as Request, res1 as Response, vi.fn() as NextFunction);

    // Second request blocked
    const req2 = createMockReq('10.0.0.2');
    const res2 = createMockRes();
    middleware(req2 as Request, res2 as Response, vi.fn() as NextFunction);

    expect(res2.statusCode).toBe(429);
    expect(res2.headers['Retry-After']).toBeDefined();
    const retryAfter = parseInt(res2.headers['Retry-After'], 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('should track limits per IP independently', () => {
    const middleware = rateLimiter({ maxRequests: 2, windowMs: 60000 });

    // IP A: 2 requests
    for (let i = 0; i < 2; i++) {
      const req = createMockReq('10.0.0.10');
      const res = createMockRes();
      middleware(req as Request, res as Response, vi.fn() as NextFunction);
    }

    // IP B: should still be allowed
    const reqB = createMockReq('10.0.0.20');
    const resB = createMockRes();
    const nextB = vi.fn();
    middleware(reqB as Request, resB as Response, nextB as NextFunction);

    expect(nextB).toHaveBeenCalled();
  });

  it('should use default config of 60 requests per minute', () => {
    const middleware = rateLimiter();

    // Make 60 requests — all should pass
    for (let i = 0; i < 60; i++) {
      const req = createMockReq('172.16.0.1');
      const res = createMockRes();
      const next = vi.fn();
      middleware(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    }

    // 61st should be blocked
    const req = createMockReq('172.16.0.1');
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(429);
    expect(next).not.toHaveBeenCalled();
  });
});
