-- ═══════════════════════════════════════════════════════════════
-- IATA Platform — Datos Sintéticos para Pruebas
-- Ejecutar en Neon Tech SQL Editor DESPUÉS del schema
-- ═══════════════════════════════════════════════════════════════

-- Passwords:
--   Admin123!  → hash abajo
--   Prof1234!  → hash abajo

-- 1. Docentes
INSERT INTO teachers (id, email, name, password_hash) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@iata-demo.edu', 'Dra. Maria Gonzalez', '$2b$12$HuasWvcETvBGAtNahn25ROCYG/WtC32c3ZxP4ZSol5G/AdHwls/VO'),
('22222222-2222-2222-2222-222222222222', 'profesor1@iata-demo.edu', 'Prof. Carlos Ramirez', '$2b$12$TMtgsIU9zqfSBYqtWFP2u.R3g8V.1Oys1uMG/41nN.QWvk2OPHMPq'),
('33333333-3333-3333-3333-333333333333', 'profesor2@iata-demo.edu', 'Lic. Ana Sotomayor', '$2b$12$TMtgsIU9zqfSBYqtWFP2u.R3g8V.1Oys1uMG/41nN.QWvk2OPHMPq');

-- 2. Institucion
INSERT INTO institutions (id, name, created_by) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Universidad Demo IATA', '11111111-1111-1111-1111-111111111111');

