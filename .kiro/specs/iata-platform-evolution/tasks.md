# Implementation Plan: Evolución de la Plataforma IATA

## Overview

Implementación incremental de la plataforma IATA como un monorepo con tres capas: frontend React+Vite, backend Node.js/Express con Drizzle ORM, y base de datos PostgreSQL (Neon Tech). El plan prioriza la infraestructura base, luego la lógica de negocio, y finalmente la integración de componentes y funcionalidades avanzadas (IA, dashboard, exportaciones).

## Tasks

- [x] 1. Set up monorepo structure, shared utilities, and database schema
  - [x] 1.1 Initialize monorepo with workspace configuration
    - Create root `package.json` with workspaces: `client/`, `server/`, `shared/`
    - Initialize `client/` with Vite + React + TypeScript template
    - Initialize `server/` with Express + TypeScript + Vitest + fast-check
    - Initialize `shared/` with TypeScript for shared validation rules and types
    - Configure shared tsconfig paths and dependencies
    - _Requirements: 8.1_

  - [x] 1.2 Define shared validation rules and types
    - Create `shared/validation.ts` with all field validation rules (max lengths, regex patterns, required fields)
    - Define TypeScript interfaces for all domain entities: Institution, Teacher, Course, Declaration, AIConfig, InviteCode, PasswordReset
    - Define validation functions: `validateEmail`, `validatePassword`, `validateCourseFields`, `validateDeclarationFields`
    - Export error codes and error response format types
    - _Requirements: 1.1, 1.8, 2.6, 3.3, 3.4, 3.6, 8.2_

  - [x] 1.3 Define Drizzle ORM schema and generate migrations
    - Create `server/src/models/schema.ts` with all 8 tables (institutions, teachers, institution_memberships, invite_codes, courses, declarations, ai_configs, password_resets)
    - Define all columns, types, constraints (UNIQUE, CHECK, NOT NULL), foreign keys with ON DELETE CASCADE for declarations
    - Create indexes for performance: owner_id, institution_id, course_id, submitted_at, student_name, student_id_number
    - Configure Drizzle Kit and generate initial SQL migration
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.9_

  - [x] 1.4 Set up database connection and automatic migration on startup
    - Create `server/src/db/connection.ts` with Neon Tech PostgreSQL connection using `@neondatabase/serverless` driver
    - Implement auto-migration on server startup (creates tables if not exist)
    - Configure environment variables for DATABASE_URL, JWT_SECRET, encryption keys
    - _Requirements: 9.4_

