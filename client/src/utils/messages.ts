/**
 * Constantes de texto centralizadas para toda la interfaz de usuario.
 * Todas las cadenas están en español según el requisito 9.5.
 *
 * Organización:
 * - ERRORES: Mensajes de error por categoría HTTP / dominio
 * - AUTH: Etiquetas y mensajes de autenticación
 * - CURSOS: Etiquetas y mensajes de gestión de cursos
 * - DECLARACION: Formulario del estudiante
 * - DASHBOARD: Panel de analítica
 * - IA: Asistente y configuración de IA
 * - INSTITUCION: Gestión multi-institución
 * - GENERAL: Botones, estados y elementos comunes
 */

// ─── Mensajes de Error por Código HTTP ────────────────────────────────────────

export const ERRORES = {
  /** 400 — Datos inválidos */
  VALIDACION: 'Los datos enviados contienen errores.',

  /** 401 — No autenticado */
  AUTH_REQUERIDA: 'Debe iniciar sesión para acceder a esta funcionalidad.',

  /** 403 — Sin permisos */
  ACCESO_DENEGADO: 'No tiene permiso para acceder a este recurso.',

  /** 403 — Cuenta bloqueada */
  CUENTA_BLOQUEADA: 'Cuenta bloqueada. Intente de nuevo en 15 minutos.',

  /** 404 — Recurso no encontrado */
  NO_ENCONTRADO: 'El recurso solicitado no fue encontrado.',

  /** 429 — Demasiadas solicitudes */
  LIMITE_EXCEDIDO: 'Ha realizado demasiadas solicitudes. Intente de nuevo más tarde.',

  /** 503 — Servicio no disponible */
  SERVICIO_NO_DISPONIBLE: 'El servicio no está disponible temporalmente. Intente de nuevo más tarde.',

  /** Conexión fallida */
  CONEXION: 'Error de conexión. Intente de nuevo más tarde.',

  /** Credenciales incorrectas (genérico — no revela qué campo falló) */
  CREDENCIALES_INVALIDAS: 'Credenciales incorrectas.',

  /** Email ya registrado */
  EMAIL_DUPLICADO: 'El correo electrónico ya se encuentra registrado.',

  /** Código de curso no encontrado */
  CURSO_NO_ENCONTRADO: 'No se encontró un curso con ese código.',

  /** Código de invitación inválido */
  INVITACION_INVALIDA: 'El código de invitación no es válido o ha expirado.',

  /** Error genérico inesperado */
  GENERICO: 'Ocurrió un error inesperado. Intente de nuevo.',
} as const;

// ─── IA — Errores específicos ─────────────────────────────────────────────────

export const ERRORES_IA = {
  KEY_INVALIDA: 'La API key proporcionada no es válida. Verifique su configuración.',
  TIMEOUT: 'El proveedor de IA no respondió a tiempo. Intente de nuevo más tarde.',
  CUOTA_EXCEDIDA: 'Se ha excedido la cuota del proveedor de IA. Verifique su plan o intente más tarde.',
  SIN_CONFIGURACION: 'No tiene configurado un proveedor de IA. Configure uno desde el panel de configuración.',
  CONSULTA_MUY_LARGA: 'La consulta no puede exceder 2000 caracteres.',
  KEY_MUY_LARGA: 'La API key no puede exceder 256 caracteres.',
} as const;

// ─── Autenticación ────────────────────────────────────────────────────────────

