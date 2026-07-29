# Requirements Document

## Introduction

Evolución de la plataforma IATA (Instrumento Abierto de Transparencia Académica) desde una aplicación SPA de navegador sin persistencia hacia un sistema completo con autenticación de docentes, base de datos persistente, panel de analítica y asistente de IA integrado. El sistema permite a estudiantes declarar el uso de inteligencia artificial en sus trabajos académicos, y a docentes gestionar, consultar y analizar dichas declaraciones.

## Glossary

- **Plataforma**: La aplicación web IATA en su totalidad (frontend y backend)
- **Institución**: Entidad organizacional que agrupa a Docentes bajo una misma escuela, universidad o centro educativo. Cada Institución opera de forma aislada respecto a otras Instituciones
- **Administrador_Institución**: Docente que creó la Institución y tiene capacidad de gestionar la membresía de otros Docentes dentro de ella
- **Docente**: Usuario que pertenece a una Institución, crea y administra sus propios cursos, consulta declaraciones y utiliza las herramientas de análisis. Los datos de cada Docente son privados dentro de la Institución
- **Estudiante**: Usuario que accede a un curso mediante código o enlace compartido y envía declaraciones de uso de IA
- **Curso**: Entidad creada por un Docente dentro de una Institución, identificada por un código único de 6 caracteres alfanuméricos. Es propiedad exclusiva del Docente que lo creó
- **Declaración**: Formulario completado por un Estudiante indicando si usó IA, qué herramienta, qué aprendió y cómo verificó la información
- **Dashboard**: Panel visual del Docente con estadísticas, gráficas y resúmenes sobre las declaraciones recibidas
- **Asistente_IA**: Módulo que permite al Docente consultar, resumir y analizar declaraciones usando un modelo de lenguaje (LLM)
- **Base_de_Datos**: Almacenamiento persistente PostgreSQL (Neon Tech) que reemplaza el almacenamiento local del navegador
- **API_Backend**: Servicio servidor que expone endpoints REST para la comunicación entre el frontend y la Base_de_Datos
- **Código_de_Curso**: Cadena alfanumérica única de 6 caracteres que identifica un Curso y permite a los Estudiantes acceder a él
- **Código_de_Invitación**: Cadena alfanumérica única generada por el Administrador_Institución que permite a otros Docentes unirse a la Institución

## Requirements

### Requirement 1: Autenticación y Gestión de Cuentas de Docentes

**User Story:** Como docente, quiero crear una cuenta con correo y contraseña para gestionar mis cursos de forma segura y acceder a mi historial desde cualquier dispositivo.

#### Acceptance Criteria

1. WHEN un Docente proporciona correo electrónico con formato válido y una contraseña de al menos 8 caracteres que contenga al menos una letra mayúscula, una letra minúscula y un número en el formulario de registro, THE Plataforma SHALL crear una cuenta y solicitar al Docente que seleccione una Institución existente (mediante Código_de_Invitación) o que cree una nueva Institución
2. WHEN un Docente ingresa credenciales válidas en el formulario de inicio de sesión, THE Plataforma SHALL autenticar al Docente y redirigir al Dashboard correspondiente a la Institución a la que pertenece
3. IF un Docente ingresa credenciales inválidas, THEN THE Plataforma SHALL mostrar un mensaje de error indicando que las credenciales son incorrectas sin revelar cuál campo es el incorrecto
4. WHEN un Docente solicita restablecer su contraseña, THE Plataforma SHALL enviar un enlace de restablecimiento al correo registrado con una validez máxima de 60 minutos, tras los cuales el enlace dejará de funcionar
5. WHILE un Docente no ha iniciado sesión, THE Plataforma SHALL restringir el acceso a las funciones de creación de cursos, Dashboard y Asistente_IA
6. IF un Docente intenta registrarse con un correo electrónico que ya está asociado a una cuenta existente, THEN THE Plataforma SHALL mostrar un mensaje de error indicando que el correo ya se encuentra registrado
7. IF un Docente falla la autenticación 5 veces consecutivas para la misma cuenta, THEN THE Plataforma SHALL bloquear temporalmente los intentos de inicio de sesión para esa cuenta durante 15 minutos
8. IF un Docente envía el formulario de registro con un correo en formato inválido o una contraseña que no cumple los requisitos mínimos, THEN THE Plataforma SHALL indicar los campos que no cumplen las reglas de validación sin completar el registro
9. WHEN un Docente completa el registro exitosamente y elige crear una nueva Institución, THE Plataforma SHALL asignar al Docente el rol de Administrador_Institución para esa Institución
10. WHEN un Docente completa el registro exitosamente y proporciona un Código_de_Invitación válido, THE Plataforma SHALL asociar al Docente como miembro de la Institución correspondiente con rol de Docente

