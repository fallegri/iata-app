import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';

interface CourseData {
  id: string;
  code: string;
  name: string;
  teacherName: string;
  teacherEmail: string;
  expectedStudents: number;
  emailjsConfig: { serviceId: string; templateId: string; publicKey: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCourse() {
      try {
        const courses = await api.get<CourseData[]>('/api/courses');
        const found = courses.find((c) => c.id === id);
        if (!found) {
          setError('Curso no encontrado.');
        } else {
          setCourse(found);
        }
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setError(err.error.message);
        } else {
          setError('Error al cargar los datos del curso.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <p>Cargando curso...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="page-container">
        <div className="alert alert-error" role="alert">
          {error || 'Curso no encontrado.'}
        </div>
        <Link to="/courses" className="btn-secondary">Volver a Cursos</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{course.name}</h1>
        <Link to="/courses" className="btn-secondary">Volver a Cursos</Link>
      </div>

      <div className="course-info">
        <p><strong>Código:</strong> <span className="course-code">{course.code}</span></p>
        <p><strong>Docente:</strong> {course.teacherName}</p>
        <p><strong>Correo:</strong> {course.teacherEmail}</p>
        {course.expectedStudents > 0 && (
          <p><strong>Estudiantes esperados:</strong> {course.expectedStudents}</p>
        )}
        <p>
          <strong>Enlace compartible:</strong>{' '}
          <code>{window.location.origin}/declare/{course.code}</code>
        </p>
        {course.emailjsConfig && (
          <p><strong>EmailJS:</strong> Configurado</p>
        )}
      </div>

      <div className="course-declarations-placeholder">
        <p>Las declaraciones de este curso se mostrarán aquí.</p>
      </div>
    </div>
  );
}