export const AUTH = {
  // Títulos
  TITULO_LOGIN: 'Iniciar Sesión',
  TITULO_REGISTRO: 'Registrarse',
  TITULO_RECUPERAR: 'Recuperar Contraseña',
  TITULO_RESTABLECER: 'Restablecer Contraseña',
  TITULO_RESTABLECIDA: 'Contraseña Restablecida',

  // Subtítulos
  SUBTITULO_LOGIN: 'Ingrese sus credenciales para acceder a la plataforma IATA.',
  SUBTITULO_REGISTRO: 'Cree su cuenta de docente para acceder a la plataforma IATA.',
  SUBTITULO_RESTABLECER: 'Ingrese su nueva contraseña. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.',

  // Etiquetas de campos
  LABEL_EMAIL: 'Correo electrónico',
  LABEL_PASSWORD: 'Contraseña',
  LABEL_NOMBRE: 'Nombre completo',
  LABEL_NUEVA_PASSWORD: 'Nueva contraseña',
  LABEL_CONFIRMAR_PASSWORD: 'Confirmar contraseña',

  // Placeholders
  PLACEHOLDER_EMAIL: 'correo@ejemplo.com',

  // Hints
  HINT_PASSWORD: 'Mínimo 8 caracteres, con mayúscula, minúscula y número.',

  // Botones
  BTN_LOGIN: 'Iniciar Sesión',
  BTN_LOGIN_CARGANDO: 'Ingresando...',
  BTN_REGISTRO: 'Crear Cuenta',
  BTN_REGISTRO_CARGANDO: 'Registrando...',
  BTN_RESTABLECER: 'Restablecer contraseña',
  BTN_RESTABLECER_CARGANDO: 'Restableciendo...',

  // Links / footer
  LINK_NO_CUENTA: '¿No tiene cuenta?',
  LINK_YA_CUENTA: '¿Ya tiene cuenta?',
  LINK_OLVIDO_PASSWORD: '¿Olvidó su contraseña?',
  LINK_IR_LOGIN: 'Ir al inicio de sesión',
  LINK_VOLVER_LOGIN: 'Volver al inicio de sesión',

  // Éxito
  PASSWORD_RESTABLECIDA: 'Su contraseña ha sido restablecida exitosamente. Ahora puede iniciar sesión con su nueva contraseña.',
  PASSWORD_NO_COINCIDE: 'Las contraseñas no coinciden.',
  TOKEN_INVALIDO: 'Token de restablecimiento no válido.',
  ENLACE_EXPIRADO: 'No se pudo restablecer la contraseña. El enlace puede haber expirado o ya fue utilizado.',

  // Institución en registro
  LABEL_INSTITUCION: 'Institución',
  OPCION_CREAR_INSTITUCION: 'Crear nueva institución',
  OPCION_UNIRSE_INSTITUCION: 'Unirse con código de invitación',
  LABEL_NOMBRE_INSTITUCION: 'Nombre de la institución',
  LABEL_CODIGO_INVITACION: 'Código de invitación',
} as const;

// ─── Cursos ───────────────────────────────────────────────────────────────────

export const CURSOS = {
  // Títulos
  TITULO_LISTA: 'Mis Cursos',
  TITULO_CREAR: 'Crear Curso',
  TITULO_EDITAR: 'Editar Curso',

  // Etiquetas
  LABEL_NOMBRE: 'Nombre del curso',
  LABEL_DOCENTE: 'Nombre del docente',
  LABEL_EMAIL: 'Correo del docente',
  LABEL_ESTUDIANTES_ESPERADOS: 'Estudiantes esperados (opcional)',
  LABEL_EMAILJS: 'Habilitar notificaciones por EmailJS',
  LABEL_SERVICE_ID: 'Service ID',
  LABEL_TEMPLATE_ID: 'Template ID',
  LABEL_PUBLIC_KEY: 'Public Key',
  LABEL_ENLACE: 'Enlace compartible',

  // Botones
  BTN_CREAR: 'Crear Curso',
  BTN_CREAR_CARGANDO: 'Creando...',
  BTN_GUARDAR: 'Guardar Cambios',
  BTN_GUARDAR_CARGANDO: 'Guardando...',
  BTN_NUEVO: 'Crear Nuevo Curso',
  BTN_EDITAR: 'Editar',
  BTN_ELIMINAR: 'Eliminar',
  BTN_VOLVER: 'Volver a Cursos',
  BTN_CANCELAR: 'Cancelar',

  // Estados
  CARGANDO: 'Cargando cursos...',
  CARGANDO_CURSO: 'Cargando curso...',
  SIN_CURSOS: 'No tiene cursos creados aún.',
  SIN_CURSOS_GUIA: 'Cree su primer curso para comenzar a recibir declaraciones de sus estudiantes.',
  DECLARACIONES_PLACEHOLDER: 'Las declaraciones de este curso se mostrarán aquí.',

  // Confirmación de eliminación
  CONFIRMAR_ELIMINAR: '¿Está seguro de que desea eliminar el curso',
  CONFIRMAR_ELIMINAR_DETALLE: 'Se eliminarán todas las declaraciones asociadas.',
  BTN_CONFIRMAR: 'Confirmar',
  BTN_ELIMINANDO: 'Eliminando...',

  // Errores específicos
  ERROR_CARGAR: 'Error al cargar los cursos. Intente de nuevo más tarde.',
  ERROR_ELIMINAR: 'Error al eliminar el curso.',
  ERROR_CARGAR_DATOS: 'Error al cargar los datos del curso.',
  CURSO_NO_ENCONTRADO: 'Curso no encontrado.',

  // EmailJS
  EMAILJS_TITULO: 'Configuración de EmailJS',
  EMAILJS_SERVICE_REQUERIDO: 'El Service ID es obligatorio cuando EmailJS está habilitado.',
  EMAILJS_TEMPLATE_REQUERIDO: 'El Template ID es obligatorio cuando EmailJS está habilitado.',
  EMAILJS_KEY_REQUERIDA: 'La Public Key es obligatoria cuando EmailJS está habilitado.',
  EMAILJS_CONFIGURADO: 'Configurado',
} as const;

