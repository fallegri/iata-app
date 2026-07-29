import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';

interface CourseItem {
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

export default function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<CourseItem[]>('/api/courses');
      setCourses(data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError('Error al cargar los cursos. Intente de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  function getShareableLink(code: string): string {
    return `${window.location.origin}/declare/${code}`;
  }

  async function handleDelete(courseId: string) {
    setDeleting(true);
    try {
      await api.delete(`/api/courses/${courseId}`);
      setDeleteConfirm(null);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError('Error al eliminar el curso.');
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Cargando cursos...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mis Cursos</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/courses/new')}
        >
          Crear Nuevo Curso
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No tiene cursos creados aún.</p>
          <p>
            <Link to="/courses/new">Cree su primer curso</Link> para comenzar a recibir declaraciones de sus estudiantes.
          </p>
        </div>
      ) : (
        <div className="courses-list">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-card-header">
                <h2 className="course-name">
                  <Link to={`/courses/${course.id}`}>{course.name}</Link>
                </h2>
                <span className="course-code">{course.code}</span>
              </div>

              <div className="course-card-body">
                <p className="course-teacher">
                  Docente: {course.teacherName}
                </p>
                <p className="course-link">
                  Enlace compartible:{' '}
                  <code>{getShareableLink(course.code)}</code>
                </p>
              </div>

              <div className="course-card-actions">
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/courses/${course.id}/edit`)}
                >
                  Editar
                </button>
                <button
                  className="btn-danger"
                  onClick={() => setDeleteConfirm(course.id)}
                >
                  Eliminar
                </button>
              </div>

              {deleteConfirm === course.id && (
                <div className="confirm-dialog" role="alertdialog" aria-labelledby={`delete-title-${course.id}`}>
                  <p id={`delete-title-${course.id}`}>
                    ¿Está seguro de que desea eliminar el curso <strong>{course.name}</strong>?
                    Se eliminarán todas las declaraciones asociadas.
                  </p>
                  <div className="confirm-actions">
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(course.id)}
                      disabled={deleting}
                    >
                      {deleting ? 'Eliminando...' : 'Confirmar'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setDeleteConfirm(null)}
                      disabled={deleting}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
