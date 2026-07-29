/**
 * Shared validation rules and functions for the IATA platform.
 * Used by both frontend and backend to ensure consistent validation.
 */
// ─── Validation Rules (constants) ────────────────────────────────────────────
export const VALIDATION_RULES = {
    email: {
        maxLength: 254,
        // RFC 5322 simplified pattern — covers standard email formats
        pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    },
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        uppercasePattern: /[A-Z]/,
        lowercasePattern: /[a-z]/,
        numberPattern: /[0-9]/,
    },
    course: {
        name: { maxLength: 150, required: true },
        teacherName: { maxLength: 100, required: true },
        teacherEmail: { maxLength: 254, required: true },
        codeLength: 6,
        codePattern: /^[A-Z0-9]{6}$/,
        expectedStudents: { min: 0 },
    },
    declaration: {
        studentIdNumber: { maxLength: 20, required: true, pattern: /^[a-zA-Z0-9]+$/ },
        studentName: { maxLength: 100, required: true },
        studentGroup: { maxLength: 20, required: true },
        career: { maxLength: 100, required: true },
        subject: { maxLength: 100, required: true },
        activityType: { required: true, allowedValues: ['tarea', 'proyecto'] },
        aiTool: { maxLength: 100 },
        learnings: { maxLength: 2000 },
        verificationMethod: { maxLength: 1000 },
    },
    institution: {
        name: { maxLength: 200, required: true },
    },
    inviteCode: {
        codeLength: 8,
        codePattern: /^[a-zA-Z0-9]{8}$/,
        minValidityDays: 1,
        maxValidityDays: 30,
        minMaxUses: 1,
        maxMaxUses: 100,
    },
    ai: {
        apiKeyMaxLength: 256,
        queryMaxLength: 2000,
    },
};
// ─── Validation Functions ────────────────────────────────────────────────────
/**
 * Validates an email address against RFC 5322 format and max length.
 */