// ─── Declaración del Estudiante ───────────────────────────────────────────────

export const DECLARACION = {
  // Título
  TITULO: 'Declaración de Uso de Inteligencia Artificial',

  // Etiquetas
  LABEL_MATRICULA: 'Matrícula',
  LABEL_NOMBRE: 'Nombre completo',
  LABEL_GRUPO: 'Grupo',
  LABEL_CARRERA: 'Carrera',
  LABEL_MATERIA: 'Materia',
  LABEL_TIPO_ACTIVIDAD: 'Tipo de actividad',
  LABEL_USO_IA: '¿Usó inteligencia artificial?',
  LABEL_HERRAMIENTA: 'Herramienta de IA utilizada',
  LABEL_APRENDIZAJES: 'Hallazgos o aprendizajes obtenidos con apoyo de la IA',
  LABEL_VERIFICACION: '¿Cómo verificó la información proporcionada por la IA?',

  // Opciones
  OPCION_SELECCIONE: '— Seleccione —',
  OPCION_TAREA: 'Tarea',
  OPCION_PROYECTO: 'Proyecto',
  OPCION_SI: 'Sí',
  OPCION_NO: 'No',

  // Botones
  BTN_ENVIAR: 'Enviar Declaración',
  BTN_ENVIAR_CARGANDO: 'Enviando...',

  // Estados
  CARGANDO_CURSO: 'Cargando información del curso...',
  SIN_CODIGO: 'No se proporcionó un código de curso.',
  ERROR_CARGAR_CURSO: 'Error al cargar la información del curso. Intente de nuevo más tarde.',

  // Éxito
  EXITO_TITULO: 'Declaración Enviada',
  EXITO_MENSAJE: 'Tu declaración ha sido registrada exitosamente.',
  SIN_DATOS: 'No se encontraron datos de la declaración.',
  BTN_PDF: 'Descargar PDF',
  BTN_VOLVER_INICIO: 'Volver al inicio',
  BTN_VOLVER_FORMULARIO: 'Volver al formulario',
} as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const DASHBOARD = {
  TITULO: 'Panel de Analítica',
  SIN_DATOS: 'Aún no hay datos disponibles.',
  SIN_DATOS_GUIA: 'Cree su primer curso para comenzar a visualizar estadísticas.',
  TOTAL_DECLARACIONES: 'Total de declaraciones',
  USO_IA_SI: 'Usaron IA',
  USO_IA_NO: 'No usaron IA',
  TOP_HERRAMIENTAS: 'Herramientas de IA más utilizadas',
  DECLARACIONES_POR_CURSO: 'Declaraciones por curso',
  PROGRESO_ENTREGAS: 'Progreso de entregas',
  FILTRAR_POR_CURSO: 'Filtrar por curso',
  TODOS_CURSOS: 'Todos los cursos',
} as const;

