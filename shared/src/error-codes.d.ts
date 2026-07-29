/**
 * Standardized error codes for the IATA platform.
 */
export declare const ERROR_CODES: {
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly AUTH_REQUIRED: "AUTH_REQUIRED";
    readonly ACCESS_DENIED: "ACCESS_DENIED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly AI_INVALID_KEY: "AI_INVALID_KEY";
    readonly AI_TIMEOUT: "AI_TIMEOUT";
    readonly AI_QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED";
    readonly INVITE_INVALID: "INVITE_INVALID";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export interface ErrorDetail {
    field: string;
    rule: string;
    message: string;
}
export interface ErrorResponse {
    error: {
        code: ErrorCode;
        message: string;
        details?: ErrorDetail[];
    };
}
/**
 * HTTP status codes mapped to error codes for convenience.
 */
export declare const ERROR_HTTP_STATUS: Record<ErrorCode, number>;
