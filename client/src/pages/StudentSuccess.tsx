import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import emailjs from '@emailjs/browser';

interface DeclarationData {
  curso: string;
  docente: string;
  estudiante: string;
  matricula: string;
  grupo: string;
  carrera: string;
  materia: string;
  actividad: string;
  usedAI: boolean;
  herramienta: string;
  aprendizajes: string;
  verificacion: string;
  fecha: string;
  studentEmail?: string;
  emailjsConfig?: {
    serviceId: string;
    templateId: string;
    publicKey: string;
  } | null;
  teacherEmail?: string;
}

export default function StudentSuccess() {
  const location = useLocation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const data = location.state as DeclarationData | undefined;

  if (!data) {
    return (
      <div className="wrap">
        <div className="doc">
          <p className="subtitle">No se encontraron datos de la declaración.</p>
          <button className="btn secondary" onClick={() => navigate(`/declare/${code || ''}`)}>
            Volver al formulario
          </button>
        </div>
      </div>
    );
  }

  // Send EmailJS notification if course has emailjs config
  if (data.emailjsConfig) {
    const { serviceId, templateId, publicKey } = data.emailjsConfig;
    const templateParams = {
      to_email: data.teacherEmail || '',
      to_name: data.docente,
      course_name: data.curso,
      student_name: data.estudiante,
      student_email: data.studentEmail || '',
      used_ai: data.usedAI ? 'Sí' : 'No',
      tool_used: data.herramienta || 'N/A',
      what_learned: data.aprendizajes || 'N/A',
      how_verified: data.verificacion || 'N/A',
      submitted_at: data.fecha,
    };

    emailjs.send(serviceId, templateId, templateParams, publicKey).catch(() => {
      // Email notification is best-effort; do not block the user
    });
  }

  function generatePDF() {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 25;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = 'Declaración de Uso de Inteligencia Artificial';
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, y);
    y += 14;

    // Divider line
    doc.setDrawColor(166, 116, 60); // --brass color
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Helper to add a field
    doc.setFontSize(11);
    function addField(label: string, value: string) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');

      const labelWidth = doc.getTextWidth(`${label}: `);
      const valueLines = doc.splitTextToSize(value || 'N/A', maxWidth - labelWidth);

      if (valueLines.length === 1) {
        doc.text(valueLines[0], margin + labelWidth, y);
        y += 7;
      } else {
        // Multi-line: put value on next line
        y += 6;
        const allLines = doc.splitTextToSize(value || 'N/A', maxWidth);
        doc.text(allLines, margin + 4, y);
        y += allLines.length * 5.5 + 4;
      }

      // Check page overflow
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    addField('Curso', data.curso);
    addField('Docente', data.docente);
    addField('Estudiante', data.estudiante);
    addField('Matrícula', data.matricula);
    addField('Grupo', data.grupo);
    addField('Carrera', data.carrera);
    addField('Materia', data.materia);
    addField('Actividad', data.actividad);
    addField('¿Usó IA?', data.usedAI ? 'Sí' : 'No');
    addField('Herramienta', data.herramienta || 'N/A');
    addField('Qué aprendió', data.aprendizajes || 'N/A');
    addField('Cómo verificó', data.verificacion || 'N/A');
    addField('Fecha', data.fecha);

    // Footer
    y += 8;
    doc.setDrawColor(166, 116, 60);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('IATA — Instrumento Abierto de Transparencia Académica', margin, y);

    doc.save(`declaracion_${data.matricula}_${data.fecha.replace(/\//g, '-')}.pdf`);
  }

  return (
    <div className="wrap">
      <div className="doc">
        <div className="seal-wrap">
          <div className="seal">
            <span>Declaración<br />Enviada</span>
          </div>
          <p className="status-line">
            Tu declaración ha sido registrada exitosamente.
          </p>
        </div>

        <div className="course-meta">
          <b>Curso:</b> {data.curso}<br />
          <b>Estudiante:</b> {data.estudiante}<br />
          <b>Fecha:</b> {data.fecha}
        </div>

        <button className="btn" onClick={generatePDF}>
          Descargar PDF
        </button>

        <button
          className="btn secondary"
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
