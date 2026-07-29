import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIConfigData {
  provider: string;
  hasKey: boolean;
}

interface CourseOption {
  id: string;
  name: string;
}

interface ChatResponse {
  response: string;
}

const MAX_QUERY_LENGTH = 2000;

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkConfig() {
      try {
        const config = await api.get<AIConfigData>('/api/ai/config');
        setHasConfig(!!config.hasKey);
      } catch {
        setHasConfig(false);
      } finally {
        setConfigLoading(false);
      }
    }
    checkConfig();
  }, []);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await api.get<CourseOption[]>('/api/courses');
        setCourses(data);
      } catch {
        // Non-critical: course filter is optional
      }
    }
    fetchCourses();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setError('');
    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const body: { query: string; courseId?: string } = { query: trimmed };
      if (selectedCourse) {
        body.courseId = selectedCourse;
      }
      const data = await api.post<ChatResponse>('/api/ai/chat', body);
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      let errorMsg = 'Error al comunicarse con el asistente IA.';
      if (err instanceof ApiRequestError) {
        const code = err.error.code;
        if (code === 'AI_INVALID_KEY') {
          errorMsg = 'API key inválida. Verifique su configuración.';
        } else if (code === 'AI_TIMEOUT') {
          errorMsg = 'Timeout (30s). El proveedor de IA no respondió a tiempo.';
        } else if (code === 'AI_QUOTA_EXCEEDED') {
          errorMsg = 'Cuota excedida. Ha alcanzado el límite de uso del proveedor.';
        } else {
          errorMsg = err.error.message;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  if (configLoading) {
    return (
      <div className="page-container">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!hasConfig) {
    return (
      <div className="page-container">
        <h1>Asistente IA</h1>
        <div className="empty-state">
          <p>No tiene un proveedor de IA configurado.</p>
          <p>
            <Link to="/ai/config">Configure su proveedor de IA</Link> para comenzar a usar el asistente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Asistente IA</h1>

      <div className="form-group">
        <label htmlFor="courseFilter">Filtrar por curso (opcional)</label>
        <select
          id="courseFilter"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="">Todos los cursos</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      <div className="chat-container" role="log" aria-live="polite" aria-label="Historial de chat">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Escriba un mensaje para iniciar la conversación con el asistente IA.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message chat-message-${msg.role}`}
          >
            <strong>{msg.role === 'user' ? 'Tú' : 'Asistente'}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="chat-message chat-message-assistant">
            <p><em>Escribiendo...</em></p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="form-group">
          <label htmlFor="chatInput" className="sr-only">Mensaje</label>
          <textarea
            id="chatInput"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Escriba su consulta..."
            rows={3}
            disabled={loading}
            aria-describedby="charCounter"
          />
          <span id="charCounter" className="char-counter">
            {query.length}/{MAX_QUERY_LENGTH}
          </span>
        </div>
        <button type="submit" className="btn-primary" disabled={loading || !query.trim()}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
