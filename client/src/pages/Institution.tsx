import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';

interface Member {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
}

interface InviteCodeResponse {
  code: string;
  expiresAt: string;
  maxUses: number;
}

export default function Institution() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasInstitution, setHasInstitution] = useState(true);

  // Invite code form state
  const [validityDays, setValidityDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<InviteCodeResponse | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Revoke membership state
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Join institution state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create institution state
  const [newInstitutionName, setNewInstitutionName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Member[]>('/api/institutions/members');
      setMembers(data);
      setHasInstitution(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setHasInstitution(false);
      } else if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError('Error al cargar los miembros. Intente de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleGenerateInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setGeneratedCode(null);
    setCodeCopied(false);
    setInviteLoading(true);

    try {
      const data = await api.post<InviteCodeResponse>('/api/institutions/invite', {
        validityDays,
        maxUses,
      });
      setGeneratedCode(data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setInviteError(err.error.message);
      } else {
        setInviteError('Error al generar el código de invitación.');
      }
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopyCode() {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedCode.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  async function handleRevokeMembership(memberId: string) {
    setRevoking(true);
    setError('');
    try {
      await api.delete(`/api/institutions/members/${memberId}`);
      setRevokeConfirm(null);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError('Error al revocar la membresía.');
      }
    } finally {
      setRevoking(false);
    }
  }

  async function handleCreateInstitution(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');

    if (!newInstitutionName.trim()) {
      setCreateError('El nombre de la institución es obligatorio.');
      return;
    }

    setCreateLoading(true);
    try {
      await api.post('/api/institutions', { name: newInstitutionName.trim() });
      setHasInstitution(true);
      fetchMembers();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setCreateError(err.error.message);
      } else {
        setCreateError('Error al crear la institución.');
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoinInstitution(e: React.FormEvent) {
    e.preventDefault();
    setJoinError('');

    if (!joinCode.trim()) {
      setJoinError('El código de invitación es obligatorio.');
      return;
    }

    setJoinLoading(true);
    try {
      await api.post('/api/institutions/join', { code: joinCode.trim() });
      setHasInstitution(true);
      fetchMembers();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setJoinError(err.error.message);
      } else {
        setJoinError('Error al unirse a la institución.');
      }
    } finally {
      setJoinLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // No institution state
  if (!loading && !hasInstitution) {
    return (
      <div className="page-container">
        <h1>Institución</h1>
        <div className="empty-state">
          <p>
            No pertenece a ninguna institución. Para crear cursos y acceder al panel de
            administración, debe crear una nueva institución o unirse a una existente.
          </p>

          {/* Create institution */}
          <div className="form-section" style={{ marginTop: '1.5rem' }}>
            <h2>Crear nueva institución</h2>
            {createError && (
              <div className="alert alert-error" role="alert">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateInstitution}>
              <div className="form-group">
                <label htmlFor="new-institution-name">Nombre de la institución</label>
                <input
                  id="new-institution-name"
                  type="text"
                  value={newInstitutionName}
                  onChange={(e) => setNewInstitutionName(e.target.value)}
                  maxLength={200}
                  placeholder="Ej: Universidad Nacional"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={createLoading}>
                {createLoading ? 'Creando...' : 'Crear Institución'}
              </button>
            </form>
          </div>

          {/* Join with invite code */}
          <div className="form-section" style={{ marginTop: '1.5rem' }}>
            <h2>Unirse con código de invitación</h2>
            {joinError && (
              <div className="alert alert-error" role="alert">
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoinInstitution}>
              <div className="form-group">
                <label htmlFor="join-invite-code">Código de invitación</label>
                <input
                  id="join-invite-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={8}
                  placeholder="Ej: ABC12345"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={joinLoading}>
                {joinLoading ? 'Uniéndose...' : 'Unirse'}
              </button>
            </form>
          </div>

          <p style={{ marginTop: '1.5rem' }}>
            <Link to="/dashboard">Volver al panel principal</Link>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Cargando información de la institución...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Administración de Institución</h1>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Members list */}
      <section aria-labelledby="members-heading">
        <h2 id="members-heading">Miembros</h2>
        {members.length === 0 ? (
          <p>No hay miembros registrados en la institución.</p>
        ) : (
          <table className="data-table" aria-label="Lista de miembros de la institución">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo electrónico</th>
                <th scope="col">Fecha de incorporación</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{formatDate(member.joinedAt)}</td>
                  <td>
                    <button
                      className="btn-danger btn-small"
                      onClick={() => setRevokeConfirm(member.id)}
                    >
                      Revocar
                    </button>

                    {revokeConfirm === member.id && (
                      <div
                        className="confirm-dialog"
                        role="alertdialog"
                        aria-labelledby={`revoke-title-${member.id}`}
                      >
                        <p id={`revoke-title-${member.id}`}>
                          ¿Está seguro de que desea revocar la membresía de{' '}
                          <strong>{member.name}</strong>? Los cursos y declaraciones del
                          docente permanecerán pero no serán accesibles hasta que se
                          reincorpore.
                        </p>
                        <div className="confirm-actions">
                          <button
                            className="btn-danger"
                            onClick={() => handleRevokeMembership(member.id)}
                            disabled={revoking}
                          >
                            {revoking ? 'Revocando...' : 'Confirmar'}
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setRevokeConfirm(null)}
                            disabled={revoking}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Generate invite code */}
      <section aria-labelledby="invite-heading" style={{ marginTop: '2rem' }}>
        <h2 id="invite-heading">Generar código de invitación</h2>

        {inviteError && (
          <div className="alert alert-error" role="alert">
            {inviteError}
          </div>
        )}

        <form onSubmit={handleGenerateInvite}>
          <div className="form-group">
            <label htmlFor="invite-validity-days">Días de validez (1-30)</label>
            <input
              id="invite-validity-days"
              type="number"
              min={1}
              max={30}
              value={validityDays}
              onChange={(e) => setValidityDays(Math.min(30, Math.max(1, Number(e.target.value))))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="invite-max-uses">Usos máximos (1-100)</label>
            <input
              id="invite-max-uses"
              type="number"
              min={1}
              max={100}
              value={maxUses}
              onChange={(e) => setMaxUses(Math.min(100, Math.max(1, Number(e.target.value))))}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={inviteLoading}>
            {inviteLoading ? 'Generando...' : 'Generar Código'}
          </button>
        </form>

        {generatedCode && (
          <div className="invite-code-result" style={{ marginTop: '1rem' }}>
            <p>
              <strong>Código generado:</strong>{' '}
              <code className="invite-code-display">{generatedCode.code}</code>
            </p>
            <p>
              Expira: {formatDate(generatedCode.expiresAt)} — Usos máximos:{' '}
              {generatedCode.maxUses}
            </p>
            <button
              className="btn-secondary"
              onClick={handleCopyCode}
              aria-label="Copiar código de invitación al portapapeles"
            >
              {codeCopied ? '¡Copiado!' : 'Copiar código'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
