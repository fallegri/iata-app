/**
 * Domain entity types for the IATA platform.
 */
export interface Institution {
    id: string;
    name: string;
    createdBy: string;
    createdAt: Date;
}
export interface Teacher {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    createdAt: Date;
}
export interface InstitutionMembership {
    id: string;
    teacherId: string;
    institutionId: string;
    role: 'admin' | 'member';
    joinedAt: Date;
}
export interface InviteCode {
    id: string;
    institutionId: string;
    createdBy: string;
    code: string;
    maxUses: number;
    currentUses: number;
    expiresAt: Date;
    createdAt: Date;
}
export interface Course {
    id: string;
    code: string;
    name: string;
    teacherName: string;
    teacherEmail: string;
    ownerId: string;
    institutionId: string;
    expectedStudents: number;
    emailjsConfig: EmailJSConfig | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailJSConfig {
    serviceId: string;
    templateId: string;
    publicKey: string;
}
export interface Declaration {
    id: string;
    courseId: string;
    studentIdNumber: string;
    studentName: string;
    studentGroup: string;
    career: string;
    subject: string;
    activityType: 'tarea' | 'proyecto';
    usedAi: boolean;
    aiTool: string | null;
    learnings: string | null;
    verificationMethod: string | null;
    submittedAt: Date;
}
export interface AIConfig {
    id: string;
    teacherId: string;
    provider: string;
    encryptedApiKey: Buffer;
    updatedAt: Date;
}
export interface PasswordReset {
    id: string;
    teacherId: string;
    tokenHash: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}
/**
 * JWT payload attached to authenticated requests.
 */
export interface AuthPayload {
    id: string;
    email: string;
    institutionId: string | null;
    role: 'admin' | 'member' | null;
}
/**
 * Public course info returned for student access (no auth required).
 */
export interface PublicCourseInfo {
    code: string;
    name: string;
    teacherName: string;
    teacherEmail: string;
}
/**
 * Pagination metadata for list endpoints.
 */
export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}
