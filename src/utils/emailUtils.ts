import { EmailAttachment, EmailTargetType } from '../types/email.ts';
import { Alumno, Empresa } from '../types/index.ts';

export function getEmpresaEmail(empresa: Empresa): string[] {
  return empresa.email ? [empresa.email] : [];
}

export function getAlumnoEmails(alumno: Alumno, tipo: EmailTargetType): string[] {
  switch (tipo) {
    case 'educamadrid':
      return alumno.emailEduca ? [alumno.emailEduca] : [];
    case 'personal':
      return alumno.emailPersonal ? [alumno.emailPersonal] : [];
    case 'ambos': {
      const emails: string[] = [];
      if (alumno.emailEduca) emails.push(alumno.emailEduca);
      if (alumno.emailPersonal) emails.push(alumno.emailPersonal);
      return emails;
    }
  }
}

export function getBulkEmpresaEmails(empresas: Empresa[]): string[] {
  return empresas.map(e => e.email).filter(Boolean) as string[];
}

export function getBulkAlumnoEmails(alumnos: Alumno[], tipo: EmailTargetType): string[] {
  const emails: string[] = [];
  for (const a of alumnos) {
    const e = getAlumnoEmails(a, tipo);
    emails.push(...e);
  }
  return [...new Set(emails)];
}

export async function uploadAttachment(
  file: File | Blob,
  filename: string
): Promise<EmailAttachment> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const res = await fetch('/api/email/upload-attachment', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Error al subir adjunto');

  const data = await res.json();
  return {
    id: crypto.randomUUID(),
    filename: data.filename,
    path: data.path,
    size: data.size,
    source: 'manual',
  };
}

export async function uploadGeneratedAttachment(
  blob: Blob,
  filename: string
): Promise<EmailAttachment> {
  const formData = new FormData();
  formData.append('file', blob, filename);

  const res = await fetch('/api/email/upload-attachment', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Error al subir adjunto generado');

  const data = await res.json();
  return {
    id: crypto.randomUUID(),
    filename,
    path: data.path,
    size: data.size,
    source: 'generated',
  };
}

export async function deleteAttachment(path: string): Promise<void> {
  await fetch('/api/email/upload-attachment', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

export function fillTemplate(
  template: string,
  placeholders: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}
