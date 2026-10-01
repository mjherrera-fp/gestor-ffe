/**
 * Marcadores de las plantillas de correo: catálogo y motor de interpolación.
 *
 * El catálogo es la lista de lo que de verdad se puede escribir en cada ámbito,
 * y es la única fuente: la pantalla de configuración lo muestra y el motor lo
 * usa para saber qué marcadores deberían haber salido resueltos.
 *
 * Antes el catálogo era una lista escrita a mano en la pantalla de configuración
 * y el motor resolvía con lo que cada hook compilase en su contexto. Las dos
 * cosas se separaron hasta que el catálogo ofrecía marcadores que ningún
 * ámbito implementaba, y el profesor los escribía en su plantilla para que al
 * enviar llegaran a la empresa tal cual, con las llaves puestas.
 *
 * Reglas que sostiene este archivo:
 *
 *  · Un marcador solo aparece en el catálogo si algún ámbito lo resuelve. Si no
 *    se puede resolver, no se ofrece.
 *  · Un marcador que no se puede resolver se sustituye por texto vacío y se
 *    avisa. Nunca se envía `{{algo}}` en crudo a la empresa.
 *  · Los marcadores por destinatario (`{{@contacto}}`) los sustituye el modal
 *    de correo uno a uno, no este motor. Aqui solo se listan.
 */

export type AmbitoMarcador = 'empresa' | 'relaciones' | 'alumno' | 'convenio';

export interface MarcadorInfo {
  /** Se escribe sin llaves: `empresa.nombre`, `contacto`. */
  clave: string;
  /** Texto que se muestra al profesor para reconocerlo. */
  etiqueta: string;
  /** Agrupación para leer la lista de un vistazo. */
  grupo: string;
  /** `true` si se sustituye por destinatario, con el prefijo `{{@...}}`. */
  porDestinatario?: boolean;
}

export const MARCADORES_POR_AMBITO: Record<AmbitoMarcador, MarcadorInfo[]> = {
  // Envío desde la ficha de una relación. Hay empresa, tutor, centro, curso y
  // alumnado, asi que es el ámbito más completo.
  relaciones: [
    { clave: 'profesor.nombre', etiqueta: 'Nombre del profesor', grupo: 'Profesor' },
    { clave: 'profesor.apellidos', etiqueta: 'Apellidos del profesor', grupo: 'Profesor' },
    { clave: 'empresa.nombre', etiqueta: 'Nombre de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.direccion', etiqueta: 'Dirección de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.personaContacto', etiqueta: 'Persona de contacto', grupo: 'Empresa' },
    { clave: 'tutor.nombre', etiqueta: 'Nombre del tutor de empresa', grupo: 'Tutor' },
    { clave: 'tutor.apellidos', etiqueta: 'Apellidos del tutor de empresa', grupo: 'Tutor' },
    { clave: 'centro.nombre', etiqueta: 'Nombre del centro', grupo: 'Centro y curso' },
    { clave: 'curso.descripcion', etiqueta: 'Descripción del curso', grupo: 'Centro y curso' },
    { clave: 'relacion.numRelacion', etiqueta: 'Número de relación', grupo: 'Relación' },
    { clave: 'nombreApellidosAlumnos', etiqueta: 'Alumnado de la relación', grupo: 'Alumnado' },
    { clave: 'alumnoTutor', etiqueta: 'A quién va dirigido el correo', grupo: 'Alumnado' },
    { clave: 'contacto', etiqueta: 'Contacto del destinatario', grupo: 'Por destinatario', porDestinatario: true },
    { clave: 'nombreEmpresa', etiqueta: 'Empresa del destinatario', grupo: 'Por destinatario', porDestinatario: true },
  ],

  // Envío a una empresa suelta, desde su ficha. No hay relación, asi que ni
  // tutor ni alumnado, y el centro y el curso son los de esa empresa.
  empresa: [
    { clave: 'profesor.nombre', etiqueta: 'Nombre del profesor', grupo: 'Profesor' },
    { clave: 'profesor.apellidos', etiqueta: 'Apellidos del profesor', grupo: 'Profesor' },
    { clave: 'empresa.nombre', etiqueta: 'Nombre de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.direccion', etiqueta: 'Dirección de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.personaContacto', etiqueta: 'Persona de contacto', grupo: 'Empresa' },
    { clave: 'centro.nombre', etiqueta: 'Nombre del centro', grupo: 'Centro y curso' },
    { clave: 'curso.descripcion', etiqueta: 'Descripción del curso', grupo: 'Centro y curso' },
    { clave: 'contacto', etiqueta: 'Contacto del destinatario', grupo: 'Por destinatario', porDestinatario: true },
    { clave: 'nombreEmpresa', etiqueta: 'Empresa del destinatario', grupo: 'Por destinatario', porDestinatario: true },
  ],

  // Envío del CV a una empresa interesada en un alumno suelto.
  alumno: [
    { clave: 'profesor.nombre', etiqueta: 'Nombre del profesor', grupo: 'Profesor' },
    { clave: 'profesor.apellidos', etiqueta: 'Apellidos del profesor', grupo: 'Profesor' },
    { clave: 'empresa.nombre', etiqueta: 'Nombre de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.personaContacto', etiqueta: 'Persona de contacto', grupo: 'Empresa' },
    { clave: 'contacto', etiqueta: 'Contacto del destinatario', grupo: 'Por destinatario', porDestinatario: true },
    { clave: 'nombreEmpresa', etiqueta: 'Empresa del destinatario', grupo: 'Por destinatario', porDestinatario: true },
  ],

  // Envío desde la ficha de un convenio. Hay empresa, centro, curso y los datos
  // del convenio, pero no hay relación ni tutor, así que el alumnado y el tutor
  // no se ofrecen: no hay de dónde sacarlos.
  convenio: [
    { clave: 'profesor.nombre', etiqueta: 'Nombre del profesor', grupo: 'Profesor' },
    { clave: 'profesor.apellidos', etiqueta: 'Apellidos del profesor', grupo: 'Profesor' },
    { clave: 'empresa.nombre', etiqueta: 'Nombre de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.direccion', etiqueta: 'Dirección de la empresa', grupo: 'Empresa' },
    { clave: 'empresa.personaContacto', etiqueta: 'Persona de contacto', grupo: 'Empresa' },
    { clave: 'centro.nombre', etiqueta: 'Nombre del centro', grupo: 'Centro y curso' },
    { clave: 'curso.descripcion', etiqueta: 'Descripción del curso', grupo: 'Centro y curso' },
    { clave: 'convenio.numConvenio', etiqueta: 'Número de convenio', grupo: 'Convenio' },
    { clave: 'convenio.fechaConvenio', etiqueta: 'Fecha del convenio', grupo: 'Convenio' },
    { clave: 'contacto', etiqueta: 'Contacto del destinatario', grupo: 'Por destinatario', porDestinatario: true },
    { clave: 'nombreEmpresa', etiqueta: 'Empresa del destinatario', grupo: 'Por destinatario', porDestinatario: true },
  ],
};

