import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { validateCourseFields, VALIDATION_RULES } from '@iata-app/shared';
import { api, ApiRequestError } from '../services/api';

interface FormData {
  name: string;
  teacherName: string;
  teacherEmail: string;
  expectedStudents: string;
  enableEmailJs: boolean;
  serviceId: string;
  templateId: string;
  publicKey: string;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

export default function CourseCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    name: '',
    teacherName: '',
    teacherEmail: '',
    expectedStudents: '',
    enableEmailJs: false,
    serviceId: '',
    templateId: '',
    publicKey: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    const expectedStudentsNum = form.expectedStudents.trim() === ''
      ? undefined
      : Number(form.expectedStudents);

    const result = validateCourseFields({
      name: form.name.trim(),
      teacherName: form.teacherName.trim(),
      teacherEmail: form.teacherEmail.trim(),
      expectedStudents: expectedStudentsNum,
    });

    if (!result.valid) {
      for (const err of result.errors) {
        errors[err.field] = err.message;
      }
    }

    // Validate expectedStudents is a valid number if provided
    if (form.expectedStudents.trim() !== '' && isNaN(Number(form.expectedStudents))) {
      errors.expectedStudents = 'El número esperado de estudiantes debe ser un valor numérico.';
    }

    // Validate EmailJS fields if enabled
    if (form.enableEmailJs) {
      if (!form.serviceId.trim()) {
        errors.serviceId = 'El Service ID es obligatorio cuando EmailJS está habilitado.';
      }
      if (!form.templateId.trim()) {
        errors.templateId = 'El Template ID es obligatorio cuando EmailJS está habilitado.';
      }
      if (!form.publicKey.trim()) {
        errors.publicKey = 'La Public Key es obligatoria cuando EmailJS está habilitado.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    const expectedStudentsNum = form.expectedStudents.trim() === ''
      ? 0
      : Number(form.expectedStudents);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      teacherName: form.teacherName.trim(),
      teacherEmail: form.teacherEmail.trim(),
      expectedStudents: expectedStudentsNum,
    };

    if (form.enableEmailJs) {
      payload.emailjsConfig = {
        serviceId: form.serviceId.trim(),
        templateId: form.templateId.trim(),
        publicKey: form.publicKey.trim(),
      };
    }

    setLoading(true);
    try {
      await api.post('/api/courses', payload);
      navigate('/courses');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.error.details) {
          const errors: FieldErrors = {};
          for (const detail of err.error.details) {
            errors[detail.field] = detail.message;
          }
          setFieldErrors(errors);
        } else {
          setGeneralError(err.error.message);
        }
      } else {
        setGeneralError('Error de conexión. Intente de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Crear Curso</h1>
        <Link to="/courses" className="btn-secondary">Volver a Cursos</Link>
      </div>

      {generalError && (
        <div className="alert alert-error" role="alert">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="course-form">
        <div className="form-group">
          <label htmlFor="course-name">
            Nombre del curso <span className="required">*</span>
          </label>
          <input
            id="course-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            maxLength={VALIDATION_RULES.course.name.maxLength}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'course-name-error' : undefined}
          />
          {fieldErrors.name && (
            <span id="course-name-error" className="field-error" role="alert">
              {fieldErrors.name}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="course-teacher-name">
            Nombre del docente <span className="required">*</span>
          </label>
          <input
            id="course-teacher-name"
            name="teacherName"
            type="text"
            value={form.teacherName}
            onChange={handleChange}
            maxLength={VALIDATION_RULES.course.teacherName.maxLength}
            aria-invalid={!!fieldErrors.teacherName}
            aria-describedby={fieldErrors.teacherName ? 'course-teacher-name-error' : undefined}
          />
          {fieldErrors.teacherName && (
            <span id="course-teacher-name-error" className="field-error" role="alert">
              {fieldErrors.teacherName}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="course-teacher-email">
            Correo del docente <span className="required">*</span>
          </label>
          <input
            id="course-teacher-email"
            name="teacherEmail"
            type="email"
            value={form.teacherEmail}
            onChange={handleChange}
            maxLength={VALIDATION_RULES.email.maxLength}
            aria-invalid={!!fieldErrors.teacherEmail}
            aria-describedby={fieldErrors.teacherEmail ? 'course-teacher-email-error' : undefined}
          />
          {fieldErrors.teacherEmail && (
            <span id="course-teacher-email-error" className="field-error" role="alert">
              {fieldErrors.teacherEmail}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="course-expected-students">
            Estudiantes esperados (opcional)
          </label>
          <input
            id="course-expected-students"
            name="expectedStudents"
            type="number"
            min="0"
            value={form.expectedStudents}
            onChange={handleChange}
            aria-invalid={!!fieldErrors.expectedStudents}
            aria-describedby={fieldErrors.expectedStudents ? 'course-expected-students-error' : undefined}
          />
          {fieldErrors.expectedStudents && (
            <span id="course-expected-students-error" className="field-error" role="alert">
              {fieldErrors.expectedStudents}
            </span>
          )}
        </div>

        <div className="form-group form-group-checkbox">
          <label htmlFor="course-emailjs">
            <input
              id="course-emailjs"
              name="enableEmailJs"
              type="checkbox"
              checked={form.enableEmailJs}
              onChange={handleChange}
            />
            Habilitar notificaciones por EmailJS
          </label>
        </div>

        {form.enableEmailJs && (
          <fieldset className="emailjs-fieldset">
            <legend>Configuración de EmailJS</legend>

            <div className="form-group">
              <label htmlFor="course-service-id">
                Service ID <span className="required">*</span>
              </label>
              <input
                id="course-service-id"
                name="serviceId"
                type="text"
                value={form.serviceId}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.serviceId}
                aria-describedby={fieldErrors.serviceId ? 'course-service-id-error' : undefined}
              />
              {fieldErrors.serviceId && (
                <span id="course-service-id-error" className="field-error" role="alert">
                  {fieldErrors.serviceId}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="course-template-id">
                Template ID <span className="required">*</span>
              </label>
              <input
                id="course-template-id"
                name="templateId"
                type="text"
                value={form.templateId}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.templateId}
                aria-describedby={fieldErrors.templateId ? 'course-template-id-error' : undefined}
              />
              {fieldErrors.templateId && (
                <span id="course-template-id-error" className="field-error" role="alert">
                  {fieldErrors.templateId}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="course-public-key">
                Public Key <span className="required">*</span>
              </label>
              <input
                id="course-public-key"
                name="publicKey"
                type="text"
                value={form.publicKey}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.publicKey}
                aria-describedby={fieldErrors.publicKey ? 'course-public-key-error' : undefined}
              />
              {fieldErrors.publicKey && (
                <span id="course-public-key-error" className="field-error" role="alert">
                  {fieldErrors.publicKey}
                </span>
              )}
            </div>
          </fieldset>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Curso'}
          </button>
          <Link to="/courses" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
