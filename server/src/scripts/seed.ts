/**
 * Seed script — Genera datos sintéticos para pruebas.
 * 
 * Ejecutar: npx tsx server/src/scripts/seed.ts
 * 
 * Requiere: DATABASE_URL en .env
 * 
 * Usuarios de prueba creados:
 * ─────────────────────────────────────────────────────────
 * | Rol    | Email                      | Password    | PIN  |
 * |--------|----------------------------|-------------|------|
 * | Admin  | admin@iata-demo.edu        | Admin123!   | N/A  |
 * | Docente| profesor1@iata-demo.edu    | Prof1234!   | N/A  |
 * | Docente| profesor2@iata-demo.edu    | Prof1234!   | N/A  |
 * ─────────────────────────────────────────────────────────
 * 
 * Institución: "Universidad Demo IATA"
 * Cursos creados: 3 (con códigos visibles en la salida)
 * Declaraciones: 15 (5 por curso, mix de usó IA sí/no)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../models/schema.js';

// Load .env from server directory
config({ path: resolve(import.meta.dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada. Crea un archivo server/.env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

const BCRYPT_ROUNDS = 12;

// ─── Test Data ──────────────────────────────────────────────────────────────

const TEACHERS = [
  { email: 'admin@iata-demo.edu', name: 'Dra. María González', password: 'Admin123!' },
  { email: 'profesor1@iata-demo.edu', name: 'Prof. Carlos Ramírez', password: 'Prof1234!' },
  { email: 'profesor2@iata-demo.edu', name: 'Lic. Ana Sotomayor', password: 'Prof1234!' },
];

const COURSES_DATA = [
  { name: 'Ética Digital — Grupo A', teacherIdx: 0 },
  { name: 'Programación Avanzada — Grupo B', teacherIdx: 1 },
  { name: 'Inteligencia Artificial — Maestría', teacherIdx: 0 },
];

const STUDENT_NAMES = [
  'Juan Pérez López', 'María Fernanda Torres', 'Carlos Eduardo Ríos',
  'Ana Gabriela Vargas', 'Diego Alejandro Cruz', 'Sofía Valentina Mendoza',
  'Luis Fernando Espinoza', 'Valentina Castro Díaz', 'Andrés Felipe Guzmán',
  'Camila Andrea Morales', 'Roberto Sánchez Villa', 'Lucía Hernández Pinto',
  'Mariana Rojas Delgado', 'Francisco Javier Ortiz', 'Isabella Reyes Fuentes',
];

const AI_TOOLS = ['ChatGPT', 'Gemini', 'Claude', 'Copilot', 'Grammarly', 'DALL·E', 'Perplexity', 'Bing Chat'];

const CAREERS = ['Ingeniería de Sistemas', 'Ingeniería Industrial', 'Administración', 'Derecho', 'Medicina'];
const GROUPS = ['A', 'B', 'C', 'D'];
const SUBJECTS = ['Ética Digital', 'Programación Avanzada', 'Inteligencia Artificial', 'Base de Datos', 'Redes'];

const LEARNINGS = [
  'Aprendí a estructurar mejor mis argumentos usando IA como herramienta de revisión.',
  'La IA me ayudó a entender conceptos complejos de algoritmos al explicarlos de forma simplificada.',
  'Descubrí que la IA puede generar código base pero requiere revisión y adaptación significativa.',
  'Usé la IA para traducir artículos técnicos y comparé con la fuente original.',
  'La herramienta me permitió explorar diferentes perspectivas sobre un problema ético.',
  'Generé diagramas UML con asistencia de IA y luego los refiné manualmente.',
  'La IA fue útil para resumir papers largos pero tuve que verificar las citas.',
  'Aprendí sobre sesgos en modelos de IA al comparar respuestas de distintos proveedores.',
];

const VERIFICATIONS = [
  'Comparé la respuesta con tres fuentes bibliográficas del programa de estudio.',
  'Ejecuté el código generado y verifiqué los resultados con casos de prueba manuales.',
  'Consulté con el docente para validar los puntos principales del resumen.',
  'Crucé la información con la documentación oficial del framework.',
  'Repliqué el análisis de forma manual para confirmar los resultados.',
  'Busqué las referencias citadas por la IA y confirmé que existieran y dijeran lo indicado.',
  'Comparé con las notas de clase y el libro de texto recomendado.',
  'Pedí una segunda opinión a un compañero experto en el tema.',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genCourseCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function genMatricula(): string {
  return '2024' + String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Iniciando seed de datos sintéticos...\n');

  // 1. Create teachers
  const teacherRecords: Array<{ id: string; email: string; name: string }> = [];

  for (const t of TEACHERS) {
    const hash = await bcrypt.hash(t.password, BCRYPT_ROUNDS);
    const [teacher] = await db.insert(schema.teachers).values({
      email: t.email,
      name: t.name,
      passwordHash: hash,
    }).returning({ id: schema.teachers.id, email: schema.teachers.email, name: schema.teachers.name });

    teacherRecords.push(teacher);
    console.log(`  ✅ Docente creado: ${t.email} (pass: ${t.password})`);
  }

  // 2. Create institution
  const [institution] = await db.insert(schema.institutions).values({
    name: 'Universidad Demo IATA',
    createdBy: teacherRecords[0].id,
  }).returning({ id: schema.institutions.id, name: schema.institutions.name });

  console.log(`\n  🏛️  Institución creada: "${institution.name}"`);

  // 3. Create memberships
  await db.insert(schema.institutionMemberships).values({
    teacherId: teacherRecords[0].id,
    institutionId: institution.id,
    role: 'admin',
  });

  await db.insert(schema.institutionMemberships).values({
    teacherId: teacherRecords[1].id,
    institutionId: institution.id,
    role: 'member',
  });

  await db.insert(schema.institutionMemberships).values({
    teacherId: teacherRecords[2].id,
    institutionId: institution.id,
    role: 'member',
  });

  console.log('  👥 Membresías asignadas (admin + 2 miembros)\n');

  // 4. Create courses
  const courseRecords: Array<{ id: string; code: string; name: string; ownerIdx: number }> = [];

  for (const c of COURSES_DATA) {
    const code = genCourseCode();
    const owner = teacherRecords[c.teacherIdx];

    const [course] = await db.insert(schema.courses).values({
      code,
      name: c.name,
      teacherName: owner.name,
      teacherEmail: owner.email,
      ownerId: owner.id,
      institutionId: institution.id,
      expectedStudents: 15,
    }).returning({ id: schema.courses.id, code: schema.courses.code, name: schema.courses.name });

    courseRecords.push({ ...course, ownerIdx: c.teacherIdx });
    console.log(`  📚 Curso: "${c.name}" — Código: ${code} (docente: ${owner.name})`);
  }

  // 5. Create declarations (5 per course = 15 total)
  console.log('\n  📝 Creando declaraciones de estudiantes...');

  let declCount = 0;
  for (const course of courseRecords) {
    for (let i = 0; i < 5; i++) {
      const usedAi = Math.random() > 0.3; // 70% usa IA
      const studentName = STUDENT_NAMES[declCount % STUDENT_NAMES.length];

      await db.insert(schema.declarations).values({
        courseId: course.id,
        studentIdNumber: genMatricula(),
        studentName,
        studentGroup: randomFrom(GROUPS),
        career: randomFrom(CAREERS),
        subject: randomFrom(SUBJECTS),
        activityType: Math.random() > 0.5 ? 'tarea' : 'proyecto',
        usedAi,
        aiTool: usedAi ? randomFrom(AI_TOOLS) : null,
        learnings: usedAi ? randomFrom(LEARNINGS) : null,
        verificationMethod: usedAi ? randomFrom(VERIFICATIONS) : null,
      });

      declCount++;
    }
  }

  console.log(`  ✅ ${declCount} declaraciones creadas\n`);

  // 6. Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DATOS DE PRUEBA — CREDENCIALES');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Usuarios:');
  for (const t of TEACHERS) {
    console.log(`    📧 ${t.email}  |  🔑 ${t.password}`);
  }
  console.log('');
  console.log('  Códigos de curso (para estudiantes):');
  for (const c of courseRecords) {
    console.log(`    📋 ${c.code}  →  "${c.name}"`);
  }
  console.log('');
  console.log('  Institución: "Universidad Demo IATA"');
  console.log('═══════════════════════════════════════════════════════════════');

  await pool.end();
  console.log('\n✨ Seed completado exitosamente.');
}

seed().catch((err) => {
  console.error('❌ Error durante el seed:', err);
  process.exit(1);
});