/** Cómo se escribe un marcador en la plantilla, con sus llaves. */
export function textoMarcador(marcador: MarcadorInfo): string {
  return `{{${marcador.porDestinatario ? '@' : ''}${marcador.clave}}}`;
}

/**
 * Marcadores que se pueden usar en un ámbito.
 *
 * Una plantilla sin `place` se trata como de empresas: es lo que ocurre al
 * crear una personal sin tocar el ámbito, y evita que la lista quede vacía.
 */
export function marcadoresDeAmbito(ambito: string | null | undefined): MarcadorInfo[] {
  return MARCADORES_POR_AMBITO[(ambito as AmbitoMarcador)] || MARCADORES_POR_AMBITO.empresa;
}

/**
 * Los mismos marcadores que un regex normal aceptaría, sin validar. Los `per_`
 * quedan fuera: son los personalizados, y los resuelve `applyCustomMarkers`.
 */
const REGEX_MARCADOR = /\{\{([\wáéíóúÁÉÍÓÚñÑ.]+)\}\}/g;

/**
 * Sustituye los marcadores por su valor y avisa de los que no pudo resolver.
 *
 * Un marcador sin valor se queda en texto vacío. La razón de no dejarlo tal
 * cual es que el correo lo lee la empresa, no el profesor: `Hola
 * {{profesor.nombre}}` en un correo enviado no es un marcador pendiente, es un
 * fallo. Como el envío no se bloquea, el nombre se avisa aparte.
 *
 * Una cadena vacía cuenta como sin resolver: `Estimado/a, ` sin nombre detrás
 * es justo el fallo que de otro modo no se ve.
 */
export function interpolarCuerpo(
  cuerpo: string,
  contexto: Record<string, any>
): { texto: string; sinResolver: string[] } {
  const sinResolver: string[] = [];

  const texto = cuerpo.replace(REGEX_MARCADOR, (_marcador, clave: string) => {
    const valor = clave.split('.').reduce((obj: any, parte: string) => obj?.[parte], contexto);

    if (valor === undefined || valor === null || String(valor).trim() === '') {
      if (!sinResolver.includes(clave)) sinResolver.push(clave);
      return '';
    }
    return String(valor);
  });

  return { texto, sinResolver };
}

/**
 * Marcadores escritos en el cuerpo que ese ámbito no puede resolver.
 *
 * Sirve para avisar en la pantalla de configuración, que es donde se escribe
 * la plantilla y donde se puede corregir. Un `{{...}}` desconocido casi siempre
 * es una errata, y sin avisar se descubre al abrir el correo ya enviado.
 */
export function marcadoresAjenos(cuerpo: string, ambito: string | null | undefined): string[] {
  const conocidos = new Set(marcadoresDeAmbito(ambito).map(m => m.clave));
  const ajenos = new Set<string>();

  for (const coincidencia of cuerpo.matchAll(REGEX_MARCADOR)) {
    const clave = coincidencia[1];
    if (clave.startsWith('per_')) continue;  // personalizados
    if (!conocidos.has(clave)) ajenos.add(`{{${clave}}}`);
  }

  return [...ajenos];
}

/**
 * Marcadores personalizados: `{{per_nombre}}` con el valor que le dio el
 * profesor en Configuración > Correo.
 */
export function applyCustomMarkers(
  cuerpo: string,
  marcadores: Array<{ nombre: string; valor: string }>
): string {
  let resultado = cuerpo;
  for (const m of marcadores) {
    // Se escapa el nombre: es texto escrito por el profesor y puede llevar
    // puntos, que en un regex son comodines.
    const nombre = m.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    resultado = resultado.replace(new RegExp(`\\{\\{per_${nombre}\\}\\}`, 'g'), m.valor);
  }
  return resultado;
}
