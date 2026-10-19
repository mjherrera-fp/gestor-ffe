/**
 * Nombre y tipo con los que sale cada adjunto de un correo.
 *
 * Nodemailer declara el tipo del adjunto por la extension del nombre, no por
 * lo que contiene. Eso falla de dos formas, y las dos acaban en el aviso del
 * correo del destinatario ("adjunto sospechoso: esperado pdf y encontrado
 * .bin"):
 *
 *  - Un nombre sin extension se declara `application/octet-stream`. Pasa con
 *    los documentos del gestor documental, cuyo nombre se escribe a mano.
 *  - Un nombre con la extension de otro tipo (un .docx llamado .pdf) declara
 *    un tipo que el contenido no cumple.
 *
 * Aqui se mira el contenido, y si se reconoce manda el: el nombre lleva su
 * extension y el tipo se declara a partir de el. Si el contenido no se
 * reconoce no se toca nada, y nodemailer decide como siempre.
 */

interface TipoArchivo {
  /** Extension que se le pone al nombre si no lleva una valida. */
  extension: string;
  /** Extensiones que ya son correctas para este contenido, en minusculas. */
  validas: string[];
  mime: string;
}

const PDF: TipoArchivo = { extension: 'pdf', validas: ['pdf'], mime: 'application/pdf' };
const PNG: TipoArchivo = { extension: 'png', validas: ['png'], mime: 'image/png' };
const JPG: TipoArchivo = { extension: 'jpg', validas: ['jpg', 'jpeg'], mime: 'image/jpeg' };
const GIF: TipoArchivo = { extension: 'gif', validas: ['gif'], mime: 'image/gif' };
const DOCX: TipoArchivo = { extension: 'docx', validas: ['docx', 'docm', 'dotx'], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const XLSX: TipoArchivo = { extension: 'xlsx', validas: ['xlsx', 'xlsm', 'xltx'], mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const PPTX: TipoArchivo = { extension: 'pptx', validas: ['pptx', 'pptm', 'potx'], mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const ODT: TipoArchivo = { extension: 'odt', validas: ['odt'], mime: 'application/vnd.oasis.opendocument.text' };
const ODS: TipoArchivo = { extension: 'ods', validas: ['ods'], mime: 'application/vnd.oasis.opendocument.spreadsheet' };
const ZIP: TipoArchivo = { extension: 'zip', validas: ['zip'], mime: 'application/zip' };

/**
 * Las extensiones que significan un tipo de archivo. Solo una de estas se
 * sustituye al corregir el nombre: en "Convenio v1.2" el ".2" no es una
 * extension, y se le añade ".pdf" en vez de cambiarlo por ".pdf".
 */
const EXTENSIONES_DE_TIPO = new Set([
  ...[PDF, PNG, JPG, GIF, DOCX, XLSX, PPTX, ODT, ODS, ZIP].flatMap(t => t.validas),
  'doc', 'xls', 'ppt', 'rtf', 'txt', 'csv', 'html', 'htm', 'bin', 'dat', 'odp', 'rar', '7z', 'webp', 'bmp', 'tif', 'tiff',
]);

const empiezaPor = (buf: Buffer, bytes: number[]) =>
  buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

/** El tipo del archivo segun sus primeros bytes, o `null` si no se reconoce. */
export function tipoPorContenido(buf: Buffer): TipoArchivo | null {
  if (empiezaPor(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF;                  // %PDF-
  if (empiezaPor(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return PNG;
  if (empiezaPor(buf, [0xff, 0xd8, 0xff])) return JPG;
  if (empiezaPor(buf, [0x47, 0x49, 0x46, 0x38])) return GIF;                         // GIF8
  if (empiezaPor(buf, [0x50, 0x4b, 0x03, 0x04])) {                                   // PK: zip
    // Office y OpenDocument son zips. Se distinguen por lo que llevan dentro,
    // cuyos nombres van en claro en las cabeceras del zip.
    const mimetypeOdf = buf.subarray(30, 30 + 80).toString('latin1');
    if (mimetypeOdf.includes('application/vnd.oasis.opendocument.text')) return ODT;
    if (mimetypeOdf.includes('application/vnd.oasis.opendocument.spreadsheet')) return ODS;
    if (buf.includes('word/')) return DOCX;
    if (buf.includes('xl/')) return XLSX;
    if (buf.includes('ppt/')) return PPTX;
    return ZIP;
  }
  return null;
}

/**
 * El nombre y el tipo con que hay que mandar el adjunto. `contentType` es
 * `undefined` cuando el contenido no se reconoce, para que nodemailer siga
 * deduciendolo del nombre.
 */
export function normalizarAdjunto(nombre: string, contenido: Buffer): { filename: string; contentType?: string } {
  const tipo = tipoPorContenido(contenido);
  if (!tipo) return { filename: nombre };

  const punto = nombre.lastIndexOf('.');
  const ext = punto > 0 ? nombre.slice(punto + 1).toLowerCase() : '';

  // La extension ya cuadra con el contenido: nodemailer declarara bien el
  // tipo por ella, incluidas variantes como .xlsm que aqui no se distinguen.
  if (tipo.validas.includes(ext)) return { filename: nombre };

  const base = EXTENSIONES_DE_TIPO.has(ext) ? nombre.slice(0, punto) : nombre;
  return { filename: `${base || 'adjunto'}.${tipo.extension}`, contentType: tipo.mime };
}

/**
 * Cabecera `Content-Disposition` para servir un documento por su nombre.
 *
 * El nombre de los documentos del gestor se escribe a mano, y Node rechaza
 * (ERR_INVALID_CHAR) una cabecera con caracteres fuera de latin1, como "€" o
 * las comillas tipograficas: la descarga daba error y el documento se quedaba
 * sin adjuntar. Se manda un nombre ASCII de respaldo y el real codificado en
 * `filename*` (RFC 6266), que es el que usan los navegadores.
 */
export function contentDispositionInline(nombre: string): string {
  const ascii = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