### Requirement 2: Creación y Configuración de Cursos

**User Story:** Como docente, quiero crear cursos con un código único y configurar opciones de notificación, para que mis estudiantes puedan enviar sus declaraciones fácilmente.

#### Acceptance Criteria

1. WHEN un Docente completa el formulario de creación de curso con nombre del curso (máximo 150 caracteres), nombre del docente (máximo 100 caracteres) y correo del docente (formato válido de email), THE Plataforma SHALL generar un Código_de_Curso único de 6 caracteres alfanuméricos y persistir el Curso en la Base_de_Datos
2. WHEN un Curso es creado, THE Plataforma SHALL generar un enlace compartible con formato que incluya el Código_de_Curso como parámetro de query string
3. WHEN un Docente activa la integración EmailJS para un Curso, THE Plataforma SHALL solicitar Service ID, Template ID y Public Key y almacenarlos asociados al Curso
4. WHEN un Docente accede a la vista de edición de un Curso, THE Plataforma SHALL permitir modificar nombre del curso, nombre del docente, correo del docente y configuración de EmailJS
5. WHEN un Docente solicita eliminar un Curso, THE Plataforma SHALL solicitar confirmación y, al confirmarla, eliminar el Curso y todas las Declaraciones asociadas de la Base_de_Datos
6. IF un Docente envía el formulario de creación de curso con campos obligatorios vacíos o que exceden la longitud máxima, THEN THE Plataforma SHALL mostrar un mensaje indicando los campos con error sin crear el Curso
7. IF un Docente ingresa credenciales de EmailJS inválidas y se detecta un error al intentar verificar la conexión, THEN THE Plataforma SHALL advertir al Docente que la configuración podría no funcionar correctamente

### Requirement 3: Formulario de Declaración del Estudiante

**User Story:** Como estudiante, quiero llenar un formulario completo declarando mi uso de IA con datos académicos detallados, para cumplir con la transparencia requerida por mi institución.

#### Acceptance Criteria

1. WHEN un Estudiante ingresa un Código_de_Curso válido o accede mediante enlace compartido, THE Plataforma SHALL mostrar el formulario de declaración asociado al Curso correspondiente
2. IF un Estudiante ingresa un Código_de_Curso que no existe en la Base_de_Datos, THEN THE Plataforma SHALL mostrar un mensaje de error indicando que no se encontró ningún curso con ese código
3. THE Plataforma SHALL requerir los siguientes campos en el formulario del Estudiante: matrícula (máximo 20 caracteres alfanuméricos), nombre completo (máximo 100 caracteres), grupo (máximo 20 caracteres), carrera (máximo 100 caracteres), materia (máximo 100 caracteres), tipo de actividad (selección entre "Tarea" o "Proyecto"), declaración de uso de IA (sí/no)
4. WHEN un Estudiante selecciona "Sí" en la declaración de uso de IA, THE Plataforma SHALL mostrar campos adicionales obligatorios: herramienta de IA utilizada (máximo 100 caracteres), hallazgos o aprendizajes obtenidos con apoyo de la IA (máximo 2000 caracteres), y método de verificación de la respuesta (máximo 1000 caracteres)
5. WHEN un Estudiante envía el formulario con todos los campos obligatorios completos y válidos, THE Plataforma SHALL persistir la Declaración en la Base_de_Datos con marca de tiempo en formato UTC
6. IF un Estudiante envía el formulario con campos obligatorios vacíos o que exceden la longitud máxima, THEN THE Plataforma SHALL resaltar los campos faltantes o inválidos y mostrar un mensaje de error descriptivo por cada campo
7. WHEN una Declaración se persiste exitosamente, THE Plataforma SHALL ofrecer al Estudiante la opción de descargar un PDF con los datos de la Declaración
8. WHEN un Curso tiene configurado EmailJS y una Declaración se persiste exitosamente, THE Plataforma SHALL enviar una notificación al correo del Docente con los datos de la Declaración
9. WHEN un Estudiante selecciona "Sí" en el uso de IA, los campos de herramienta utilizada, hallazgos y método de verificación SHALL ser tratados como obligatorios y validados antes de permitir el envío del formulario

