import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, VALIDATION_RULES } from '@iata-app/shared';

type InstitutionOption = 'create' | 'join';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  institutionName?: string;
  inviteCode?: string;
}

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionOption, setInstitutionOption] = useState<InstitutionOption>('create');
  const [institutionName, setInstitutionName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateFields(): boolean {
    const errors: FieldErrors = {};

    // Name
    if (!name.trim()) {
      errors.name = 'El nombre es obligatorio.';
    } else if (name.trim().length > 100) {
      errors.name = 'El nombre no debe exceder 100 caracteres.';
    }

    // Email
    const emailResult = validateEmail(email.trim());
    if (!emailResult.valid) {
      errors.email = emailResult.errors[0].message;
    }

    // Password
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      errors.password = passwordResult.errors[0].message;
    }

    // Institution fields
    if (institutionOption === 'create') {
      if (!institutionName.trim()) {
        errors.institutionName = 'El nombre de la institución es obligatorio.';
      } else if (institutionName.trim().length > VALIDATION_RULES.institution.name.maxLength) {
        errors.institutionName = `El nombre no debe exceder ${VALIDATION_RULES.institution.name.maxLength} caracteres.`;
      }
    } else {
      if (!inviteCode.trim()) {
        errors.inviteCode = 'El código de invitación es obligatorio.';
      } else if (!VALIDATION_RULES.inviteCode.codePattern.test(inviteCode.trim())) {
        errors.inviteCode = 'El código debe ser de 8 caracteres alfanuméricos.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError('');

    if (!validateFields()) return;

    setLoading(true);
    try {
      // Step 1: Register the account
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!registerRes.ok) {
        const errorData = await registerRes.json();
        if (errorData.error?.details) {
          const newErrors: FieldErrors = {};
          for (const detail of errorData.error.details) {
            if (detail.field === 'email') newErrors.email = detail.message;
            if (detail.field === 'password') newErrors.password = detail.message;
            if (detail.field === 'name') newErrors.name = detail.message;
          }
          if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
          } else {
            setGeneralError(errorData.error.message || 'Error al registrar la cuenta.');
          }
        } else {
          setGeneralError(errorData.error?.message || 'Error al registrar la cuenta.');
        }
        return;
      }

      const registerData = await registerRes.json();
      const token = registerData.token;
      const teacher = registerData.teacher;

      // Step 2: Create institution or join with code
      if (institutionOption === 'create') {
        const institutionRes = await fetch('/api/institutions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: institutionName.trim() }),
        });

        if (!institutionRes.ok) {
          const errorData = await institutionRes.json();
          setFieldErrors({ institutionName: errorData.error?.message || 'Error al crear la institución.' });
          // Still log in since the account was created
          login(token, teacher);
          return;
        }
      } else {
        const joinRes = await fetch('/api/institutions/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: inviteCode.trim() }),
        });

        if (!joinRes.ok) {
          const errorData = await joinRes.json();
          setFieldErrors({ inviteCode: errorData.error?.message || 'Código de invitación inválido.' });
          // Still log in since the account was created
          login(token, teacher);
          return;
        }
      }

      // Success — login and navigate
      login(token, teacher);
      navigate('/dashboard');
    } catch {
      setGeneralError('Error de conexión. Intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Registrarse</h1>
        <p className="auth-subtitle">
          Cree su cuenta de docente para acceder a la plataforma IATA.
        </p>

        {generalError && (
          <div className="alert alert-error" role="alert">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-group">
            <label htmlFor="register-name">Nombre completo</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
            />
            {fieldErrors.name && (
              <span id="register-name-error" className="field-error" role="alert">
                {fieldErrors.name}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="register-email">Correo electrónico</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="register-email-error" className="field-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="register-password">Contraseña</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
            />
            <span className="field-hint">
              Mínimo 8 caracteres, con mayúscula, minúscula y número.
            </span>
            {fieldErrors.password && (
              <span id="register-password-error" className="field-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Institution Section */}
          <fieldset className="form-section">
            <legend>Institución</legend>

            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="institutionOption"
                  value="create"
                  checked={institutionOption === 'create'}
                  onChange={() => setInstitutionOption('create')}
                />
                Crear nueva institución
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="institutionOption"
                  value="join"
                  checked={institutionOption === 'join'}
                  onChange={() => setInstitutionOption('join')}
                />
                Unirse con código de invitación
              </label>
            </div>

            {institutionOption === 'create' && (
              <div className="form-group">
                <label htmlFor="register-institution-name">Nombre de la institución</label>
                <input
                  id="register-institution-name"
                  type="text"
                  value={institutionName}
                  onChange={(e) => { setInstitutionName(e.target.value); clearFieldError('institutionName'); }}
                  aria-invalid={!!fieldErrors.institutionName}
                  aria-describedby={fieldErrors.institutionName ? 'register-institution-name-error' : undefined}
                />
                {fieldErrors.institutionName && (
                  <span id="register-institution-name-error" className="field-error" role="alert">
                    {fieldErrors.institutionName}
                  </span>
                )}
              </div>
            )}

            {institutionOption === 'join' && (
              <div className="form-group">
                <label htmlFor="register-invite-code">Código de invitación</label>
                <input
                  id="register-invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value); clearFieldError('inviteCode'); }}
                  aria-invalid={!!fieldErrors.inviteCode}
                  aria-describedby={fieldErrors.inviteCode ? 'register-invite-code-error' : undefined}
                  maxLength={8}
                />
                {fieldErrors.inviteCode && (
                  <span id="register-invite-code-error" className="field-error" role="alert">
                    {fieldErrors.inviteCode}
                  </span>
                )}
              </div>
            )}
          </fieldset>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tiene cuenta?{' '}
          <Link to="/login">Iniciar Sesión</Link>
        </p>
      </div>
    </div>
  );
}