// ─── Asistente IA ─────────────────────────────────────────────────────────────

export const IA = {
  TITULO_ASISTENTE: 'Asistente IA',
  TITULO_CONFIG: 'Configuración del Asistente IA',
  PLACEHOLDER_ASISTENTE: 'Interfaz de chat con IA (por implementar).',

  // Configuración
  LABEL_PROVEEDOR: 'Proveedor de IA',
  LABEL_API_KEY: 'API Key',
  PLACEHOLDER_API_KEY: 'Ingrese su API key',
  BTN_GUARDAR: 'Guardar Configuración',
  BTN_GUARDANDO: 'Guardando...',
  CONFIG_ACTUAL: 'Configuración actual:',
  CONFIG_PROVEEDOR: 'Proveedor',
  CONFIG_KEY: 'API key configurada (••••••••).',
  CONFIG_GUARDADA: 'Configuración guardada exitosamente.',
  CARGANDO_CONFIG: 'Cargando configuración...',
  ERROR_CARGAR_CONFIG: 'Error al cargar la configuración actual.',
  ERROR_GUARDAR_CONFIG: 'Error al guardar la configuración.',
  KEY_REQUERIDA: 'Debe ingresar una API key.',
} as const;

// ─── Institución ──────────────────────────────────────────────────────────────

export const INSTITUCION = {
  TITULO: 'Institución',
  PLACEHOLDER: 'Panel de administración de la institución (por implementar).',
  SIN_INSTITUCION: 'No pertenece a ninguna institución. Cree una nueva o únase con un código de invitación.',

  // Miembros
  LABEL_MIEMBROS: 'Miembros',
  LABEL_NOMBRE: 'Nombre',
  LABEL_EMAIL: 'Correo',
  LABEL_FECHA_INCORPORACION: 'Fecha de incorporación',
  LABEL_ROL: 'Rol',
  ROL_ADMIN: 'Administrador',
  ROL_MIEMBRO: 'Miembro',

  // Invitaciones
  TITULO_INVITACIONES: 'Códigos de Invitación',
  BTN_GENERAR_CODIGO: 'Generar Código',
  LABEL_MAX_USOS: 'Máximo de usos',
  LABEL_VALIDEZ_DIAS: 'Validez (días)',
  CODIGO_GENERADO: 'Código generado:',

  // Acciones
  BTN_REVOCAR: 'Revocar membresía',
  CONFIRMAR_REVOCAR: '¿Está seguro de que desea revocar la membresía de este docente?',
} as const;

// ─── Página de Inicio ─────────────────────────────────────────────────────────

export const HOME = {
  TITULO: 'IATA',
  SUBTITULO: 'Instrumento Abierto de Transparencia Académica',
  DESCRIPCION: 'Plataforma para la declaración de uso de inteligencia artificial en actividades académicas.',

  // Sección estudiantes
  ESTUDIANTES_TITULO: 'Estudiantes',
  ESTUDIANTES_DESC: 'Ingresa el código de curso proporcionado por tu docente para enviar tu declaración.',
  LABEL_CODIGO_CURSO: 'Código de curso',
  PLACEHOLDER_CODIGO: 'Ej: ABC123',
  BTN_ACCEDER: 'Acceder al formulario',

  // Sección docentes
  DOCENTES_TITULO: 'Docentes',
  DOCENTES_DESC: 'Gestione sus cursos, consulte declaraciones y acceda al panel de analítica.',
} as const;

// ─── Validación — Mensajes de campos ──────────────────────────────────────────

