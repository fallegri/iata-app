import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateDeclarationFields, VALIDATION_RULES } from '@iata-app/shared';
import { api, ApiRequestError } from '../services/api';

interface CourseInfo {
  courseName: string;
  teacherName: string;
}

interface FieldErrors {
  studentIdNumber?: string;
  studentName?: string;
  studentGroup?: string;
  career?: string;
  subject?: string;
  activityType?: string;
  usedAi?: string;
  aiTool?: string;
  learnings?: string;
  verificationMethod?: string;
}

export default function StudentForm() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [courseError, setCourseError] = useState('');
  const [loading, setLoading] = useState(true);

  // Form fields
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGroup, setStudentGroup] = useState('');
  const [career, setCareer] = useState('');
  const [subject, setSubject] = useState('');
  const [activityType, setActivityType] = useState('');
  const [usedAi, setUsedAi] = useState<boolean | null>(null);
  const [aiTool, setAiTool] = useState('');
  const [learnings, setLearnings] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      if (!code) {
        setCourseError('No se proporcionó un código de curso.');
        setLoading(false);
        return;
      }

      try {
        const data = await api.get<CourseInfo>(`/api/courses/public/${code}`);
        setCourseInfo(data);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) {
          setCourseError('No se encontró un curso con ese código.');
        } else {
          setCourseError('Error al cargar la información del curso. Intente de nuevo más tarde.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [code]);

  function validateForm(): boolean {
    const result = validateDeclarationFields({
      studentIdNumber: studentIdNumber.trim(),
      studentName: studentName.trim(),
      studentGroup: studentGroup.trim(),
      career: career.trim(),
      subject: subject.trim(),
      activityType,
      usedAi,
      aiTool: aiTool.trim(),
      learnings: learnings.trim(),
      verificationMethod: verificationMethod.trim(),
    });

    if (result.valid) {
      setFieldErrors({});
      return true;
    }

    const errors: FieldErrors = {};
    for (const err of result.errors) {
      const field = err.field as keyof FieldErrors;
      if (!errors[field]) {
        errors[field] = err.message;
      }
    }
    setFieldErrors(errors);
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        courseCode: code,
        studentIdNumber: studentIdNumber.trim(),
        studentName: studentName.trim(),
        studentGroup: studentGroup.trim(),
        career: career.trim(),
        subject: subject.trim(),
        activityType,
        usedAi: usedAi!,
        ...(usedAi
          ? {
              aiTool: aiTool.trim(),
              learnings: learnings.trim(),
              verificationMethod: verificationMethod.trim(),
            }
          : {}),
      };

      const result = await api.post<{ id: string; submittedAt: string }>('/api/declarations', payload);

      navigate(`/declare/${code}/success`, {
        state: {
          declaration: {
            ...payload,
            id: result.id,
            submittedAt: result.submittedAt,
            courseName: courseInfo?.courseName,
            teacherName: courseInfo?.teacherName,
          },
        },
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.error.details) {
          const errors: FieldErrors = {};
          for (const detail of err.error.details) {
            const field = detail.field as keyof FieldErrors;
            if (!errors[field]) {
              errors[field] = detail.message;
            }
          }
          setFieldErrors(errors);
        } else {
          setGeneralError(err.error.message);
        }
      } else {
        setGeneralError('Error de conexión. Intente de nuevo más tarde.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="student-page">
        <div className="student-card">
          <p>Cargando información del curso...</p>
        </div>
      </div>
    );
  }

  if (courseError) {
    return (
      <div className="student-page">
        <div className="student-card">
          <h1>Error</h1>
          <div className="alert alert-error" role="alert">
            {courseError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="student-card">
        <h1>Declaración de Uso de Inteligencia Artificial</h1>
        <p className="course-info">
          Curso: <strong>{courseInfo?.courseName}</strong> — Docente: <strong>{courseInfo?.teacherName}</strong>
        </p>

        {generalError && (
          <div className="alert alert-error" role="alert">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Matrícula */}
          <div className="form-group">
            <label htmlFor="studentIdNumber">Matrícula</label>
            <input
              id="studentIdNumber"
              type="text"
              maxLength={VALIDATION_RULES.declaration.studentIdNumber.maxLength}
              value={studentIdNumber}
              onChange={(e) => {
                setStudentIdNumber(e.target.value);
                if (fieldErrors.studentIdNumber) setFieldErrors((prev) => ({ ...prev, studentIdNumber: undefined }));
              }}
              aria-invalid={!!fieldErrors.studentIdNumber}
              aria-describedby={fieldErrors.studentIdNumber ? 'studentIdNumber-error' : undefined}
            />
            {fieldErrors.studentIdNumber && (
              <span id="studentIdNumber-error" className="field-error" role="alert">
                {fieldErrors.studentIdNumber}
              </span>
            )}
          </div>

          {/* Nombre completo */}
          <div className="form-group">
            <label htmlFor="studentName">Nombre completo</label>
            <input
              id="studentName"
              type="text"
              maxLength={VALIDATION_RULES.declaration.studentName.maxLength}
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                if (fieldErrors.studentName) setFieldErrors((prev) => ({ ...prev, studentName: undefined }));
              }}
              aria-invalid={!!fieldErrors.studentName}
              aria-describedby={fieldErrors.studentName ? 'studentName-error' : undefined}
            />
            {fieldErrors.studentName && (
              <span id="studentName-error" className="field-error" role="alert">
                {fieldErrors.studentName}
              </span>
            )}
          </div>

          {/* Grupo */}
          <div className="form-group">
            <label htmlFor="studentGroup">Grupo</label>
            <input
              id="studentGroup"
              type="text"
              maxLength={VALIDATION_RULES.declaration.studentGroup.maxLength}
              value={studentGroup}
              onChange={(e) => {
                setStudentGroup(e.target.value);
                if (fieldErrors.studentGroup) setFieldErrors((prev) => ({ ...prev, studentGroup: undefined }));
              }}
              aria-invalid={!!fieldErrors.studentGroup}
              aria-describedby={fieldErrors.studentGroup ? 'studentGroup-error' : undefined}
            />
            {fieldErrors.studentGroup && (
              <span id="studentGroup-error" className="field-error" role="alert">
                {fieldErrors.studentGroup}
              </span>
            )}
          </div>

          {/* Carrera */}
          <div className="form-group">
            <label htmlFor="career">Carrera</label>
            <input
              id="career"
              type="text"
              maxLength={VALIDATION_RULES.declaration.career.maxLength}
              value={career}
              onChange={(e) => {
                setCareer(e.target.value);
                if (fieldErrors.career) setFieldErrors((prev) => ({ ...prev, career: undefined }));
              }}
              aria-invalid={!!fieldErrors.career}
              aria-describedby={fieldErrors.career ? 'career-error' : undefined}
            />
            {fieldErrors.career && (
              <span id="career-error" className="field-error" role="alert">
                {fieldErrors.career}
              </span>
            )}
          </div>

          {/* Materia */}
          <div className="form-group">
            <label htmlFor="subject">Materia</label>
            <input
              id="subject"
              type="text"
              maxLength={VALIDATION_RULES.declaration.subject.maxLength}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              aria-invalid={!!fieldErrors.subject}
              aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}
            />
            {fieldErrors.subject && (
              <span id="subject-error" className="field-error" role="alert">
                {fieldErrors.subject}
              </span>
            )}
          </div>

          {/* Tipo de actividad */}
          <div className="form-group">
            <label htmlFor="activityType">Tipo de actividad</label>
            <select
              id="activityType"
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value);
                if (fieldErrors.activityType) setFieldErrors((prev) => ({ ...prev, activityType: undefined }));
              }}
              aria-invalid={!!fieldErrors.activityType}
              aria-describedby={fieldErrors.activityType ? 'activityType-error' : undefined}
            >
              <option value="">— Seleccione —</option>
              <option value="tarea">Tarea</option>
              <option value="proyecto">Proyecto</option>
            </select>
            {fieldErrors.activityType && (
              <span id="activityType-error" className="field-error" role="alert">
                {fieldErrors.activityType}
              </span>
            )}
          </div>

          {/* ¿Usó IA? */}
          <div className="form-group">
            <fieldset>
              <legend>¿Usó inteligencia artificial?</legend>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="usedAi"
                    value="yes"
                    checked={usedAi === true}
                    onChange={() => {
                      setUsedAi(true);
                      if (fieldErrors.usedAi) setFieldErrors((prev) => ({ ...prev, usedAi: undefined }));
                    }}
                  />
                  Sí
                </label>
                <label>
                  <input
                    type="radio"
                    name="usedAi"
                    value="no"
                    checked={usedAi === false}
                    onChange={() => {
                      setUsedAi(false);
                      if (fieldErrors.usedAi) setFieldErrors((prev) => ({ ...prev, usedAi: undefined }));
                    }}
                  />
                  No
                </label>
              </div>
            </fieldset>
            {fieldErrors.usedAi && (
              <span id="usedAi-error" className="field-error" role="alert">
                {fieldErrors.usedAi}
              </span>
            )}
          </div>

          {/* Conditional AI fields */}
          {usedAi === true && (
            <>
              {/* Herramienta de IA */}
              <div className="form-group">
                <label htmlFor="aiTool">Herramienta de IA utilizada</label>
                <input
                  id="aiTool"
                  type="text"
                  maxLength={VALIDATION_RULES.declaration.aiTool.maxLength}
                  value={aiTool}
                  onChange={(e) => {
                    setAiTool(e.target.value);
                    if (fieldErrors.aiTool) setFieldErrors((prev) => ({ ...prev, aiTool: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.aiTool}
                  aria-describedby={fieldErrors.aiTool ? 'aiTool-error' : undefined}
                />
                {fieldErrors.aiTool && (
                  <span id="aiTool-error" className="field-error" role="alert">
                    {fieldErrors.aiTool}
                  </span>
                )}
              </div>

              {/* Aprendizajes */}
              <div className="form-group">
                <label htmlFor="learnings">Hallazgos o aprendizajes obtenidos con apoyo de la IA</label>
                <textarea
                  id="learnings"
                  maxLength={VALIDATION_RULES.declaration.learnings.maxLength}
                  rows={4}
                  value={learnings}
                  onChange={(e) => {
                    setLearnings(e.target.value);
                    if (fieldErrors.learnings) setFieldErrors((prev) => ({ ...prev, learnings: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.learnings}
                  aria-describedby={fieldErrors.learnings ? 'learnings-error' : undefined}
                />
                {fieldErrors.learnings && (
                  <span id="learnings-error" className="field-error" role="alert">
                    {fieldErrors.learnings}
                  </span>
                )}
              </div>

              {/* Método de verificación */}
              <div className="form-group">
                <label htmlFor="verificationMethod">¿Cómo verificó la información proporcionada por la IA?</label>
                <textarea
                  id="verificationMethod"
                  maxLength={VALIDATION_RULES.declaration.verificationMethod.maxLength}
                  rows={3}
                  value={verificationMethod}
                  onChange={(e) => {
                    setVerificationMethod(e.target.value);
                    if (fieldErrors.verificationMethod) setFieldErrors((prev) => ({ ...prev, verificationMethod: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.verificationMethod}
                  aria-describedby={fieldErrors.verificationMethod ? 'verificationMethod-error' : undefined}
                />
                {fieldErrors.verificationMethod && (
                  <span id="verificationMethod-error" className="field-error" role="alert">
                    {fieldErrors.verificationMethod}
                  </span>
                )}
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar Declaración'}
          </button>
        </form>
      </div>
    </div>
  );
}
