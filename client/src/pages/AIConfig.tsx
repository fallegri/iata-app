import { useState, useEffect } from 'react';
import { api, ApiRequestError } from '../services/api';

type AIProvider = 'gemini' | 'claude' | 'grok' | 'nvidia' | 'ollama';

interface AIConfigData {
  provider: string;
  hasKey: boolean;
}

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'grok', label: 'xAI Grok' },
  { value: 'nvidia', label: 'Nvidia NIM' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

export default function AIConfig() {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentConfig, setCurrentConfig] = useState<AIConfigData | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await api.get<AIConfigData>('/api/ai/config');
        setCurrentConfig(data);
        if (data.provider) {
          setProvider(data.provider as AIProvider);
        }
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) {
          // No config yet — that's fine
          setCurrentConfig(null);
        } else {
          setError('Error al cargar la configuración actual.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!apiKey.trim()) {
      setError('Debe ingresar una API key.');
      return;
    }

    if (apiKey.length > 256) {
      setError('La API key no puede exceder 256 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/api/ai/config', { provider, apiKey });
      setSuccess('Configuración guardada exitosamente.');
      setCurrentConfig({ provider, hasKey: true });
      setApiKey('');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError('Error al guardar la configuración.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Configuración del Asistente IA</h1>

      {currentConfig?.hasKey && (
        <div className="alert alert-info" role="status">
          <p>
            <strong>Configuración actual:</strong> Proveedor{' '}
            <em>{PROVIDERS.find((p) => p.value === currentConfig.provider)?.label ?? currentConfig.provider}</em>,
            API key configurada (••••••••).
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form" noValidate>
        <div className="form-group">
          <label htmlFor="provider">Proveedor de IA</label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">API Key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            maxLength={256}
            placeholder="Ingrese su API key"
            autoComplete="off"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