export const VALIDACION = {
  CAMPO_OBLIGATORIO: 'Este campo es obligatorio.',
  EMAIL_INVALIDO: 'El correo electrónico no tiene un formato válido.',
  PASSWORD_MIN_LENGTH: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_MAYUSCULA: 'La contraseña debe contener al menos una letra mayúscula.',
  PASSWORD_MINUSCULA: 'La contraseña debe contener al menos una letra minúscula.',
  PASSWORD_NUMERO: 'La contraseña debe contener al menos un número.',
  PASSWORD_OBLIGATORIA: 'La contraseña es obligatoria.',
  NOMBRE_OBLIGATORIO: 'El nombre es obligatorio.',
  NOMBRE_MAX_LENGTH: 'El nombre no debe exceder 100 caracteres.',
  CODIGO_CURSO_INVALIDO: 'El código debe ser de 6 caracteres alfanuméricos (A-Z, 0-9).',
  CODIGO_CURSO_VACIO: 'Ingrese un código de curso.',
  CODIGO_INVITACION_OBLIGATORIO: 'El código de invitación es obligatorio.',
  CODIGO_INVITACION_FORMATO: 'El código debe ser de 8 caracteres alfanuméricos.',
  INSTITUCION_NOMBRE_OBLIGATORIO: 'El nombre de la institución es obligatorio.',
  ESTUDIANTES_NUMERICO: 'El número esperado de estudiantes debe ser un valor numérico.',
} as const;

// ─── General / Común ──────────────────────────────────────────────────────────

export const GENERAL = {
  CARGANDO: 'Cargando...',
  GUARDANDO: 'Guardando...',
  CANCELAR: 'Cancelar',
  CONFIRMAR: 'Confirmar',
  VOLVER: 'Volver',
  CERRAR: 'Cerrar',
  BUSCAR: 'Buscar',
  EXPORTAR: 'Exportar',
  EXPORTAR_CSV: 'Exportar CSV',
  SIGUIENTE: 'Siguiente',
  ANTERIOR: 'Anterior',
  PAGINA: 'Página',
  DE: 'de',
  OBLIGATORIO: '*',
  SI: 'Sí',
  NO: 'No',
  CERRAR_SESION: 'Cerrar sesión',
  PLATAFORMA_NOMBRE: 'IATA',
  PLATAFORMA_COMPLETO: 'Instrumento Abierto de Transparencia Académica',
} as const;

// ─── Declaraciones — Vista de listado para docentes ───────────────────────────

export const DECLARACIONES = {
  TITULO: 'Declaraciones',
  BUSCAR_PLACEHOLDER: 'Buscar por nombre o matrícula...',
  SIN_DECLARACIONES: 'No se han recibido declaraciones para este curso.',
  SIN_RESULTADOS: 'No se encontraron declaraciones que coincidan con la búsqueda.',
  EXPORTAR_CSV: 'Exportar CSV',
  COLUMNA_ESTUDIANTE: 'Estudiante',
  COLUMNA_MATRICULA: 'Matrícula',
  COLUMNA_GRUPO: 'Grupo',
  COLUMNA_ACTIVIDAD: 'Actividad',
  COLUMNA_USO_IA: 'Usó IA',
  COLUMNA_FECHA: 'Fecha',
  DETALLE_TITULO: 'Detalle de Declaración',
} as const;

// ─── PDF ──────────────────────────────────────────────────────────────────────

export const PDF = {
  TITULO: 'Declaración de Uso de Inteligencia Artificial',
  FOOTER: 'IATA — Instrumento Abierto de Transparencia Académica',
  CAMPO_CURSO: 'Curso',
  CAMPO_DOCENTE: 'Docente',
  CAMPO_ESTUDIANTE: 'Estudiante',
  CAMPO_MATRICULA: 'Matrícula',
  CAMPO_GRUPO: 'Grupo',
  CAMPO_CARRERA: 'Carrera',
  CAMPO_MATERIA: 'Materia',
  CAMPO_ACTIVIDAD: 'Actividad',
  CAMPO_USO_IA: '¿Usó IA?',
  CAMPO_HERRAMIENTA: 'Herramienta',
  CAMPO_APRENDIZAJES: 'Qué aprendió',
  CAMPO_VERIFICACION: 'Cómo verificó',
  CAMPO_FECHA: 'Fecha',
  VALOR_NO_APLICA: 'N/A',
} as const;
