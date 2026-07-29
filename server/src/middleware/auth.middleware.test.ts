import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@iata-app/shared';

// Mock the membership lookup module
let mockMembershipResult: Promise<{ institutionId: string; role: string } | null> = Promise.resolve(null);

vi.mock('./membership-lookup.js', () => ({
  findActiveMembership: () => mockMembershipResult,
}));

// Import after mocking
import { authMiddleware, requireMembership } from './auth.middleware.js';

function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers };
}

function createMockRes(): Partial<Response> & { statusCode?: number; body?: unknown } {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: unknown) => {
    res.body = data;
    return res;
  });
  return res;
}

describe('authMiddleware', () => {
  const JWT_SECRET = 'test-secret-key-for-middleware';
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.JWT_SECRET;
    process.env.JWT_SECRET = JWT_SECRET;
    // Default: no active membership
    mockMembershipResult = Promise.resolve(null);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  it('should return 401 when no Authorization header is present', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      error: { code: ERROR_CODES.AUTH_REQUIRED },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const req = createMockReq({ authorization: 'Basic abc123' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      error: { code: ERROR_CODES.AUTH_REQUIRED },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is empty after Bearer', () => {
    const req = createMockReq({ authorization: 'Bearer ' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token.here' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      error: { code: ERROR_CODES.AUTH_REQUIRED },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', () => {
    const payload = { id: 'teacher-1', email: 'test@example.com', institutionId: 'inst-1', role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ id: '1', email: 'a@b.com', institutionId: null, role: null }, 'any-secret');
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and attach teacher payload with null institution when no membership found', async () => {
    // mockMembershipResult already returns null by default
    const payload = { id: 'teacher-123', email: 'prof@uni.edu', institutionId: 'inst-99', role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    // The middleware does an async DB query, wait for it to resolve
    await vi.waitFor(() => {
      expect(next).toHaveBeenCalled();
    });

    // With no membership found, teacher gets null institution/role
    expect((req as Request).teacher).toEqual({
      id: 'teacher-123',
      email: 'prof@uni.edu',
      institutionId: null,
      role: null,
    });
  });

  it('should attach membership data when DB returns an active membership', async () => {
    mockMembershipResult = Promise.resolve({ institutionId: 'inst-55', role: 'member' });

    const payload = { id: 'teacher-456', email: 'new@uni.edu', institutionId: null, role: null };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalled();
    });

    expect((req as Request).teacher).toEqual({
      id: 'teacher-456',
      email: 'new@uni.edu',
      institutionId: 'inst-55',
      role: 'member',
    });
  });

  it('should fall back to JWT payload when DB query fails', async () => {
    mockMembershipResult = Promise.reject(new Error('DB connection failed'));

    const payload = { id: 'teacher-789', email: 'fallback@uni.edu', institutionId: 'inst-10', role: 'admin' as const };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalled();
    });

    expect((req as Request).teacher).toEqual({
      id: 'teacher-789',
      email: 'fallback@uni.edu',
      institutionId: 'inst-10',
      role: 'admin',
    });
  });

  it('should not reveal internal details in error messages', () => {
    const req = createMockReq({ authorization: 'Bearer totally-wrong' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req as Request, res as Response, next as NextFunction);

    const body = res.body as { error: { message: string } };
    expect(body.error.message).not.toContain('jwt');
    expect(body.error.message).not.toContain('secret');
    expect(body.error.message).not.toContain('expired');
    expect(body.error.message).not.toContain('malformed');
  });
});

describe('requireMembership', () => {
  it('should return 403 when teacher has no institutionId', () => {
    const req = { teacher: { id: 'teacher-1', email: 'a@b.com', institutionId: null, role: null } } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn();

    requireMembership(req, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      error: { code: ERROR_CODES.ACCESS_DENIED },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when teacher is not set on request', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn();

    requireMembership(req, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when teacher has an active membership', () => {
    const req = { teacher: { id: 'teacher-1', email: 'a@b.com', institutionId: 'inst-1', role: 'admin' } } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn();

    requireMembership(req, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeUndefined();
  });
});
