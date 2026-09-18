export interface EmailTemplate {
  id: string;
  category: 'empresa' | 'estudiante';
  name: string;
  subject: string;
  body: string;
  icon: string;
  color: 'blue' | 'green';
}

export interface EmailAttachment {
  id: string;
  filename: string;
  path: string;
  size: number;
  source: 'manual' | 'generated';
}

export interface EmailSendRequest {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  attachments: { filename: string; path: string }[];
  sendIndividual: boolean;
  delayMs: number;
}

export type EmailTargetType = 'educamadrid' | 'personal' | 'ambos';

export interface PlantillaCorreo {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  documents: string[];
  recipientTarget: 'empresa' | 'tutor' | 'estudiante_conditional' | 'ninguno';
  icon: string;
  color: string;
}

export interface PlantillaCorreoDB {
  id: number;
  plantillaId: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  documents: string;
  recipientTarget: string;
  icon: string;
  color: string;
  place: 'empresa' | 'relaciones' | 'alumno' | '';
  tipo: 'sistema' | 'personal';
  grupo?: string;
}

export interface MarcadorPersonalizado {
  id: number;
  nombre: string;
  valor: string;
  descripcion: string;
}

export interface Contacto {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
}

export type GrupoOrigenTipo = 'contacto' | 'empresa' | 'estudiante' | 'tutor';

export interface GrupoMiembro {
  id: number;
  grupoId: number;
  tipoOrigen: GrupoOrigenTipo;
  origenId: number;
}

export interface GrupoMiembroResolved {
  id: number;
  grupoId: number;
  tipoOrigen: GrupoOrigenTipo;
  origenId: number;
  nombre: string;
  email: string;
}

export interface GrupoContacto {
  id: number;
  nombre: string;
  miembros: GrupoMiembroResolved[];
}
