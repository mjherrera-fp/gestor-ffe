import { EmailTemplate, PlantillaCorreo } from '../types/email.ts';

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

export const PLANTILLAS_CORREO: PlantillaCorreo[] = [
  {
    id: 'relacion',
    name: 'Envío de relación',
    description: 'Anexo de relación → Email de la empresa',
    subject: 'Documento de relación',
    body: `<p>Estimado/a <strong>{{nombreEmpresa}}</strong>,</p>
<p>Adjuntamos el anexo de relación de alumnos correspondiente al periodo de Formación en Centros de Trabajo (FCT).</p>
<p>Rogamos revisen el documento y nos confirmen su conformidad.</p>
<p>Atentamente,</p>
<p><strong>{{nombreProfesor}}</strong></p>`,
    documents: ['relacion'],
    recipientTarget: 'empresa',
    icon: 'documento',
    color: 'blue',
  },
  {
    id: 'plan',
    name: 'Envío de planes formativos',
    description: 'Plan formativo → Estudiante (según estado) o Tutor',
    subject: 'Plan formativo',
    body: `<p>Estimado/a,</p>
<p>Adjuntamos el plan formativo correspondiente al periodo de prácticas.</p>
<p>Por favor, revisen el contenido y procedan a su firma si están de acuerdo.</p>
<p>Atentamente,</p>
<p><strong>{{nombreProfesor}}</strong></p>`,
    documents: ['plan'],
    recipientTarget: 'estudiante_conditional',
    icon: 'plan',
    color: 'emerald',
  },
  {
    id: 'inicio',
    name: 'Inicio de las FFE',
    description: 'Seguimiento + Valoración + Calendario + Carta → Tutor de la empresa',
    subject: 'Inicio de las FFE',
    body: `<p>Estimado/a {{nombreTutor}},</p>
<p>Este email es para recordar que en los próximos días dará comienzo la Fase de Formación en Empresas (FFE) para nuestros alumnos {{nombreApellidosAlumnos}}.</p>
<p>Según los convenios firmados su centro de trabajo es en {{Dirección}}.</p>
<p>Estará/n allí al inicio de la jornada, y preguntará/n directamente por ti. Aprovecho el email, para adjuntar:</p>
<ul>
<li>Carta de inicio de las FFE</li>
<li>Calendario/s</li>
<li>Fichas de seguimiento y valoración</li>
</ul>
<p>Por último, también me gustaría recordar un par de detalles, el primero, que como tutor cualquier duda, problema o inconveniente que surja durante el periodo de FFE, estoy a vuestra entera disposición. Y segundo, que los alumnos/as en FFE son estudiantes en periodo formativo y que por tanto necesitan asesoramiento y guía en las actividades a desarrollar en la empresa.</p>
<p>Agradecemos de antemano su colaboración.</p>
<p>Atentamente,</p>`,
    documents: ['seguimiento', 'valoracion', 'calendario', 'carta'],
    recipientTarget: 'tutor',
    icon: 'inicio',
    color: 'amber',
  },
  {
    id: 'fin',
    name: 'Fin de las FFE',
    description: 'Seguimiento + Valoración → Tutor de la empresa',
    subject: 'Fin de las FFE',
    body: `<p>Estimado/a {{nombreTutor}},</p>
<p>Próximamente finalizará el periodo de FFE de nuestros alumnos/as en su empresa y necesitamos que se rellene y se firme los siguientes documentos:</p>
<ul>
    <li>Ficha de seguimiento</li>
    <li>Valoración de las FFE</li>
</ul>
<p>Por favor, rellenad la información que sea necesaria en los documentos adjuntos ante de la firma. En el seguimiento aparece precargado en la columna "actividad formativa desarrollada", si queréis podéis poner actividades específicas desarrolladas por el alumno/a, pero es <strong>muy importante que guarden relación con los RA</strong> que están especificados en el documento. Si no sabéis de que va ese RA preguntad al alumno/a.</p>
<p>Con respecto a la firma es muy importante que se siga cierto protocolo:</p>
<ul>
    <li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>
    <li>Si la <sttrong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>
</ul>
<p>Es muy importante la entrega de esta documentación, <strong>sin esta documentación debidamente cumplimentada y firmada no podrán titular nuestros alumnos/as</strong>.</p>
<p>Atentamente,</p>`,
    documents: ['seguimiento', 'valoracion'],
    recipientTarget: 'tutor',
    icon: 'fin',
    color: 'purple',
  },
  {
    id: 'otros',
    name: 'Otros',
    description: 'Correo libre sin documentos adjuntos',
    subject: '',
    body: '',
    documents: [],
    recipientTarget: 'ninguno',
    icon: 'otros',
    color: 'slate',
  },
];

export function getTemplatesByCategory(category: 'empresa' | 'estudiante'): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

export function getPlantillaById(id: string): PlantillaCorreo | undefined {
  return PLANTILLAS_CORREO.find(p => p.id === id);
}

export function interpolateBody(body: string, placeholders: Record<string, string>): string {
  return body.replace(/\{\{([\wáéíóúÁÉÍÓÚñÑ]+)\}\}/g, (_, key) => placeholders[key] ?? `{{${key}}}`);
}