-- 3. Membresias
INSERT INTO institution_memberships (teacher_id, institution_id, role) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'member'),
('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'member');

-- 4. Cursos
INSERT INTO courses (id, code, name, teacher_name, teacher_email, owner_id, institution_id, expected_students) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccc01', 'ETK4A2', 'Etica Digital - Grupo A', 'Dra. Maria Gonzalez', 'admin@iata-demo.edu', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 15),
('cccccccc-cccc-cccc-cccc-cccccccccc02', 'PRG7B3', 'Programacion Avanzada - Grupo B', 'Prof. Carlos Ramirez', 'profesor1@iata-demo.edu', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20),
('cccccccc-cccc-cccc-cccc-cccccccccc03', 'IAM9C5', 'Inteligencia Artificial - Maestria', 'Dra. Maria Gonzalez', 'admin@iata-demo.edu', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10);

-- 5. Declaraciones - Curso 1 (Etica Digital)
INSERT INTO declarations (course_id, student_id_number, student_name, student_group, career, subject, activity_type, used_ai, ai_tool, learnings, verification_method) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccc01', '20241001', 'Juan Perez Lopez', 'A', 'Ingenieria de Sistemas', 'Etica Digital', 'tarea', true, 'ChatGPT', 'Aprendi a estructurar mejor mis argumentos usando IA como herramienta de revision y contraste de ideas.', 'Compare la respuesta con tres fuentes bibliograficas del programa de estudio.'),
('cccccccc-cccc-cccc-cccc-cccccccccc01', '20241002', 'Maria Fernanda Torres', 'A', 'Administracion', 'Etica Digital', 'proyecto', true, 'Gemini', 'La IA me ayudo a entender conceptos complejos de etica al explicarlos de forma simplificada y con ejemplos.', 'Consulte con el docente para validar los puntos principales del resumen.'),
('cccccccc-cccc-cccc-cccc-cccccccccc01', '20241003', 'Carlos Eduardo Rios', 'B', 'Derecho', 'Etica Digital', 'tarea', false, NULL, NULL, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccc01', '20241004', 'Ana Gabriela Vargas', 'A', 'Ingenieria Industrial', 'Etica Digital', 'tarea', true, 'Claude', 'La herramienta me permitio explorar diferentes perspectivas sobre un problema etico contemporaneo.', 'Busque las referencias citadas por la IA y confirme que existieran y dijeran lo indicado.'),
('cccccccc-cccc-cccc-cccc-cccccccccc01', '20241005', 'Diego Alejandro Cruz', 'B', 'Ingenieria de Sistemas', 'Etica Digital', 'proyecto', true, 'Perplexity', 'Aprendi sobre sesgos en modelos de IA al comparar respuestas de distintos proveedores.', 'Replique el analisis de forma manual para confirmar los resultados.');

-- 6. Declaraciones - Curso 2 (Programacion Avanzada)
INSERT INTO declarations (course_id, student_id_number, student_name, student_group, career, subject, activity_type, used_ai, ai_tool, learnings, verification_method) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccc02', '20241006', 'Sofia Valentina Mendoza', 'B', 'Ingenieria de Sistemas', 'Programacion Avanzada', 'proyecto', true, 'Copilot', 'Descubri que la IA puede generar codigo base pero requiere revision y adaptacion significativa al contexto del proyecto.', 'Ejecute el codigo generado y verifique los resultados con casos de prueba manuales.'),
('cccccccc-cccc-cccc-cccc-cccccccccc02', '20241007', 'Luis Fernando Espinoza', 'B', 'Ingenieria de Sistemas', 'Programacion Avanzada', 'tarea', true, 'ChatGPT', 'Genere diagramas UML con asistencia de IA y luego los refine manualmente segun los patrones de diseno del curso.', 'Cruce la informacion con la documentacion oficial del framework.'),
('cccccccc-cccc-cccc-cccc-cccccccccc02', '20241008', 'Valentina Castro Diaz', 'C', 'Ingenieria Industrial', 'Programacion Avanzada', 'tarea', false, NULL, NULL, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccc02', '20241009', 'Andres Felipe Guzman', 'B', 'Ingenieria de Sistemas', 'Programacion Avanzada', 'proyecto', true, 'Gemini', 'La IA fue util para resumir documentacion tecnica extensa pero tuve que verificar la exactitud de cada paso.', 'Compare con las notas de clase y el libro de texto recomendado.'),
('cccccccc-cccc-cccc-cccc-cccccccccc02', '20241010', 'Camila Andrea Morales', 'C', 'Ingenieria de Sistemas', 'Programacion Avanzada', 'tarea', true, 'Copilot', 'Aprendi a usar autocompletado inteligente para acelerar la escritura de tests unitarios.', 'Ejecute el codigo generado y verifique los resultados con casos de prueba manuales.');

-- 7. Declaraciones - Curso 3 (IA Maestria)
INSERT INTO declarations (course_id, student_id_number, student_name, student_group, career, subject, activity_type, used_ai, ai_tool, learnings, verification_method) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccc03', '20241011', 'Roberto Sanchez Villa', 'A', 'Ingenieria de Sistemas', 'Inteligencia Artificial', 'proyecto', true, 'ChatGPT', 'Use la IA para traducir y resumir papers academicos recientes sobre transformers y atencion.', 'La IA fue util para resumir papers largos pero tuve que verificar las citas una por una.'),
('cccccccc-cccc-cccc-cccc-cccccccccc03', '20241012', 'Lucia Hernandez Pinto', 'A', 'Ingenieria de Sistemas', 'Inteligencia Artificial', 'tarea', true, 'Claude', 'Aprendi a formular mejores prompts para obtener explicaciones tecnicas mas precisas sobre redes neuronales.', 'Pedi una segunda opinion a un companero experto en el tema y compare resultados.'),
('cccccccc-cccc-cccc-cccc-cccccccccc03', '20241013', 'Mariana Rojas Delgado', 'B', 'Ingenieria de Sistemas', 'Inteligencia Artificial', 'proyecto', true, 'Gemini', 'La IA me ayudo a depurar errores en mi implementacion de backpropagation paso a paso.', 'Ejecute el codigo generado y verifique los resultados con casos de prueba manuales.'),
('cccccccc-cccc-cccc-cccc-cccccccccc03', '20241014', 'Francisco Javier Ortiz', 'A', 'Ingenieria Industrial', 'Inteligencia Artificial', 'tarea', false, NULL, NULL, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccc03', '20241015', 'Isabella Reyes Fuentes', 'B', 'Ingenieria de Sistemas', 'Inteligencia Artificial', 'proyecto', true, 'Perplexity', 'Descubri nuevas arquitecturas de modelos que no estaban en el material del curso gracias a la busqueda con IA.', 'Busque las referencias citadas por la IA y confirme que existieran en bases de datos academicas.');

-- ═══════════════════════════════════════════════════════════════
-- RESUMEN DE CREDENCIALES
-- ═══════════════════════════════════════════════════════════════
-- admin@iata-demo.edu     | Admin123!  | Admin de institucion
-- profesor1@iata-demo.edu | Prof1234!  | Docente miembro
-- profesor2@iata-demo.edu | Prof1234!  | Docente miembro
--
-- Codigos de curso para estudiantes:
-- ETK4A2 → Etica Digital - Grupo A
-- PRG7B3 → Programacion Avanzada - Grupo B
-- IAM9C5 → Inteligencia Artificial - Maestria
-- ═══════════════════════════════════════════════════════════════
