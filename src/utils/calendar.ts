// Helpers RFC 5545 (iCalendar / .ics)

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// "YYYY-MM-DDTHH:MM[:SS]" (hora local) → "YYYYMMDDTHHMMSS" (hora flotante local)
export function formatIcsDateTime(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return '';
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] ? m[6] : '00'}`;
}

function nowUtcIcs(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcs(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// Plegado de líneas largas (>75 octetos) según RFC 5545
function foldIcs(content: string): string {
  const enc = new TextEncoder();
  return content
    .split(/\r?\n/)
    .map(line => {
      const chunks: string[] = [];
      let buffer = '';
      let size = 0;
      for (const ch of line) {
        const len = enc.encode(ch).length;
        const limit = chunks.length === 0 ? 75 : 74; // las continuaciones llevan 1 espacio al inicio
        if (buffer && size + len > limit) {
          chunks.push(buffer);
          buffer = ch;
          size = len;
        } else {
          buffer += ch;
          size += len;
        }
      }
      if (buffer) chunks.push(buffer);
      return chunks.map((c, i) => (i === 0 ? c : ' ' + c)).join('\r\n');
    })
    .join('\r\n');
}

export interface IcsEventInput {
  summary: string;
  location?: string;
  description?: string;
  categories?: string;
  start: string; // "YYYY-MM-DDTHH:MM" local
  end: string;   // "YYYY-MM-DDTHH:MM" local
}

export function buildIcsEvent({ summary, location, description, categories, start, end }: IcsEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gestor FFE//CITA//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-cita@gestor-ffe`,
    `DTSTAMP:${nowUtcIcs()}`,
    `DTSTART:${formatIcsDateTime(start)}`,
    `DTEND:${formatIcsDateTime(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  if (categories) lines.push(`CATEGORIES:${escapeIcs(categories)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return foldIcs(lines.join('\r\n'));
}

// Fallback cuando la app no corre dentro de Electron (download normal)
export function downloadIcsFallback(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}