import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES, ErrorResponse } from '@iata-app/shared';
import { ValidationResult } from '@iata-app/shared';

/**
 * Generic schema-based validation middleware.
 * Accepts a validation function that returns a ValidationResult.
 * Applies the function to req.body.
 * Returns 400 with VALIDATION_FAILED error code and field errors on failure.
 */
export function validate(
  validationFn: (data: unknown) => ValidationResult
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validationFn(req.body);

    if (!result.valid) {
      const errorResponse: ErrorResponse = {
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Los datos enviados contienen errores.',
          details: result.errors.map((e) => ({
            field: e.field,
            rule: e.rule,
            message: e.message,
          })),
        },
      };

      res.status(400).json(errorResponse);
      return;
    }

    next();
  };
}
