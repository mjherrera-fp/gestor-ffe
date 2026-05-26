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
