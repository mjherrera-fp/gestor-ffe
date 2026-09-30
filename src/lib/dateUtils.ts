const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/**
 * Formatea una fecha de la base de datos en `dd/MM/yyyy`.
 *
 * La fecha se parte como texto y nunca se convierte con `new Date(iso)`. Por
 * especificacion una cadena 'YYYY-MM-DD' se interpreta como medianoche UTC, asi
 * que leerla despues con los getters locales devuelve el dia anterior en
 * cualquier huso por detras de UTC. En la base de datos todas las fechas se
 * guardan solo-fecha, asi que ese es el caso habitual: en Espana no se nota,
 * pero en otra zona el documento saldria con un dia de mas o de menos.
 *
 * Un valor vacio, null o un texto que no sea una fecha devuelve cadena vacia.
 * Antes `new Date('')` daba una fecha invalida y `toLocaleDateString` imprimia
 * literalmente 'Invalid Date' en los documentos.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';

  // 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS': la fecha son los tres primeros
  // grupos, lo que haya detras es la hora y no altera el dia.
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  if (!anio || !mes || !dia) return '';

  const a = Number(anio);
  const m = Number(mes);
  const d = Number(dia);
  if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(d)) return '';
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';

  return `${dosDigitos(d)}/${dosDigitos(m)}/${a}`;
}

/** Formatea datetime SQLite (UTC) a dd/MM/yyyy HH:mm en hora local */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const [datePart, timePart] = iso.split(' ');
  if (!datePart || !timePart) return iso;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss = 0] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}:${seconds}`;
}