### Requirement 4: Persistencia de Datos con PostgreSQL

**User Story:** Como docente, quiero que todas las declaraciones de mis estudiantes se almacenen de forma persistente en una base de datos, para no perder información y poder consultarla desde cualquier dispositivo.

#### Acceptance Criteria

1. THE API_Backend SHALL almacenar las Instituciones en la Base_de_Datos con los campos: identificador único, nombre de la Institución (máximo 200 caracteres), identificador del Administrador_Institución que la creó, y fecha de creación (fecha y hora en formato UTC)
2. THE API_Backend SHALL almacenar los Cursos en la Base_de_Datos con los campos: código (6 caracteres alfanuméricos), nombre del curso (máximo 150 caracteres), nombre del docente (máximo 100 caracteres), correo del docente (máximo 254 caracteres, formato válido de email), configuración de EmailJS (Service ID, Template ID y Public Key), referencia a la Institución a la que pertenece, referencia al Docente propietario, y fecha de creación (fecha y hora en formato UTC)
3. THE API_Backend SHALL almacenar las Declaraciones en la Base_de_Datos con los campos: referencia al curso, matrícula (máximo 20 caracteres), nombre completo (máximo 100 caracteres), grupo (máximo 20 caracteres), carrera (máximo 100 caracteres), materia (máximo 100 caracteres), tipo de actividad, uso de IA, herramienta utilizada (máximo 100 caracteres), aprendizajes (máximo 2000 caracteres), método de verificación (máximo 1000 caracteres) y marca de tiempo (fecha y hora en formato UTC con precisión de segundos)
4. THE API_Backend SHALL asociar cada Declaración al Curso correspondiente mediante el Código_de_Curso, aplicando integridad referencial de modo que no pueda existir una Declaración sin un Curso válido asociado
5. THE API_Backend SHALL asociar cada Curso al Docente propietario y a la Institución correspondiente mediante identificadores únicos, aplicando integridad referencial de modo que no pueda existir un Curso sin un Docente válido y una Institución válida asociados
6. WHEN un Docente solicita datos de un Curso, THE API_Backend SHALL verificar que el Docente es propietario del Curso y que el Curso pertenece a la misma Institución del Docente antes de retornar información
7. IF un Docente solicita datos de un Curso del cual no es propietario, THEN THE API_Backend SHALL denegar la solicitud retornando un error indicando acceso no autorizado, sin revelar si el Curso existe
8. IF se recibe una Declaración con un Código_de_Curso que no corresponde a ningún Curso existente en la Base_de_Datos, THEN THE API_Backend SHALL rechazar la Declaración retornando un error indicando que el curso no fue encontrado
9. THE API_Backend SHALL almacenar la membresía de Docentes en Instituciones con los campos: referencia al Docente, referencia a la Institución, rol (Administrador_Institución o Docente), y fecha de incorporación (fecha y hora en formato UTC)
10. THE API_Backend SHALL garantizar que las consultas de datos de un Docente retornen exclusivamente Cursos y Declaraciones creados por ese Docente, sin exponer datos de otros Docentes dentro de la misma Institución

### Requirement 5: Vista Histórica de Declaraciones para Docentes

**User Story:** Como docente, quiero consultar el historial completo de declaraciones de cada estudiante en mis cursos, para dar seguimiento a sus prácticas de uso de IA a lo largo del tiempo.

#### Acceptance Criteria