export function validateEmail(email) {
    const errors = [];
    if (email === undefined || email === null || email === '') {
        errors.push({
            field: 'email',
            rule: 'required',
            message: 'El correo electrónico es obligatorio.',
        });
        return { valid: false, errors };
    }
    if (typeof email !== 'string') {
        errors.push({
            field: 'email',
            rule: 'type',
            message: 'El correo electrónico debe ser una cadena de texto.',
        });
        return { valid: false, errors };
    }
    if (email.length > VALIDATION_RULES.email.maxLength) {
        errors.push({
            field: 'email',
            rule: 'maxLength',
            message: `El correo electrónico no debe exceder ${VALIDATION_RULES.email.maxLength} caracteres.`,
        });
    }
    if (!VALIDATION_RULES.email.pattern.test(email)) {
        errors.push({
            field: 'email',
            rule: 'format',
            message: 'El correo electrónico no tiene un formato válido.',
        });
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validates a password against minimum length and complexity rules.
 */
export function validatePassword(password) {
    const errors = [];
    if (password === undefined || password === null || password === '') {
        errors.push({
            field: 'password',
            rule: 'required',
            message: 'La contraseña es obligatoria.',
        });
        return { valid: false, errors };
    }
    if (typeof password !== 'string') {
        errors.push({
            field: 'password',
            rule: 'type',
            message: 'La contraseña debe ser una cadena de texto.',
        });
        return { valid: false, errors };
    }
    if (password.length < VALIDATION_RULES.password.minLength) {
        errors.push({
            field: 'password',
            rule: 'minLength',
            message: `La contraseña debe tener al menos ${VALIDATION_RULES.password.minLength} caracteres.`,
        });
    }
    if (!VALIDATION_RULES.password.uppercasePattern.test(password)) {
        errors.push({
            field: 'password',
            rule: 'uppercase',
            message: 'La contraseña debe contener al menos una letra mayúscula.',
        });
    }
    if (!VALIDATION_RULES.password.lowercasePattern.test(password)) {
        errors.push({
            field: 'password',
            rule: 'lowercase',
            message: 'La contraseña debe contener al menos una letra minúscula.',
        });
    }
    if (!VALIDATION_RULES.password.numberPattern.test(password)) {
        errors.push({
            field: 'password',
            rule: 'number',
            message: 'La contraseña debe contener al menos un número.',
        });
    }
    return { valid: errors.length === 0, errors };
}
export function validateCourseFields(data) {
    const errors = [];
    // Name validation
    if (!data.name || (typeof data.name === 'string' && data.name.trim() === '')) {
        errors.push({
            field: 'name',
            rule: 'required',
            message: 'El nombre del curso es obligatorio.',
        });
    }
    else if (typeof data.name !== 'string') {
        errors.push({
            field: 'name',
            rule: 'type',
            message: 'El nombre del curso debe ser una cadena de texto.',
        });
    }
    else if (data.name.length > VALIDATION_RULES.course.name.maxLength) {
        errors.push({
            field: 'name',
            rule: 'maxLength',
            message: `El nombre del curso no debe exceder ${VALIDATION_RULES.course.name.maxLength} caracteres.`,
        });
    }
    // Teacher name validation
    if (!data.teacherName || (typeof data.teacherName === 'string' && data.teacherName.trim() === '')) {
        errors.push({
            field: 'teacherName',
            rule: 'required',
            message: 'El nombre del docente es obligatorio.',
        });
    }
    else if (typeof data.teacherName !== 'string') {
        errors.push({
            field: 'teacherName',
            rule: 'type',
            message: 'El nombre del docente debe ser una cadena de texto.',
        });
    }
    else if (data.teacherName.length > VALIDATION_RULES.course.teacherName.maxLength) {
        errors.push({
            field: 'teacherName',
            rule: 'maxLength',
            message: `El nombre del docente no debe exceder ${VALIDATION_RULES.course.teacherName.maxLength} caracteres.`,
        });
    }
    // Teacher email validation
    if (!data.teacherEmail || (typeof data.teacherEmail === 'string' && data.teacherEmail.trim() === '')) {
        errors.push({
            field: 'teacherEmail',
            rule: 'required',
            message: 'El correo del docente es obligatorio.',
        });
    }
    else {
        const emailResult = validateEmail(data.teacherEmail);
        if (!emailResult.valid) {
            errors.push(...emailResult.errors.map((e) => ({ ...e, field: 'teacherEmail' })));
        }
    }
    // Expected students validation (optional but must be non-negative if provided)
    if (data.expectedStudents !== undefined && data.expectedStudents !== null) {
        if (typeof data.expectedStudents !== 'number' || !Number.isInteger(data.expectedStudents)) {
            errors.push({
                field: 'expectedStudents',
                rule: 'type',
                message: 'El número esperado de estudiantes debe ser un entero.',
            });
        }
        else if (data.expectedStudents < 0) {
            errors.push({
                field: 'expectedStudents',
                rule: 'min',
                message: 'El número esperado de estudiantes no puede ser negativo.',
            });
        }
    }
    return { valid: errors.length === 0, errors };
}
export function validateDeclarationFields(data) {
    const errors = [];
    const rules = VALIDATION_RULES.declaration;
    // Student ID number (matrícula)
    if (!data.studentIdNumber || (typeof data.studentIdNumber === 'string' && data.studentIdNumber.trim() === '')) {
        errors.push({
            field: 'studentIdNumber',
            rule: 'required',
            message: 'La matrícula es obligatoria.',
        });
    }
    else if (typeof data.studentIdNumber !== 'string') {
        errors.push({
            field: 'studentIdNumber',
            rule: 'type',
            message: 'La matrícula debe ser una cadena de texto.',
        });
    }
    else {
        if (data.studentIdNumber.length > rules.studentIdNumber.maxLength) {
            errors.push({
                field: 'studentIdNumber',
                rule: 'maxLength',
                message: `La matrícula no debe exceder ${rules.studentIdNumber.maxLength} caracteres.`,
            });
        }
        if (!rules.studentIdNumber.pattern.test(data.studentIdNumber)) {
            errors.push({
                field: 'studentIdNumber',
                rule: 'pattern',
                message: 'La matrícula solo puede contener caracteres alfanuméricos.',
            });
        }
    }
    // Student name
    validateRequiredString(data.studentName, 'studentName', 'nombre completo', rules.studentName.maxLength, errors);
    // Student group
    validateRequiredString(data.studentGroup, 'studentGroup', 'grupo', rules.studentGroup.maxLength, errors);
    // Career
    validateRequiredString(data.career, 'career', 'carrera', rules.career.maxLength, errors);
    // Subject
    validateRequiredString(data.subject, 'subject', 'materia', rules.subject.maxLength, errors);
    // Activity type
    if (!data.activityType || (typeof data.activityType === 'string' && data.activityType.trim() === '')) {
        errors.push({
            field: 'activityType',
            rule: 'required',
            message: 'El tipo de actividad es obligatorio.',
        });
    }
    else if (typeof data.activityType !== 'string') {
        errors.push({
            field: 'activityType',
            rule: 'type',
            message: 'El tipo de actividad debe ser una cadena de texto.',
        });
    }
    else if (!rules.activityType.allowedValues.includes(data.activityType)) {
        errors.push({
            field: 'activityType',
            rule: 'enum',
            message: 'El tipo de actividad debe ser "tarea" o "proyecto".',
        });
    }
    // Used AI (boolean)
    if (data.usedAi === undefined || data.usedAi === null) {
        errors.push({
            field: 'usedAi',
            rule: 'required',
            message: 'La declaración de uso de IA es obligatoria.',
        });
    }
    else if (typeof data.usedAi !== 'boolean') {
        errors.push({
            field: 'usedAi',
            rule: 'type',
            message: 'La declaración de uso de IA debe ser verdadero o falso.',
        });
    }
    // Conditional AI fields — required when usedAi is true
    if (data.usedAi === true) {
        // AI Tool
        if (!data.aiTool || (typeof data.aiTool === 'string' && data.aiTool.trim() === '')) {
            errors.push({
                field: 'aiTool',
                rule: 'required',
                message: 'La herramienta de IA utilizada es obligatoria cuando se declara uso de IA.',
            });
        }
        else if (typeof data.aiTool !== 'string') {
            errors.push({
                field: 'aiTool',
                rule: 'type',
                message: 'La herramienta de IA debe ser una cadena de texto.',
            });
        }
        else if (data.aiTool.length > rules.aiTool.maxLength) {
            errors.push({
                field: 'aiTool',
                rule: 'maxLength',
                message: `La herramienta de IA no debe exceder ${rules.aiTool.maxLength} caracteres.`,
            });
        }
        // Learnings
        if (!data.learnings || (typeof data.learnings === 'string' && data.learnings.trim() === '')) {
            errors.push({
                field: 'learnings',
                rule: 'required',
                message: 'Los aprendizajes obtenidos son obligatorios cuando se declara uso de IA.',
            });
        }
        else if (typeof data.learnings !== 'string') {
            errors.push({
                field: 'learnings',
                rule: 'type',
                message: 'Los aprendizajes deben ser una cadena de texto.',
            });
        }
        else if (data.learnings.length > rules.learnings.maxLength) {
            errors.push({
                field: 'learnings',
                rule: 'maxLength',
                message: `Los aprendizajes no deben exceder ${rules.learnings.maxLength} caracteres.`,
            });
        }
        // Verification method
        if (!data.verificationMethod || (typeof data.verificationMethod === 'string' && data.verificationMethod.trim() === '')) {
            errors.push({
                field: 'verificationMethod',
                rule: 'required',
                message: 'El método de verificación es obligatorio cuando se declara uso de IA.',
            });
        }
        else if (typeof data.verificationMethod !== 'string') {
            errors.push({
                field: 'verificationMethod',
                rule: 'type',
                message: 'El método de verificación debe ser una cadena de texto.',
            });
        }
        else if (data.verificationMethod.length > rules.verificationMethod.maxLength) {
            errors.push({
                field: 'verificationMethod',
                rule: 'maxLength',
                message: `El método de verificación no debe exceder ${rules.verificationMethod.maxLength} caracteres.`,
            });
        }
    }
    else {
        // When usedAi is false, validate optional fields only if provided
        if (data.aiTool !== undefined && data.aiTool !== null && data.aiTool !== '') {
            if (typeof data.aiTool === 'string' && data.aiTool.length > rules.aiTool.maxLength) {
                errors.push({
                    field: 'aiTool',
                    rule: 'maxLength',
                    message: `La herramienta de IA no debe exceder ${rules.aiTool.maxLength} caracteres.`,
                });
            }
        }
        if (data.learnings !== undefined && data.learnings !== null && data.learnings !== '') {
            if (typeof data.learnings === 'string' && data.learnings.length > rules.learnings.maxLength) {
                errors.push({
                    field: 'learnings',
                    rule: 'maxLength',
                    message: `Los aprendizajes no deben exceder ${rules.learnings.maxLength} caracteres.`,
                });
            }
        }
        if (data.verificationMethod !== undefined && data.verificationMethod !== null && data.verificationMethod !== '') {
            if (typeof data.verificationMethod === 'string' && data.verificationMethod.length > rules.verificationMethod.maxLength) {
                errors.push({
                    field: 'verificationMethod',
                    rule: 'maxLength',
                    message: `El método de verificación no debe exceder ${rules.verificationMethod.maxLength} caracteres.`,
                });
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
// ─── Helper Functions ────────────────────────────────────────────────────────
function validateRequiredString(value, field, label, maxLength, errors) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
            field,
            rule: 'required',
            message: `El campo ${label} es obligatorio.`,
        });
    }
    else if (typeof value !== 'string') {
        errors.push({
            field,
            rule: 'type',
            message: `El campo ${label} debe ser una cadena de texto.`,
        });
    }
    else if (value.length > maxLength) {
        errors.push({
            field,
            rule: 'maxLength',
            message: `El campo ${label} no debe exceder ${maxLength} caracteres.`,
        });
    }
}
//# sourceMappingURL=validation.js.map