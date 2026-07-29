import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module before importing CourseService
vi.mock('../db/connection.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockSet = vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) }));
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  const mockFrom = vi.fn();

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: mockLimit,
            orderBy: mockOrderBy,
          })),
          orderBy: mockOrderBy,
        })),
      })),
      insert: vi.fn(() => ({
        values: mockValues,
      })),
      update: vi.fn(() => ({
        set: mockSet,
      })),
      delete: vi.fn(() => ({
        where: vi.fn(),
      })),
    },
  };
});

vi.mock('../models/schema.js', () => ({
  courses: {
    id: 'id',
    code: 'code',
    name: 'name',
    teacherName: 'teacher_name',
    teacherEmail: 'teacher_email',
    ownerId: 'owner_id',
    institutionId: 'institution_id',
    expectedStudents: 'expected_students',
    emailjsConfig: 'emailjs_config',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

import { CourseService, CourseError } from './course.service.js';
import { db } from '../db/connection.js';

describe('CourseService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CourseError', () => {
    it('should create an error with code and status', () => {
      const error = new CourseError('test message', 'ACCESS_DENIED', 403);
      expect(error.message).toBe('test message');
      expect(error.code).toBe('ACCESS_DENIED');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('CourseError');
    });

    it('should default to 400 status code', () => {
      const error = new CourseError('test', 'NOT_FOUND');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('generateUniqueCode', () => {
    it('should generate a code of exactly 6 characters', async () => {
      // Mock DB to always return no collision
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      const code = await CourseService.generateUniqueCode();

      expect(code).toHaveLength(6);
    });

    it('should only contain allowed characters (no ambiguous chars)', async () => {
      const allowedChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      const code = await CourseService.generateUniqueCode();

      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    });

    it('should retry on collision and succeed', async () => {
      // First call returns a collision, second call returns no collision
      const mockLimit = vi.fn()
        .mockResolvedValueOnce([{ id: 'existing-id' }])
        .mockResolvedValueOnce([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      const code = await CourseService.generateUniqueCode();

      expect(code).toHaveLength(6);
      expect(mockLimit).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries if all codes collide', async () => {
      // All calls return a collision
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'existing-id' }]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      await expect(CourseService.generateUniqueCode()).rejects.toThrow(CourseError);
      await expect(CourseService.generateUniqueCode()).rejects.toThrow(
        'No se pudo generar un código único para el curso.'
      );
    });
  });

  describe('update - ownership enforcement', () => {
    it('should throw ACCESS_DENIED when teacher is not the owner', async () => {
      const mockLimit = vi.fn().mockResolvedValue([{ ownerId: 'other-teacher-id' }]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      await expect(
        CourseService.update('my-teacher-id', 'course-id', { name: 'New Name' })
      ).rejects.toThrow(CourseError);

      try {
        await CourseService.update('my-teacher-id', 'course-id', { name: 'New Name' });
      } catch (e) {
        expect((e as CourseError).code).toBe('ACCESS_DENIED');
        expect((e as CourseError).statusCode).toBe(403);
      }
    });

    it('should throw ACCESS_DENIED when course does not exist', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      await expect(
        CourseService.update('my-teacher-id', 'non-existent-id', { name: 'New Name' })
      ).rejects.toThrow(CourseError);

      try {
        await CourseService.update('my-teacher-id', 'non-existent-id', { name: 'New Name' });
      } catch (e) {
        expect((e as CourseError).code).toBe('ACCESS_DENIED');
        expect((e as CourseError).statusCode).toBe(403);
      }
    });
  });

  describe('delete - ownership enforcement', () => {
    it('should throw ACCESS_DENIED when teacher is not the owner', async () => {
      const mockLimit = vi.fn().mockResolvedValue([{ ownerId: 'other-teacher-id' }]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      await expect(
        CourseService.delete('my-teacher-id', 'course-id')
      ).rejects.toThrow(CourseError);

      try {
        await CourseService.delete('my-teacher-id', 'course-id');
      } catch (e) {
        expect((e as CourseError).code).toBe('ACCESS_DENIED');
        expect((e as CourseError).statusCode).toBe(403);
      }
    });

    it('should throw ACCESS_DENIED when course does not exist', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      await expect(
        CourseService.delete('my-teacher-id', 'non-existent-id')
      ).rejects.toThrow(CourseError);

      try {
        await CourseService.delete('my-teacher-id', 'non-existent-id');
      } catch (e) {
        expect((e as CourseError).code).toBe('ACCESS_DENIED');
        expect((e as CourseError).statusCode).toBe(403);
      }
    });
  });

  describe('findByCode', () => {
    it('should return null when course code does not exist', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      const result = await CourseService.findByCode('ABCDEF');
      expect(result).toBeNull();
    });

    it('should return public course info when code exists', async () => {
      const publicInfo = {
        code: 'ABC123',
        name: 'Test Course',
        teacherName: 'Dr. Smith',
        teacherEmail: 'smith@example.com',
      };
      const mockLimit = vi.fn().mockResolvedValue([publicInfo]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

      const result = await CourseService.findByCode('abc123');
      expect(result).toEqual(publicInfo);
    });
  });
});