1. WHEN un Docente accede a la vista de un Curso, THE Plataforma SHALL mostrar una lista paginada de las Declaraciones recibidas ordenadas por fecha descendente, con un máximo de 25 Declaraciones por página y controles de navegación entre páginas
2. WHEN un Docente selecciona una Declaración de la lista, THE Plataforma SHALL mostrar todos los campos del formulario del Estudiante en una vista de detalle
3. WHEN un Docente ingresa al menos 2 caracteres en el campo de búsqueda por nombre o matrícula de Estudiante, THE Plataforma SHALL filtrar las Declaraciones cuyo nombre completo o matrícula contengan el texto ingresado sin distinguir mayúsculas de minúsculas
4. WHEN un Docente selecciona un Estudiante específico, THE Plataforma SHALL mostrar el historial completo de Declaraciones de ese Estudiante a través de todos los Cursos del Docente, ordenado por fecha descendente
5. WHEN un Docente solicita exportar Declaraciones, THE Plataforma SHALL generar un archivo CSV que contenga todas las Declaraciones visibles según los filtros activos; si no hay filtros activos, el archivo incluirá todas las Declaraciones del Curso actual
6. IF un Docente accede a la vista de un Curso que no tiene Declaraciones registradas, THEN THE Plataforma SHALL mostrar un mensaje indicando que no se han recibido Declaraciones para ese Curso

### Requirement 6: Dashboard de Analítica para Docentes

**User Story:** Como docente, quiero ver un panel visual con estadísticas sobre el uso de IA en mis cursos, para entender las tendencias y patrones de mis estudiantes.

#### Acceptance Criteria

1. WHEN un Docente accede al Dashboard, THE Plataforma SHALL mostrar el número total de Declaraciones recibidas, el número de Estudiantes que declararon usar IA y el número que declaró no usarla
2. WHEN un Docente accede al Dashboard, THE Plataforma SHALL mostrar un gráfico de barras con las 10 herramientas de IA más utilizadas por los Estudiantes, ordenadas de mayor a menor frecuencia
3. WHEN un Docente accede al Dashboard, THE Plataforma SHALL mostrar la cantidad de Declaraciones recibidas por Curso
4. WHEN un Docente selecciona un Curso en el Dashboard, THE Plataforma SHALL filtrar todas las estadísticas para mostrar solo datos de ese Curso
5. WHEN un Docente accede al Dashboard, THE Plataforma SHALL mostrar un indicador del progreso de entregas calculado como el porcentaje de Declaraciones recibidas respecto al número esperado de estudiantes configurado por el Docente para cada Curso
6. WHEN un Docente accede o refresca el Dashboard, THE Plataforma SHALL consultar los datos actualizados de la Base_de_Datos y renderizar las estadísticas con la información más reciente
7. THE Plataforma SHALL mostrar en el Dashboard únicamente datos de los Cursos del Docente autenticado, sin incluir información de Cursos de otros Docentes
8. IF un Docente accede al Dashboard sin tener Cursos creados o sin Declaraciones registradas, THEN THE Plataforma SHALL mostrar un mensaje indicando que aún no hay datos disponibles con una guía para crear su primer Curso

### Requirement 7: Integración con Asistente de IA para Docentes

**User Story:** Como docente, quiero poder configurar una API key de un modelo de lenguaje y usarlo para consultar, resumir y analizar las declaraciones de mis estudiantes, para obtener insights de forma rápida y eficiente.

#### Acceptance Criteria

