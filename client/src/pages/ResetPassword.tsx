import { useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { validatePassword } from '@iata-app/shared';

/**
 * ResetPassword page — accessed via /reset-password/:token.
 * Shows a new password form with validation (same rules as registration).
 * On submit calls POST /api/auth/reset-password with token and newPassword.
 */
export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function validate(): string[] {
    const validationErrors: string[] = [];

    // Validate password using shared validation rules
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.valid) {
      validationErrors.push(...passwordResult.errors.map((e) => e.message));
    }

    // Confirm passwords match
    if (newPassword !== confirmPassword) {
      validationErrors.push('Las contraseñas no coinciden.');
    }

    return validationErrors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!token) {
      setErrors(['Token de restablecimiento no válido.']);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json().catch(() => null);
        const message =
          data?.error?.message ||
          'No se pudo restablecer la contraseña. El enlace puede haber expirado o ya fue utilizado.';
        setErrors([message]);
      }
    } catch {
      setErrors(['Error de conexión. Por favor, intente de nuevo más tarde.']);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <h1>Contraseña Restablecida</h1>
        <p className="success-message">
          Su contraseña ha sido restablecida exitosamente. Ahora puede iniciar sesión con su nueva contraseña.
        </p>
        <a href="/login">Ir al inicio de sesión</a>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <h1>Restablecer Contraseña</h1>
      <p>Ingrese su nueva contraseña. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="newPassword">Nueva contraseña</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required
          />
        </div>
        {errors.length > 0 && (
          <div className="error-messages" role="alert">
            {errors.map((err, i) => (
              <p key={i} className="error-message">{err}</p>
            ))}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
        </button>
      </form>
      <a href="/login">Volver al inicio de sesión</a>
    </div>
  );
}
