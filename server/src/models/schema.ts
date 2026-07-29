import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  customType,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom type for bytea columns
const bytea = customType<{ data: Buffer; dpiData: string }>({
  dataType() {
    return 'bytea';
  },
});

// ─── Institutions ───────────────────────────────────────────────────────────

export const institutions = pgTable('institutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Teachers ───────────────────────────────────────────────────────────────

export const teachers = pgTable('teachers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Institution Memberships ────────────────────────────────────────────────

export const institutionMemberships = pgTable(
  'institution_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => teachers.id),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id),
    role: varchar('role', { length: 20 }).notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_teacher_institution').on(table.teacherId, table.institutionId),
    check('chk_membership_role', sql`${table.role} IN ('admin', 'member')`),
    index('idx_memberships_teacher').on(table.teacherId),
    index('idx_memberships_institution').on(table.institutionId),
  ]
);

// ─── Invite Codes ───────────────────────────────────────────────────────────

export const inviteCodes = pgTable(
  'invite_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => teachers.id),
    code: varchar('code', { length: 8 }).notNull().unique(),
    maxUses: integer('max_uses').notNull().default(1),
    currentUses: integer('current_uses').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_invite_codes_code').on(table.code),
  ]
);

// ─── Courses ────────────────────────────────────────────────────────────────

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 6 }).notNull().unique(),
    name: varchar('name', { length: 150 }).notNull(),
    teacherName: varchar('teacher_name', { length: 100 }).notNull(),
    teacherEmail: varchar('teacher_email', { length: 254 }).notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => teachers.id),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id),
    expectedStudents: integer('expected_students').default(0),
    emailjsConfig: jsonb('emailjs_config'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_courses_owner').on(table.ownerId),
    index('idx_courses_institution').on(table.institutionId),
  ]
);

// ─── Declarations ───────────────────────────────────────────────────────────

export const declarations = pgTable(
  'declarations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    studentIdNumber: varchar('student_id_number', { length: 20 }).notNull(),
    studentName: varchar('student_name', { length: 100 }).notNull(),
    studentGroup: varchar('student_group', { length: 20 }).notNull(),
    career: varchar('career', { length: 100 }).notNull(),
    subject: varchar('subject', { length: 100 }).notNull(),
    activityType: varchar('activity_type', { length: 20 }).notNull(),
    usedAi: boolean('used_ai').notNull(),
    aiTool: varchar('ai_tool', { length: 100 }),
    learnings: varchar('learnings', { length: 2000 }),
    verificationMethod: varchar('verification_method', { length: 1000 }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('chk_activity_type', sql`${table.activityType} IN ('tarea', 'proyecto')`),
    index('idx_declarations_course').on(table.courseId),
    index('idx_declarations_submitted').on(table.submittedAt.desc()),
    index('idx_declarations_student_name').on(table.studentName),
    index('idx_declarations_student_id').on(table.studentIdNumber),
  ]
);

// ─── AI Configs ─────────────────────────────────────────────────────────────

export const aiConfigs = pgTable('ai_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id')
    .notNull()
    .unique()
    .references(() => teachers.id),
  provider: varchar('provider', { length: 50 }).notNull(),
  encryptedApiKey: bytea('encrypted_api_key').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Password Resets ────────────────────────────────────────────────────────

export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id')
    .notNull()
    .references(() => teachers.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
