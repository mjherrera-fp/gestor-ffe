/**
 * El contenido del CV de un alumno tal y como esta guardado en `alumnos.cvPath`.
 *
 * El CV se guarda como data URI (`data:application/pdf;base64,JVBERi...`).
 * Para adjuntarlo hay que decodificar solo lo que va detras de la coma: si se
 * pasa la cadena entera a `Buffer.from(..., 'base64')`, Node se salta los
 * caracteres que no son base64 (`:`, `;`, `,`) pero decodifica las letras de
 * la cabecera ("data", "application", "pdf", "base64") como bytes. El fichero
 * sale con basura delante de `%PDF`, y el correo del destinatario lo marca
 * como sospechoso porque se declara PDF y su contenido no lo es.
 *
 * Tambien acepta base64 sin cabecera, por si quedara algun CV guardado asi.
 */
export function cvABuffer(cv: string): Buffer {
  const coma = cv.startsWith('data:') ? cv.indexOf(',') : -1;
  return Buffer.from(coma >= 0 ? cv.slice(coma + 1) : cv, 'base64');
}