- [x] 2. Implement authentication system
  - [x] 2.1 Implement AuthService (register, login, token management)
    - Create `server/src/services/auth.service.ts` with `register`, `login`, `verifyToken`, `requestPasswordReset`, `resetPassword` methods
    - Use bcrypt for password hashing (cost factor 12)
    - Generate JWT tokens with configurable expiration (default 24h, range 1-168h)
    - Implement failed login tracking and account lockout (5 attempts → 15 min lock)
    - Implement password reset flow with hashed tokens and 60-min expiration
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.9, 1.10_

  - [ ]* 2.2 Write property test for registration validation (Property 1)
    - **Property 1: Validación de registro (email y contraseña)**
    - Generate arbitrary strings as email/password, verify acceptance iff RFC 5322 format + 8+ chars with uppercase+lowercase+number
    - **Validates: Requirements 1.1, 1.8**

  - [ ]* 2.3 Write property test for JWT lifecycle (Property 2)
    - **Property 2: Ciclo de vida del token JWT**
    - Generate tokens with varying expiration configs, verify validity before expiration and rejection after
    - **Validates: Requirements 1.2, 1.5, 8.3, 8.4**

  - [ ]* 2.4 Write property test for account lockout (Property 3)
    - **Property 3: Bloqueo de cuenta por intentos fallidos**
    - Simulate N consecutive failed login attempts, verify lock engages at exactly 5 and releases after 15 min
    - **Validates: Requirements 1.7**

  - [x] 2.5 Implement auth middleware and rate limiter
    - Create `server/src/middleware/auth.middleware.ts` — extract JWT from Authorization header, verify, attach teacher payload to req
    - Create `server/src/middleware/rate-limiter.ts` — 60 req/min per IP for public endpoints, return 429 with Retry-After header
    - Create `server/src/middleware/validate.ts` — generic schema-based validation middleware returning 400 with field errors
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.9_

  - [ ]* 2.6 Write property test for rate limiting (Property 13)
    - **Property 13: Rate limiting en endpoints públicos**
    - Simulate N requests from same IP, verify 429 at request 61 within 1-minute window
    - **Validates: Requirements 8.9**

  - [ ]* 2.7 Write property test for input sanitization (Property 16)
    - **Property 16: Sanitización de entradas (XSS y SQL injection)**
    - Generate strings with HTML/SQL injection payloads, verify safe storage and retrieval without execution
    - **Validates: Requirements 8.5**

  - [x] 2.8 Implement auth routes
    - Create `server/src/routes/auth.routes.ts` with POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/forgot-password`, POST `/api/auth/reset-password`
    - Wire validation middleware with shared validation rules
    - Handle duplicate email registration (error 1.6)
    - Return generic error message on invalid credentials without revealing which field is wrong
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.8_

- [x] 3. Checkpoint - Ensure all auth tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement institution management
  - [x] 4.1 Implement InstitutionService
    - Create `server/src/services/institution.service.ts` with `create`, `generateInviteCode`, `joinWithCode`, `getMembers`, `revokeMembership` methods
    - Implement invite code generation (8 alphanumeric chars, unique)
    - Validate invite code: check expiration, max uses, existence
    - Implement membership revocation with confirmation logic
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.10_

  - [ ]* 4.2 Write property test for invite code lifecycle (Property 11)
    - **Property 11: Ciclo de vida de códigos de invitación**
    - Generate codes with varying max_uses and expiry, verify acceptance/rejection based on state
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [ ]* 4.3 Write property test for cross-institution isolation (Property 14)
    - **Property 14: Aislamiento entre instituciones**
    - Create docentes in different institutions, verify no cross-institution data leaks
    - **Validates: Requirements 10.11**

  - [ ]* 4.4 Write property test for admin privacy (Property 15)
    - **Property 15: Privacidad en vista de administrador**
    - Verify member list only exposes name, email, join date — never courses or declarations
    - **Validates: Requirements 10.8**

  - [x] 4.5 Implement institution routes
    - Create `server/src/routes/institution.routes.ts` with POST `/api/institutions`, GET `/api/institutions/members`, POST `/api/institutions/invite`, POST `/api/institutions/join`, DELETE `/api/institutions/members/:id`
    - Apply JWT middleware + admin role check where needed
    - _Requirements: 10.1, 10.2, 10.3, 10.8, 10.10_

- [x] 5. Implement course management
  - [x] 5.1 Implement CourseService
    - Create `server/src/services/course.service.ts` with `create`, `update`, `delete`, `findByTeacher`, `findByCode`, `generateUniqueCode` methods
    - Generate 6-char alphanumeric unique course codes
    - Enforce ownership: only course owner can update/delete
    - Associate courses with teacher's active institution
    - Cascade delete: removing a course removes all associated declarations
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.5, 4.6, 10.6_

  - [ ]* 5.2 Write property test for course code generation (Property 5)
    - **Property 5: Generación de códigos de curso**
    - Generate N codes, verify each is exactly 6 chars [A-Z0-9] and all unique
    - **Validates: Requirements 2.1**

  - [ ]* 5.3 Write property test for data isolation by teacher (Property 4)
    - **Property 4: Aislamiento de datos por docente**
    - For any teacher D, verify queries only return resources where owner_id = D.id; access to others returns generic error
    - **Validates: Requirements 4.6, 4.7, 4.10, 6.7, 10.5, 10.7, 10.9**

  - [x] 5.4 Implement course routes
    - Create `server/src/routes/course.routes.ts` with GET `/api/courses`, POST `/api/courses`, PUT `/api/courses/:id`, DELETE `/api/courses/:id`, GET `/api/courses/public/:code`
    - Public endpoint (no auth) for student access to course by code
    - Protected endpoints require JWT and verify ownership
    - Validate EmailJS config fields on course creation/update
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.6, 4.7_

- [x] 6. Implement declaration submission and retrieval
  - [x] 6.1 Implement DeclarationService
    - Create `server/src/services/declaration.service.ts` with `create`, `findByCourse`, `findByStudent`, `getById`, `exportCSV` methods
    - Validate conditional fields: if used_ai=true, require ai_tool, learnings, verification_method
    - Implement pagination (25 per page, ordered by submitted_at DESC)
    - Implement text search (2+ chars, case-insensitive, on student_name and student_id_number)
    - Implement CSV export with active filters
    - _Requirements: 3.3, 3.4, 3.5, 3.9, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.2 Write property test for declaration validation (Property 6)
    - **Property 6: Validación de declaraciones con campos condicionales**
    - Generate declarations with used_ai true/false, verify conditional required fields and max lengths
    - **Validates: Requirements 3.3, 3.4, 3.6, 3.9**

  - [ ]* 6.3 Write property test for persistence round-trip (Property 7)
    - **Property 7: Persistencia y recuperación de declaraciones (round-trip)**
    - Create declarations and retrieve them, verify all fields match exactly with UTC timestamp
    - **Validates: Requirements 3.5, 4.3, 4.4**

  - [ ]* 6.4 Write property test for pagination (Property 8)
    - **Property 8: Paginación correcta**
    - Generate N declarations, verify page size ≤ 25, total = N, all pages union = full set without duplicates
    - **Validates: Requirements 5.1**

  - [ ]* 6.5 Write property test for text search (Property 9)
    - **Property 9: Filtrado por búsqueda de texto**
    - Generate search terms and datasets, verify results contain exactly matching entries (case-insensitive substring)
    - **Validates: Requirements 5.3**

  - [ ]* 6.6 Write property test for CSV export with filters (Property 17)
    - **Property 17: Exportación CSV refleja filtros activos**
    - Apply combinations of filters, verify CSV contains exactly matching declarations
    - **Validates: Requirements 5.5**

  - [x] 6.7 Implement declaration routes
    - Create `server/src/routes/declaration.routes.ts` with POST `/api/declarations` (public), GET `/api/declarations` (JWT), GET `/api/declarations/:id` (JWT), GET `/api/declarations/export` (JWT)
    - Public POST validates course code existence before saving
    - Protected GETs enforce teacher ownership
    - Support query params: page, search, courseId
    - _Requirements: 3.1, 3.2, 3.5, 4.4, 4.8, 5.1, 5.3, 5.5, 5.6_

- [x] 7. Checkpoint - Ensure all backend core tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement dashboard analytics
  - [x] 8.1 Implement DashboardService
    - Create `server/src/services/dashboard.service.ts` with `getStats` method
    - Calculate: totalDeclarations, usedAI count, notUsedAI count, top 10 tools by frequency, declarations per course, progress by course (received/expected × 100)
    - Support optional courseId filter to narrow stats to a single course
    - Only return data for the authenticated teacher's courses
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 8.2 Write property test for dashboard statistics consistency (Property 10)
    - **Property 10: Consistencia de estadísticas del dashboard**
    - Generate declaration sets, verify: total = used + notUsed, sum per course = total, top tools sorted desc and ≤ 10, progress formula correct
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

  - [x] 8.3 Implement dashboard route
    - Create `server/src/routes/dashboard.routes.ts` with GET `/api/dashboard/stats` (JWT)
    - Accept optional `courseId` query param for filtering
    - _Requirements: 6.1, 6.4, 6.6, 6.8_

- [x] 9. Implement LLM multi-provider adapter and AI assistant
  - [x] 9.1 Implement LLM adapter interface and provider implementations
    - Create `server/src/llm/adapter.interface.ts` with `LLMAdapter` interface (chat, validateKey methods)
    - Implement `server/src/llm/gemini.adapter.ts`, `claude.adapter.ts`, `grok.adapter.ts`, `nvidia.adapter.ts`, `ollama.adapter.ts`
    - Create `server/src/llm/factory.ts` — LLMFactory that instantiates the correct adapter by provider name
    - Implement 30-second timeout per provider call
    - _Requirements: 7.1, 7.4, 7.6_

  - [x] 9.2 Implement AIService with encryption
    - Create `server/src/services/ai.service.ts` with `configure`, `chat`, `summarize`, `getConfig` methods
    - Implement API key encryption/decryption using AES-256-GCM for storage in ai_configs table
    - Build context from teacher's declarations for LLM prompts
    - Implement summarize: count learnings, top 5 tools, verified vs unverified ratio
    - Enforce 2000 char max on user queries
    - Only send data from the authenticated teacher's courses to the provider
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 9.3 Write property test for API key encryption round-trip (Property 12)
    - **Property 12: Cifrado de API key (round-trip)**
    - Generate arbitrary keys (1-256 chars), verify encrypt→decrypt produces original and ciphertext ≠ plaintext
    - **Validates: Requirements 7.2**

  - [x] 9.4 Implement AI routes
    - Create `server/src/routes/ai.routes.ts` with POST `/api/ai/chat`, PUT `/api/ai/config`, GET `/api/ai/config` (all JWT)
    - Return specific error messages for invalid key, timeout, quota exceeded
    - _Requirements: 7.1, 7.4, 7.6, 7.8_

- [x] 10. Implement access control for revoked memberships
  - [x] 10.1 Implement membership verification in auth middleware
    - Enhance auth middleware to check active membership status in the institution
    - Deny access with generic error if membership is revoked
    - Courses and declarations remain in DB but are inaccessible until re-join
    - _Requirements: 10.10, 10.12_

  - [ ]* 10.2 Write property test for revoked membership access (Property 20)
    - **Property 20: Inaccesibilidad tras revocación de membresía**
    - Revoke membership, verify all access attempts are denied; re-join, verify access restored
    - **Validates: Requirements 10.10**

- [x] 11. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement frontend authentication and routing
  - [x] 12.1 Set up React Router, auth context, and protected routes
    - Create `client/src/context/AuthContext.tsx` with login/logout/register state and token management in localStorage
    - Create `client/src/components/ProtectedRoute.tsx` — redirects to /login if not authenticated
    - Set up React Router with all routes defined in design (14 pages)
    - Create `client/src/services/api.ts` — Axios instance with JWT interceptor and base URL config
    - _Requirements: 1.5, 9.1_

  - [x] 12.2 Implement Login and Register pages
    - Create `client/src/pages/Login.tsx` — email + password form, error messages without revealing which field is incorrect
    - Create `client/src/pages/Register.tsx` — registration form with institution selection (create new or join with invite code)
    - Implement client-side validation using shared validation rules
    - Handle locked account message (1.7)
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 12.3 Implement Forgot Password and Reset Password pages
    - Create `client/src/pages/ForgotPassword.tsx` — email input, success message
    - Create `client/src/pages/ResetPassword.tsx` — new password form with token from URL
    - _Requirements: 1.4_

- [x] 13. Implement frontend course management
  - [x] 13.1 Implement course list, create, edit, and delete pages
    - Create `client/src/pages/Courses.tsx` — list teacher's courses with shareable link and code display
    - Create `client/src/pages/CourseCreate.tsx` — form with name, teacher name, teacher email, EmailJS config (optional)
    - Create `client/src/pages/CourseEdit.tsx` — edit form pre-filled with current values
    - Implement delete with confirmation dialog
    - Client-side validation for max lengths and required fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 13.2 Implement course detail page with declarations list
    - Create `client/src/pages/CourseDetail.tsx` — paginated declarations list (25/page), search by name/matrícula, declaration detail view
    - Implement pagination controls (prev/next/page numbers)
    - Implement search field (triggers at 2+ chars)
    - Show empty state message when no declarations exist
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [x] 13.3 Implement student history and CSV export
    - Add student selection to show cross-course history
    - Implement CSV export button that downloads filtered or full declarations
    - _Requirements: 5.4, 5.5_

- [x] 14. Implement frontend student declaration form
  - [x] 14.1 Implement student access and declaration form
    - Create `client/src/pages/StudentForm.tsx` — accessed via `/declare/:code`
    - Implement course code entry on home page as alternative access
    - Show form fields: matrícula, nombre, grupo, carrera, materia, tipo de actividad (dropdown), uso de IA (yes/no)
    - Conditionally show AI fields (tool, learnings, verification method) when uso_ai = yes
    - Client-side validation with error messages per field
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.9, 9.1_

  - [x] 14.2 Implement declaration success page with PDF and EmailJS
    - Create `client/src/pages/StudentSuccess.tsx` — confirmation message with PDF download button
    - Implement PDF generation with jsPDF: title "Declaración de Uso de Inteligencia Artificial", all required fields
    - Implement EmailJS notification trigger with exact template params: to_email, to_name, course_name, student_name, student_email, used_ai, tool_used, what_learned, how_verified, submitted_at
    - _Requirements: 3.7, 3.8, 9.2, 9.3_

  - [ ]* 14.3 Write property test for PDF content completeness (Property 18)
    - **Property 18: Completitud del contenido PDF**
    - Generate declarations, verify PDF output contains all required fields
    - **Validates: Requirements 9.2**

  - [ ]* 14.4 Write property test for EmailJS parameter compatibility (Property 19)
    - **Property 19: Compatibilidad de parámetros EmailJS**
    - Generate declarations + course configs, verify payload contains exactly the required params with correct values
    - **Validates: Requirements 9.3**

- [x] 15. Checkpoint - Ensure frontend form and auth tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement frontend dashboard and AI assistant
  - [x] 16.1 Implement Dashboard page
    - Create `client/src/pages/Dashboard.tsx` with statistics display: total declarations, used AI / not used AI counts
    - Implement bar chart for top 10 AI tools (use a lightweight chart library like recharts)
    - Show declarations per course and progress indicator (received/expected × 100)
    - Implement course filter dropdown to narrow stats
    - Show empty state with guide to create first course when no data
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 16.2 Implement AI Assistant pages
    - Create `client/src/pages/AIAssistant.tsx` — chat interface accessible from dashboard
    - Create `client/src/pages/AIConfig.tsx` — provider selection dropdown (Gemini, Claude, Grok, Nvidia, Ollama) + API key input (max 256 chars)
    - Show confirmation on successful config save
    - Enforce 2000-char max on chat input with counter
    - Display specific error messages (invalid key, timeout, quota exceeded)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_

- [x] 17. Implement frontend institution management
  - [x] 17.1 Implement Institution admin page
    - Create `client/src/pages/Institution.tsx` — show members list (name, email, join date), generate invite code form (validity days 1-30, max uses 1-100)
    - Implement revoke membership with confirmation
    - Show invite code generation result with copy-to-clipboard
    - Handle "no institution" state with prompt to create or join
    - _Requirements: 10.1, 10.2, 10.8, 10.10, 10.12_

- [x] 18. Implement UI localization and compatibility
  - [x] 18.1 Ensure Spanish language throughout UI
    - Verify all labels, messages, error texts, placeholders, and informational texts are in Spanish
    - Create `client/src/utils/messages.ts` with centralized string constants for all user-facing text
    - Include error messages for service unavailability (9.6)
    - _Requirements: 9.5, 9.6_

- [x] 19. Wire Express app with all routes and middleware
  - [x] 19.1 Create main Express application entry point
    - Create `server/src/app.ts` — register all route modules, apply global middleware (CORS, JSON body parser, rate limiter for public routes, auth middleware for protected routes)
    - Create `server/src/index.ts` — start server, run auto-migration, configure port from env
    - Implement global error handler returning appropriate status codes (400, 401, 403, 404, 429, 503)
    - Implement service unavailability check (503 when DB is down)
    - Ensure response time < 5s under normal conditions (exclude AI calls)
    - _Requirements: 8.1, 8.4, 8.6, 8.7, 8.8, 8.9_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- All code in TypeScript, frontend with React+Vite, backend with Node.js+Express+Drizzle ORM
- Testing framework: Vitest + fast-check for property-based tests, supertest for API integration
- Database: PostgreSQL via Neon Tech with Drizzle ORM migrations
- All UI text must be in Spanish per requirement 9.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["2.1", "2.5"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.4", "2.6", "2.7", "2.8"] },
    { "id": 5, "tasks": ["4.1", "5.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 9, "tasks": ["8.1", "9.1"] },
    { "id": 10, "tasks": ["8.2", "8.3", "9.2"] },
    { "id": 11, "tasks": ["9.3", "9.4", "10.1"] },
    { "id": 12, "tasks": ["10.2"] },
    { "id": 13, "tasks": ["12.1"] },
    { "id": 14, "tasks": ["12.2", "12.3", "14.1"] },
    { "id": 15, "tasks": ["13.1", "14.2"] },
    { "id": 16, "tasks": ["13.2", "14.3", "14.4"] },
    { "id": 17, "tasks": ["13.3", "16.1", "16.2"] },
    { "id": 18, "tasks": ["17.1", "18.1"] },
    { "id": 19, "tasks": ["19.1"] }
  ]
}
```
