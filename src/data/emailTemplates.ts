import { EmailTemplate } from '../types/email.ts';

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'emp-presentacion',
    category: 'empresa',
    name: 'Presentación programa FCT',
    icon: 'Building2',
    color: 'blue',
    subject: 'Presentación del Programa de Formación en Centros de Trabajo (FCT)',
    body: `<p>Estimado/a <strong>{{nombreEmpresa}}</strong>,</p>
<p>Nos ponemos en contacto con usted para presentarle el programa de Formación en Centros de Trabajo (FCT) del curso académico {{curso}}.</p>
<p>Este programa tiene como objetivo que nuestros estudiantes puedan completar su formación realizando prácticas profesionales en su empresa, adquiriendo así experiencia laboral real en su sector.</p>
<p>Adjuntamos la documentación informativa sobre el programa y los detalles de participación.</p>
<p>Quedamos a su disposición para cualquier aclaración.</p>
<p>Atentamente,</p>
<p><strong>{{nombreProfesor}}</strong><br/>{{centroEducativo}}</p>`,
  },
  {
    id: 'emp-colaboracion',
    category: 'empresa',
    name: 'Solicitud de colaboración',
    icon: 'Building2',
    color: 'blue',
    subject: 'Solicitud de colaboración para FCT',
    body: `<p>Estimado/a <strong>{{nombreEmpresa}}</strong>,</p>
<p>Desde el centro educativo {{centroEducativo}} estamos buscando empresas colaboradoras para el programa de Formación en Centros de Trabajo (FCT) del curso {{curso}}.</p>
<p>Su empresa ha sido seleccionada por su trayectoria y consideramos que sería un excelente lugar para que nuestros estudiantes realicen sus prácticas formativas.</p>
<p>Le agradeceríamos si pudiera valorar esta propuesta y nos concediera una reunión para explicarle los detalles del programa.</p>
<p>Quedamos a la espera de su respuesta.</p>
<p>Atentamente,</p>
<p><strong>{{nombreProfesor}}</strong><br/>{{centroEducativo}}</p>`,
  },
  {
    id: 'est-inicio',
    category: 'estudiante',
    name: 'Inicio del periodo FCT',
    icon: 'GraduationCap',
    color: 'green',
    subject: 'Inicio del periodo de Formación en Centros de Trabajo',
    body: `<p>Estimado/a <strong>{{nombreAlumno}}</strong>,</p>
<p>Nos complace informarte que tu periodo de Formación en Centros de Trabajo (FCT) está próximo a comenzar.</p>
<p>A continuación, los detalles de tu programa:</p>
<ul>
<li><strong>Empresa:</strong> {{nombreEmpresa}}</li>
<li><strong>Fecha de inicio:</strong> {{fechaInicio}}</li>
<li><strong>Horas totales:</strong> {{horas}}</li>
</ul>
<p>Es importante que revises toda la documentación adjunta y cumplas con los plazos establecidos.</p>
<p>¡Mucho éxito en esta nueva etapa!</p>
<p>Atentamente,</p>
<p><strong>{{nombreProfesor}}</strong></p>`,
  },
  {
    id: 'est-recordatorio',
    category: 'estudiante',
    name: 'Recordatorio de documentación',
    icon: 'GraduationCap',
    color: 'green',
    subject: 'Recordatorio: Documentación pendiente FCT',
    body: `<p>Estimado/a <strong>{{nombreAlumno}}</strong>,</p>
<p>Te recordamos que aún tienes documentación pendiente para completar tu periodo de Formación en Centros de Trabajo (FCT).</p>
<p>Por favor, revisa los documentos adjuntos y asegúrate de entregarlos antes de las fechas indicadas.</p>
<p>Documentación pendiente:</p>
<ul>
<li>Plan formativo firmado</li>
<li>Calendario de prácticas</li>
</ul>
<p>Si tienes cualquier duda, no dudes en contactarnos.</p>
<p>Atentamente,</p>
<p><strong>{{nombreProfesor}}</strong></p>`,
  },
];

export function getTemplatesByCategory(category: 'empresa' | 'estudiante'): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}
