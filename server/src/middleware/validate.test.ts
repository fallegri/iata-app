import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validate } from './validate.js';
import { ERROR_CODES, validateDeclarationFields } from '@iata-app/shared';
import { ValidationResult } from '@iata-app/shared';

function createMockReq(body: unknown = {}): Partial<Request> {
  return { body };
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

describe('validate middleware', () => {
  it('should call next when validation passes', () => {
    const alwaysValid = (): ValidationResult => ({ valid: true, errors: [] });
    const middleware = validate(alwaysValid);

    const req = createMockReq({ name: 'test' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeUndefined();
  });

  it('should return 400 with VALIDATION_FAILED when validation fails', () => {
    const alwaysFails = (): ValidationResult => ({
      valid: false,
      errors: [
        { field: 'email', rule: 'format', message: 'Invalid email format.' },
      ],
    });
    const middleware = validate(alwaysFails);

    const req = createMockReq({ email: 'bad' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Los datos enviados contienen errores.',
        details: [
          { field: 'email', rule: 'format', message: 'Invalid email format.' },
        ],
      },
    });
  });

  it('should return all field errors when multiple fields fail', () => {
    const multipleErrors = (): ValidationResult => ({
      valid: false,
      errors: [
        { field: 'email', rule: 'required', message: 'Email is required.' },
        { field: 'password', rule: 'minLength', message: 'Password too short.' },
      ],
    });
    const middleware = validate(multipleErrors);

    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    middleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: { details: unknown[] } };
    expect(body.error.details).toHaveLength(2);
  });

  it('should pass req.body to the validation function', () => {
    const spy = vi.fn().mockReturnValue({ valid: true, errors: [] });
    const middleware = validate(spy);

    const body = { name: 'test', age: 25 };
    const req = createMockReq(body);
    const res = createMockRes();
    const next = vi.fn();

    middleware(req as Request, res as Response, next as NextFunction);

    expect(spy).toHaveBeenCalledWith(body);
  });

  it('should work with shared validation functions like validateDeclarationFields', () => {
    const middleware = validate(validateDeclarationFields);

    // Empty body should fail validation
    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    middleware(req as Request, res as Response, next as NextFunction);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: { code: ERROR_CODES.VALIDATION_FAILED },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