1. WHEN un Docente accede a la configuración del Asistente_IA, THE Plataforma SHALL permitir seleccionar un proveedor (Gemini, Claude, Grok, Nvidia, Ollama) e ingresar la API key correspondiente, con un máximo de 256 caracteres para el campo de API key
2. WHEN un Docente guarda la configuración del Asistente_IA exitosamente, THE Plataforma SHALL almacenar la API key de forma cifrada en la Base_de_Datos y mostrar una confirmación visible indicando que la configuración fue guardada
3. WHILE un Docente tiene configurado el Asistente_IA, THE Plataforma SHALL mostrar una interfaz de chat accesible desde el Dashboard
4. WHEN un Docente envía una consulta al Asistente_IA con un máximo de 2000 caracteres, THE Plataforma SHALL incluir como contexto las Declaraciones de los Cursos del Docente y retornar la respuesta del modelo de lenguaje dentro de un plazo máximo de 30 segundos
5. WHEN un Docente solicita un resumen de un Curso al Asistente_IA, THE Plataforma SHALL generar un resumen que incluya: cantidad de hallazgos reportados por los Estudiantes, las 5 herramientas de IA más declaradas por frecuencia de uso, y la proporción de declaraciones verificadas versus no verificadas
6. IF la API key configurada es inválida, el servicio del proveedor no responde dentro de 30 segundos, o el proveedor retorna un error de límite de uso o cuota excedida, THEN THE Plataforma SHALL mostrar un mensaje de error indicando la causa específica del fallo (key inválida, timeout, o cuota excedida) e indicar al Docente verificar su configuración o intentar más tarde
7. THE Plataforma SHALL enviar al proveedor de IA solo datos de los Cursos del Docente autenticado, sin incluir datos de otros Docentes
8. IF un Docente envía una consulta que excede 2000 caracteres, THEN THE Plataforma SHALL rechazar el envío e indicar al Docente que reduzca la longitud de su consulta

### Requirement 8: API Backend y Arquitectura del Servidor

**User Story:** Como desarrollador, quiero una API REST que conecte el frontend con la base de datos y servicios externos, para soportar todas las funcionalidades de la plataforma de forma segura y escalable.

#### Acceptance Criteria

1. THE API_Backend SHALL exponer endpoints REST con formato JSON para todas las operaciones de creación, lectura, actualización y eliminación de Cursos y Declaraciones, diferenciando entre endpoints públicos (acceso de Estudiantes mediante Código_de_Curso) y endpoints protegidos (operaciones de Docentes que requieren autenticación)
2. THE API_Backend SHALL validar todos los datos de entrada verificando tipos, longitudes máximas (máximo 255 caracteres para campos de texto corto, máximo 2000 caracteres para campos de texto largo como aprendizajes y método de verificación) y campos obligatorios antes de persistir en la Base_de_Datos
3. THE API_Backend SHALL autenticar las solicitudes de Docentes en endpoints protegidos mediante tokens JWT con una expiración por defecto de 24 horas, configurable por el administrador del sistema dentro de un rango de 1 a 168 horas
4. IF una solicitud no incluye token de autenticación válido para endpoints protegidos, THEN THE API_Backend SHALL retornar un código de estado 401 con un mensaje de error indicando que la autenticación es requerida, sin revelar detalles internos del sistema
5. THE API_Backend SHALL sanitizar todos los datos de entrada mediante consultas parametrizadas para prevenir inyección SQL y escapado de caracteres HTML para prevenir ataques XSS
6. WHEN un endpoint recibe una solicitud con datos inválidos, THE API_Backend SHALL retornar un código de estado 400 con un mensaje que indique los campos con error y el tipo de validación que falló para cada campo
7. IF la Base_de_Datos o un servicio externo no está disponible al procesar una solicitud, THEN THE API_Backend SHALL retornar un código de estado 503 con un mensaje de error indicando que el servicio no está disponible temporalmente
8. THE API_Backend SHALL responder a las solicitudes en un tiempo máximo de 5 segundos bajo condiciones normales de operación, excluyendo llamadas a proveedores externos de IA
9. THE API_Backend SHALL limitar las solicitudes de los endpoints públicos a un máximo de 60 solicitudes por minuto por dirección IP, retornando un código de estado 429 cuando se exceda el límite

### Requirement 9: Migración y Compatibilidad con el Flujo Existente

**User Story:** Como usuario actual de la plataforma, quiero que el flujo básico de crear un curso y enviar una declaración siga funcionando de forma familiar, para no perder la simplicidad que ya conozco.

#### Acceptance Criteria

