import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ToolStat {
  tool: string;
  count: number;
}

interface CourseDeclarations {
  courseId: string;
  courseName: string;
  count: number;
}

interface CourseProgress {
  courseId: string;
  courseName: string;
  received: number;
  expected: number;
  percentage: number;
}

interface DashboardStats {
  totalDeclarations: number;
  usedAI: number;
  notUsedAI: number;
  topTools: ToolStat[];
  declarationsPerCourse: CourseDeclarations[];
  progressByCourse: CourseProgress[];
}

interface CourseOption {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.get<CourseOption[]>('/api/courses');
      setCourses(data.map((c) => ({ id: c.id, name: c.name })));
    } catch {
      // Non-critical: courses dropdown may be empty
    }
  }, []);

  const fetchStats = useCallback(async (courseId?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = courseId
        ? `/api/dashboard/stats?courseId=${encodeURIComponent(courseId)}`
        : '/api/dashboard/stats';
      const data = await api.get<DashboardStats>(url);
      setStats(data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError('Error al cargar las estadísticas. Intente de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, [fetchCourses, fetchStats]);

  function handleCourseFilter(courseId: string) {
    setSelectedCourse(courseId);
    fetchStats(courseId || undefined);
  }

  // Empty state: no courses or no declarations
  if (!loading && !error && stats && stats.totalDeclarations === 0 && courses.length === 0) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <div className="empty-state">
          <p>Aún no hay datos disponibles. Cree su primer curso para comenzar.</p>
          <Link to="/courses/new" className="btn-primary">
            Crear Curso
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // If teacher has courses but no declarations yet
  const isEmpty = stats.totalDeclarations === 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="dashboard-filter">
          <label htmlFor="course-filter">Filtrar por curso:</label>
          <select
            id="course-filter"
            value={selectedCourse}
            onChange={(e) => handleCourseFilter(e.target.value)}
          >
            <option value="">Todos los cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <p>Aún no hay datos disponibles. Cree su primer curso para comenzar.</p>
          <Link to="/courses/new" className="btn-primary">
            Crear Curso
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="stat-cards">
            <div className="stat-card">
              <h3>Total Declaraciones</h3>
              <p className="stat-value">{stats.totalDeclarations}</p>
            </div>
            <div className="stat-card">
              <h3>Usaron IA</h3>
              <p className="stat-value">{stats.usedAI}</p>
            </div>
            <div className="stat-card">
              <h3>No usaron IA</h3>
              <p className="stat-value">{stats.notUsedAI}</p>
            </div>
          </div>

          {/* Top 10 AI tools bar chart */}
          {stats.topTools.length > 0 && (
            <section className="dashboard-section">
              <h2>Top 10 Herramientas de IA</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={stats.topTools}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tool"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" name="Usos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Declarations per course */}
          {stats.declarationsPerCourse.length > 0 && (
            <section className="dashboard-section">
              <h2>Declaraciones por Curso</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={stats.declarationsPerCourse}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="courseName"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0891b2" name="Declaraciones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Progress per course */}
          {stats.progressByCourse.length > 0 && (
            <section className="dashboard-section">
              <h2>Progreso por Curso</h2>
              <div className="progress-list">
                {stats.progressByCourse.map((course) => (
                  <div key={course.courseId} className="progress-item">
                    <div className="progress-info">
                      <span className="progress-course-name">{course.courseName}</span>
                      <span className="progress-numbers">
                        {course.received} / {course.expected} ({course.percentage}%)
                      </span>
                    </div>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      aria-valuenow={course.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progreso de ${course.courseName}: ${course.percentage}%`}
                    >
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(course.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
