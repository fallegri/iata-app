import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { VALIDATION_RULES } from '@iata-app/shared';

export default function Home() {
  const navigate = useNavigate();
  const [courseCode, setCourseCode] = useState('');
  const [codeError, setCodeError] = useState('');

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = courseCode.trim().toUpperCase();

    if (!trimmed) {
      setCodeError('Ingrese un código de curso.');
      return;
    }

    if (!VALIDATION_RULES.course.codePattern.test(trimmed)) {
      setCodeError('El código debe ser de 6 caracteres alfanuméricos (A-Z, 0-9).');
      return;
    }

    setCodeError('');
    navigate(`/declare/${trimmed}`);
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>IATA</h1>
        <p className="home-subtitle">Instrumento Abierto de Transparencia Académica</p>
        <p className="home-description">
          Plataforma para la declaración de uso de inteligencia artificial en actividades académicas.
        </p>
      </div>

      <div className="home-sections">
        {/* Student access section */}
        <div className="home-card">
          <h2>Estudiantes</h2>
          <p>Ingresa el código de curso proporcionado por tu docente para enviar tu declaración.</p>

          <form onSubmit={handleCodeSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="courseCode">Código de curso</label>
              <input
                id="courseCode"
                type="text"
                maxLength={VALIDATION_RULES.course.codeLength}
                placeholder="Ej: ABC123"
                value={courseCode}
                onChange={(e) => {
                  setCourseCode(e.target.value.toUpperCase());
                  if (codeError) setCodeError('');
                }}
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'courseCode-error' : undefined}
              />
              {codeError && (
                <span id="courseCode-error" className="field-error" role="alert">
                  {codeError}
                </span>
              )}
            </div>
            <button type="submit" className="btn-primary">
              Acceder al formulario
            </button>
          </form>
        </div>

        {/* Teacher access section */}
        <div className="home-card">
          <h2>Docentes</h2>
          <p>Gestione sus cursos, consulte declaraciones y acceda al panel de analítica.</p>
          <div className="home-actions">
            <Link to="/login" className="btn-primary">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="btn-secondary">
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
