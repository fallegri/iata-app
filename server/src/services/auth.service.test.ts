import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock the database module before importing AuthService
vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../models/schema.js', () => ({
  teachers: { id: 'id', email: 'email', name: 'name', passwordHash: 'password_hash', failedLoginAttempts: 'failed_login_attempts', lockedUntil: 'locked_until' },
  passwordResets: { id: 'id', teacherId: 'teacher_id', tokenHash: 'token_hash', expiresAt: 'expires_at', used: 'used' },
  institutionMemberships: { teacherId: 'teacher_id', institutionId: 'institution_id', role: 'role' },
}));

import { AuthService, AuthError } from './auth.service.js';

const TEST_JWT_SECRET = 'test-jwt-secret-for-unit-tests';

describe('AuthService', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', TEST_JWT_SECRET);
    vi.stubEnv('JWT_EXPIRATION_HOURS', '24');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return the payload', () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        institutionId: 'inst-123',
        role: 'admin' as const,
      };

      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
      const result = AuthService.verifyToken(token);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(payload.id);
      expect(result!.email).toBe(payload.email);
      expect(result!.institutionId).toBe(payload.institutionId);
      expect(result!.role).toBe(payload.role);
    });

    it('should return null for an expired token', () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        institutionId: null,
        role: null,
      };

      // Create a token that expired 1 hour ago
      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '-1h' });
      const result = AuthService.verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null for a token signed with wrong secret', () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        institutionId: null,
        role: null,
      };

      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '24h' });
      const result = AuthService.verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null for a malformed token', () => {
      const result = AuthService.verifyToken('not-a-valid-jwt');
      expect(result).toBeNull();
    });

    it('should return null for an empty string', () => {
      const result = AuthService.verifyToken('');
      expect(result).toBeNull();
    });

    it('should respect custom JWT_EXPIRATION_HOURS within valid range', () => {
      vi.stubEnv('JWT_EXPIRATION_HOURS', '2');

      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        institutionId: null,
        role: null,
      };

      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '2h' });
      const result = AuthService.verifyToken(token);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(payload.id);
    });

    it('should handle token with null institutionId and role', () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        institutionId: null,
        role: null,
      };

      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
      const result = AuthService.verifyToken(token);

      expect(result).not.toBeNull();
      expect(result!.institutionId).toBeNull();
      expect(result!.role).toBeNull();
    });
  });

  describe('AuthError', () => {
    it('should create an error with code and status', () => {
      const error = new AuthError('test message', 'VALIDATION_FAILED', 400);
      expect(error.message).toBe('test message');
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AuthError');
    });

    it('should include validation details when provided', () => {
      const details = [
        { field: 'email', rule: 'format', message: 'Invalid email' },
      ];
      const error = new AuthError('validation error', 'VALIDATION_FAILED', 400, details);
      expect(error.details).toEqual(details);
    });

    it('should default to 400 status code', () => {
      const error = new AuthError('test', 'VALIDATION_FAILED');
      expect(error.statusCode).toBe(400);
    });
  });
});
