import { EmailAttachment } from '../types/email.ts';
import { uploadGeneratedAttachment } from './emailUtils.ts';

/**
 * Qué documento se manda en cada correo, y de dónde se saca.
 *
 * La prioridad es siempre la misma y va en este orden:
 *
 *  1. La última versión que haya en el gestor documental. Si el profesor ha
 *     subido o corregido un documento a mano, ese es el bueno: es el que ha
 *     revisado, y el que debe salir. El autogenerado es una borrador de
 *     trabajo, no la versión buena.
 *  2. Si no hay nada en el gestor documental, el documento que genera la
 *     aplicación.
 *  3. Si tampoco se puede generar, no se adjunta nada. Un hueco en los
 *     adjuntos se ve; un documento equivocado, no.
 */

/** Los tipos de documento que se pueden mandar por correo. */
export type TipoDocCorreo = 'relacion' | 'plan' | 'seguimiento' | 'valoracion' | 'calendario' | 'carta' | 'convenio';

/**
 * Dónde vive cada tipo en el gestor documental.
 *
 * `calendario` y `carta` no tienen tabla: se generan al vuelo y no se archivan,
 * así que nunca hay una versión subida que mandar. Van a `null` a propósito,
 * para que la diferencia sea visible en vez de tener un caso especial más
 * adelante.
 */
export const TIPO_A_GESTOR: Partial<Record<TipoDocCorreo, string>> = {
  relacion: 'relacion',
  plan: 'plan-formativo',
  seguimiento: 'seguimiento',
  valoracion: 'valoracion',
  calendario: null,
  carta: null,
  convenio: 'convenio',
};

/** Si el tipo es de un solo alumno o de la relación entera. */
const POR_ALUMNO: Partial<Record<TipoDocCorreo, boolean>> = {
  plan: true,
  seguimiento: true,
  valoracion: true,
  calendario: true,
};

export const esDocPorAlumno = (tipo: TipoDocCorreo) => !!POR_ALUMNO[tipo];

/**
 * De qué registro cuelga el documento.
 *
 * No es un único identificador porque cada tipo se archiva bajo lo suyo: las
 * relaciones y los documentos de alumno cuelgan de la relación, y los del
 * convenio del convenio. Por eso van con nombre en vez de como parámetros
 * posicionales: un `convenioId` en el segundo hueco, donde el resto espera un
 * `relacionId`, se leería bien y se enviaría a la tabla equivocada.
 *
 * Un documento que no encaja con el destino se queda sin adjunto en vez de
 * buscarse en un sitio que no es el suyo.
 */
export interface DestinoDocumento {
  relacionId?: number;
  alumnoId?: number;
  convenioId?: number;
}

/**
 * La última versión del gestor documental, o `null` si no hay ninguna.
 *
 * El gestor ordena sus versiones de más a menos nueva a menos, así que la
 * primera es la última. Se pide solo el identificador, el nombre y la versión:
 * el contenido se descarga después por su ruta de siempre, para no traer el
 * archivo entero en la respuesta de la búsqueda.
 */
export async function buscarUltimaVersion(
  tipo: TipoDocCorreo,
  destino: DestinoDocumento
): Promise<{ id: number; nombreFichero: string; version: number; rutaDescarga: string } | null> {
  const gestor = TIPO_A_GESTOR[tipo];
  if (!gestor) return null;  // este tipo no se archiva: hay que generarlo

  const params = new URLSearchParams({ tipo: gestor });

  // El convenio tiene su propio gestor documental, colgado del convenio. Los
  // demás cuelgan de la relación, y los de alumno además del alumno.
  if (gestor === 'convenio') {
    if (!destino.convenioId) return null;
    params.set('convenioId', String(destino.convenioId));
  } else {
    if (!destino.relacionId) return null;
    params.set('relacionId', String(destino.relacionId));
    if (esDocPorAlumno(tipo)) {
      if (!destino.alumnoId) return null;
      params.set('alumnoId', String(destino.alumnoId));
    }
  }

  const res = await fetch(`/api/documentos/adjunto?${params.toString()}`);
  // 404 quiere decir que no hay nada subido. También se acepta el 404 de
  // "no existe" sin documento, que para este caso es lo mismo.
  if (!res.ok) return null;

  const doc = await res.json();
  if (!doc?.id) return null;

  return {
    id: doc.id,
    nombreFichero: doc.nombreFichero,
    version: doc.version,
    rutaDescarga: `/api/documentos/${gestor}/${doc.id}/download`,
  };
}

/**
 * El adjunto de un documento tal y como hay que mandarlo, o `null` si no hay
 * ninguna versión de la que echar mano.
 *
 * Se descarga de nuevo para pasarlo por el mismo camino que los demás
 * adjuntos, en `uploads/temp/`. Va marcado como `generated` porque para el
 * modal es indistinto de un autogenerado: lo que lo distingue es de dónde ha
 * salido, y eso ya está decidido aquí.
 */
export async function adjuntoDesdeGestor(
  tipo: TipoDocCorreo,
  destino: DestinoDocumento
): Promise<EmailAttachment | null> {
  try {
    const ultima = await buscarUltimaVersion(tipo, destino);
    if (!ultima) return null;

    const res = await fetch(ultima.rutaDescarga);
    if (!res.ok) return null;

    const blob = await res.blob();
    if (blob.size === 0) return null;

    return uploadGeneratedAttachment(blob, ultima.nombreFichero);
  } catch {
    // Un adjunto que no se puede leer no debe impedir abrir el correo: se cae
    // al documento autogenerado, que para eso está. En los tipos que no se
    // autogeneran, como el convenio, el correo se abre sin adjunto.
    return null;
  }
}
