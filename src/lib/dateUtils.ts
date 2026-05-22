export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
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