1. THE Plataforma SHALL mantener el flujo de acceso del Estudiante mediante Código_de_Curso de 6 caracteres alfanuméricos o enlace compartido con parámetro de query string, sin requerir creación de cuenta por parte del Estudiante
2. THE Plataforma SHALL generar un PDF de la Declaración que contenga los mismos campos que la versión actual: título "Declaración de Uso de Inteligencia Artificial", curso, docente, estudiante, uso de IA, herramienta utilizada, fecha, qué aprendió y cómo verificó la respuesta
3. THE Plataforma SHALL mantener la compatibilidad con la integración EmailJS existente, enviando los mismos parámetros de plantilla: to_email, to_name, course_name, student_name, student_email, used_ai, tool_used, what_learned, how_verified, submitted_at
4. WHEN la Plataforma se despliega por primera vez con la Base_de_Datos vacía, THE Plataforma SHALL crear las tablas necesarias automáticamente y funcionar correctamente sin requerir datos previos migrados
5. THE Plataforma SHALL mantener el idioma español como idioma principal de toda la interfaz de usuario, incluyendo mensajes de error, etiquetas de formulario y textos informativos
6. IF la Base_de_Datos no está disponible al momento del envío de una Declaración, THEN THE Plataforma SHALL informar al Estudiante que el servicio no está disponible temporalmente y sugerir intentar de nuevo más tarde

### Requirement 10: Gestión Multi-Institución

**User Story:** Como docente, quiero crear o unirme a una institución educativa dentro de la plataforma, para organizar mi trabajo bajo el contexto de mi escuela o universidad manteniendo la privacidad de mis cursos y datos respecto a otros docentes.

#### Acceptance Criteria

1. WHEN un Docente autenticado solicita crear una nueva Institución proporcionando un nombre (máximo 200 caracteres), THE Plataforma SHALL crear la Institución en la Base_de_Datos y asignar al Docente el rol de Administrador_Institución
2. WHEN un Administrador_Institución solicita generar un Código_de_Invitación, THE Plataforma SHALL generar un código alfanumérico único de 8 caracteres con una validez configurable entre 1 y 30 días y un máximo de usos configurable entre 1 y 100
3. WHEN un Docente autenticado proporciona un Código_de_Invitación válido y no expirado, THE Plataforma SHALL asociar al Docente como miembro de la Institución correspondiente con rol de Docente
4. IF un Docente proporciona un Código_de_Invitación expirado, ya utilizado el número máximo de veces, o que no existe en la Base_de_Datos, THEN THE Plataforma SHALL mostrar un mensaje de error indicando que el código de invitación no es válido o ha expirado
5. THE Plataforma SHALL garantizar que cada Docente solo pueda acceder a los Cursos y Declaraciones que el mismo Docente creó, sin visibilidad sobre los Cursos, Declaraciones ni datos de otros Docentes dentro de la misma Institución
6. WHEN un Docente crea un Curso, THE Plataforma SHALL asociar el Curso a la Institución activa del Docente y al Docente como propietario exclusivo
7. WHILE un Docente navega el Dashboard, la lista de Cursos o el Asistente_IA, THE Plataforma SHALL mostrar únicamente los datos que pertenecen a ese Docente dentro de su Institución activa
8. WHEN un Administrador_Institución accede al panel de administración de la Institución, THE Plataforma SHALL mostrar la lista de Docentes miembros con nombre, correo y fecha de incorporación, sin exponer los Cursos, Declaraciones ni datos académicos de cada Docente
9. IF un Docente intenta acceder a un recurso (Curso, Declaración o configuración) que pertenece a otro Docente dentro de la misma Institución, THEN THE API_Backend SHALL denegar la solicitud retornando un error de acceso no autorizado
10. WHEN un Administrador_Institución solicita revocar la membresía de un Docente, THE Plataforma SHALL solicitar confirmación y, al confirmarla, desasociar al Docente de la Institución; los Cursos y Declaraciones creados por ese Docente permanecerán en la Base_de_Datos pero no serán accesibles hasta que el Docente se reincorpore
11. THE Plataforma SHALL soportar múltiples Instituciones de forma aislada, de modo que los datos de una Institución no sean accesibles desde otra Institución bajo ninguna circunstancia
12. IF un Docente no pertenece a ninguna Institución, THEN THE Plataforma SHALL solicitar al Docente que cree una nueva Institución o se una a una existente antes de permitir la creación de Cursos o el acceso al Dashboard
