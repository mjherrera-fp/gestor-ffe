import { PlantillaCorreo } from '../../src/types/email.ts';

export const PLANTILLAS_CORREO: PlantillaCorreo[] = [
  {
    id: 'relacion',
    name: 'Envío de relación',
    description: 'Anexo de relación → Email de la empresa',
    subject: 'Documento de relación',
    body: `<p>Estimado/a {{contactoEmpresa}},</p>
<p>Adjuntamos el anexo de relación de alumnos correspondiente al periodo de Formación en Empresa (FFE).</p>
<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado. Tenga en cuenta que es importante que el documento esté correctamente rellenado y firmado para poder proceder con el proceso.</p>
<p>Es importante que el documento esté correctamente rellenado y firmado para poder proceder con el proceso. Con respecto a la firma, tenga en cuenta que:</p>
<ul>
<li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>
<li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>
</ul>
<p>Agradecemos de antemano su colaboración.</p>
<p>Atentamente,</p>`,
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
    body: `<p>Estimado/a, {{alumnoTutor}}</p>
<p>Adjuntamos el plan formativo correspondiente a la fase de formación en empresa.</p>
<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado.</p>
<p>Recuerden que es importante que el plan esté correctamente rellenado y firmado para poder proceder con el proceso. Con respecto a la firma, tenga en cuenta que:</p>
<ul>
    <li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>
    <li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>
</ul>
<p>Atentamente,</p>`,
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
    id: 'nuevo-contacto',
    name: 'Nuevo contacto',
    description: 'Empresas nuevas sin convenio',
    subject: 'Presentación del Programa de Formación en Centros de Trabajo (FCT)',
    body: `<p>Estimado/a {{@contacto}},</p>
<p>Mi nombre es {{profesor}} y me dirijo a usted como profesor del {{nombreCentro}} para explorar la posibilidad de que su empresa colabore con nosotros acogiendo a estudiantes para realizar la fase de formación en empresa (FFE). Esta FFE están reguladas por la Ley de Formación Profesional y son un requisito indispensable para que los estudiantes completen su formación académica.</p>
<p>La FFE están diseñadas para que los estudiantes continúen su formación en el ámbito laboral, obteniendo así una experiencia formativa en un entorno de trabajo real.</p>
<p>Confiamos en que esta colaboración no solo será una oportunidad de aprendizaje valiosa para nuestros alumnos, sino también una manera de que su empresa tenga acceso a jóvenes con motivación, energía y conocimientos actualizados que seguro serán útiles en su organización.</p>
<p>Nos encantaría poder concertar una reunión o llamada para hablar en más detalle sobre esta posibilidad y resolver cualquier duda que pudiera tener. </p>
<p>Agradezco de antemano su atención y quedo a la espera de su respuesta.</p>
<p>Un cordial saludo. Atentamente,</p>`,
    documents: [],
    recipientTarget: 'empresa',
    icon: 'contacto',
    color: 'blue',
  },
  {
    id: 'nueva-colaboracion',
    name: 'Nueva colaboración',
    description: 'Empresas con convenio existente',
    subject: 'Colaboración para FCT',
    body: `<p>Estimado/a {{@contacto}},</p>
<p>Desde el {{centroEducativo}} os contactamos para explorar la posibilidad, un curso más, de colaborar para el programa de Formación en Empresas (FFE) del curso {{curso}}.</p>
<p>Queremos seguir colaborando con vosotros porque consideramos que vuestra empresa es un excelente lugar para que nuestros estudiantes realicen sus prácticas formativas.</p>
<p>Necesitamos saber, lo antes posible, si estáis dispuestos a seguir colaborando, y de ser así, que previsión de plazas tendríais.</p>
<p>Si necesitáis más información, no dudéis en contactarnos.</p>
<p>Quedamos a la espera de su respuesta.</p>
<p>Atentamente,</p>`,
    documents: [],
    recipientTarget: 'empresa',
    icon: 'colaboracion',
    color: 'emerald',
  },
  {
    id: 'seg',
    name: 'Envío de seguimiento',
    description: 'Seguimiento → Tutor de la empresa',
    subject: 'Seguimiento FFE',
    body: `<p>Estimado/a, {{contacto}}</p>
<p>Adjuntamos la ficha de seguimiento correspondiente a la fase de formación en empresa.</p>
<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado.</p>
<p>Recuerden que es importante que el seguimiento esté correctamente rellenado y firmado para poder proceder con el proceso. Con respecto a la firma, tenga en cuenta que:</p>
<ul>
    <li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>
    <li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>
</ul>
<p>Agradecemos de antemano su colaboración.</p>
<p>Atentamente,</p>`,
    documents: ['seguimiento'],
    recipientTarget: 'tutor',
    icon: 'seguimiento',
    color: 'blue',
  },
  {
    id: 'val',
    name: 'Envío de valoración',
    description: 'Valoración → Tutor de la empresa',
    subject: 'Valoración FFE',
    body: `<p>Estimado/a, {{contacto}}</p>
<p>Adjuntamos la ficha de valoración correspondiente a la fase de formación en empresa.</p>
<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado.</p>
<p>Con respecto a la firma, tenga en cuenta que:</p>
<ul>
    <li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>
    <li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>
</ul>
<p>Agradecemos de antemano su colaboración.</p>
<p>Atentamente,</p>`,
    documents: ['valoracion'],
    recipientTarget: 'tutor',
    icon: 'valoracion',
    color: 'purple',
  },
  {
    id: 'carta-inicio',
    name: 'Envío de carta de inicio',
    description: 'Carta de inicio → Empresa',
    subject: 'Carta de inicio de las FFE',
    body: `<p>Estimado/a, {{contacto}}</p>
<p>Adjuntamos la carta de inicio correspondiente a la fase de formación en empresa.</p>
<p>En esta carta se especifican aspectos importantes relacionados con el inicio de las FFE, por lo que rogamos revisen el documento detenidamente.</p>
<p>Agradecemos de antemano su colaboración.</p>
<p>Atentamente,</p>`,
    documents: ['carta'],
    recipientTarget: 'empresa',
    icon: 'carta',
    color: 'amber',
  },
  {
    id: 'cal',
    name: 'Envío de calendario',
    description: 'Calendario → Estudiante',
    subject: 'Calendario FFE',
    body: `<p>Estimado/a, {{contacto}}</p>
<p>Adjuntamos el calendario correspondiente a la fase de formación en empresa.</p>
<p>Rogamos revisen el documento detenidamente.</p>
<p>Atentamente,</p>`,
    documents: ['calendario'],
    recipientTarget: 'estudiante_conditional',
    icon: 'calendario',
    color: 'green',
  },
  {
    id: 'otros',
    name: 'Otros',
    description: 'Correo libre sin plantilla predefinida ni documentos adjuntos',
    subject: '',
    body: '',
    documents: [],
    recipientTarget: 'ninguno',
    icon: 'otros',
    color: 'slate',
  },
];

export function getPlantillaById(id: string): PlantillaCorreo | undefined {
  return PLANTILLAS_CORREO.find(p => p.id === id);
}

export function interpolateBody(body: string, placeholders: Record<string, string>): string {
  return body.replace(/\{\{([\wáéíóúÁÉÍÓÚñÑ]+)\}\}/g, (_, key) => placeholders[key] ?? `{{${key}}}`);
}
