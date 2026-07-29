/**
 * Shared validation rules and functions for the IATA platform.
 * Used by both frontend and backend to ensure consistent validation.
 */
export declare const VALIDATION_RULES: {
    readonly email: {
        readonly maxLength: 254;
        readonly pattern: RegExp;
    };
    readonly password: {
        readonly minLength: 8;
        readonly requireUppercase: true;
        readonly requireLowercase: true;
        readonly requireNumber: true;
        readonly uppercasePattern: RegExp;
        readonly lowercasePattern: RegExp;
        readonly numberPattern: RegExp;
    };
    readonly course: {
        readonly name: {
            readonly maxLength: 150;
            readonly required: true;
        };
        readonly teacherName: {
            readonly maxLength: 100;
            readonly required: true;
        };
        readonly teacherEmail: {
            readonly maxLength: 254;
            readonly required: true;
        };
        readonly codeLength: 6;
        readonly codePattern: RegExp;
        readonly expectedStudents: {
            readonly min: 0;
        };
    };
    readonly declaration: {
        readonly studentIdNumber: {
            readonly maxLength: 20;
            readonly required: true;
            readonly pattern: RegExp;
        };
        readonly studentName: {
            readonly maxLength: 100;
            readonly required: true;
        };
        readonly studentGroup: {
            readonly maxLength: 20;
            readonly required: true;
        };
        readonly career: {
            readonly maxLength: 100;
            readonly required: true;
        };
        readonly subject: {
            readonly maxLength: 100;
            readonly required: true;
        };
        readonly activityType: {
            readonly required: true;
            readonly allowedValues: readonly ["tarea", "proyecto"];
        };
        readonly aiTool: {
            readonly maxLength: 100;
        };
        readonly learnings: {
            readonly maxLength: 2000;
        };
        readonly verificationMethod: {
            readonly maxLength: 1000;
        };
    };
    readonly institution: {
        readonly name: {
            readonly maxLength: 200;
            readonly required: true;
        };
    };
    readonly inviteCode: {
        readonly codeLength: 8;
        readonly codePattern: RegExp;
        readonly minValidityDays: 1;
        readonly maxValidityDays: 30;
        readonly minMaxUses: 1;
        readonly maxMaxUses: 100;
    };
    readonly ai: {
        readonly apiKeyMaxLength: 256;
        readonly queryMaxLength: 2000;
    };
};
export interface ValidationError {
    field: string;
    rule: string;
    message: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}
/**
 * Validates an email address against RFC 5322 format and max length.
 */
export declare function validateEmail(email: unknown): ValidationResult;
/**
 * Validates a password against minimum length and complexity rules.
 */
export declare function validatePassword(password: unknown): ValidationResult;
/**
 * Validates course creation/update fields.
 */
export interface CourseFieldsInput {
    name?: unknown;
    teacherName?: unknown;
    teacherEmail?: unknown;
    expectedStudents?: unknown;
}
export declare function validateCourseFields(data: CourseFieldsInput): ValidationResult;
/**
 * Validates student declaration submission fields.
 */
export interface DeclarationFieldsInput {
    studentIdNumber?: unknown;
    studentName?: unknown;
    studentGroup?: unknown;
    career?: unknown;
    subject?: unknown;
    activityType?: unknown;
    usedAi?: unknown;
    aiTool?: unknown;
    learnings?: unknown;
    verificationMethod?: unknown;
}
export declare function validateDeclarationFields(data: DeclarationFieldsInput): ValidationResult;
