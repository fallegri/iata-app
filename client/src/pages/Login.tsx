import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, VALIDATION_RULES } from '@iata-app/shared';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateFields(): boolean {
    const errors: FieldErrors = {};

    const emailResult = validateEmail(email.trim());
    if (!emailResult.valid) {
      errors.email = emailResult.errors[0].message;
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < VALIDATION_RULES.password.minLength) {
      errors.password = `La contraseña debe tener al menos ${VALIDATION_RULES.password.minLength} caracteres.`;
    } else if (!VALIDATION_RULES.password.uppercasePattern.test(password)) {
      errors.password = 'La contraseña debe contener al menos una letra mayúscula.';
    } else if (!VALIDATION_RULES.password.lowercasePattern.test(password)) {
      errors.password = 'La contraseña debe contener al menos una letra minúscula.';
    } else if (!VALIDATION_RULES.password.numberPattern.test(password)) {
      errors.password = 'La contraseña debe contener al menos un número.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError('');

    if (!validateFields()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.token, data.teacher);
        navigate('/dashboard');
        return;
      }

      if (res.status === 403) {
        setGeneralError('Cuenta bloqueada. Intente de nuevo en 15 minutos.');
      } else {
        // 401 or any other error — generic message (don't reveal which field)
        setGeneralError('Credenciales incorrectas.');
      }
    } catch {
      setGeneralError('Error de conexión. Intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Iniciar Sesión</h1>
        <p className="auth-subtitle">
          Ingrese sus credenciales para acceder a la plataforma IATA.
        </p>

        {generalError && (
          <div className="alert alert-error" role="alert">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="login-email-error" className="field-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            {fieldErrors.password && (
              <span id="login-password-error" className="field-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tiene cuenta?{' '}
          <Link to="/register">Registrarse</Link>
        </p>
        <p className="auth-footer">
          <Link to="/forgot-password">¿Olvidó su contraseña?</Link>
        </p>
      </div>
    </div>
  );
}
