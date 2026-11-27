import React from 'react';
import { X, Mail } from 'lucide-react';
import { EmailTargetType } from '../types/email.ts';
import { Modal } from './ui/Modal.tsx';
import { useEmailHabilitado } from '../hooks/useEnvioEmail.ts';

interface EmailTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tipo: EmailTargetType) => void;
  nombreAlumno?: string;
}

export function EmailTypeSelector({
  open,
  onClose,
  onConfirm,
  nombreAlumno,
}: EmailTypeSelectorProps) {
  const emailHabilitado = useEmailHabilitado();
  const [selected, setSelected] = React.useState<EmailTargetType>('educamadrid');

  const options: { value: EmailTargetType; label: string; description: string; color: string }[] = [
    { value: 'educamadrid', label: 'Correo EducaMadrid', description: 'usuario@educa.madrid.org', color: 'blue' },
    { value: 'personal', label: 'Correo Personal', description: 'Correo particular del alumno', color: 'slate' },
    { value: 'ambos', label: 'Ambos', description: 'Enviar a las dos direcciones', color: 'slate' },
  ];

  return (
    <Modal open={open && emailHabilitado} onClose={onClose} maxWidth="sm" backdropClass="bg-overlay backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-base">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-text-main">Seleccionar Correo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-lg transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {nombreAlumno && (
            <p className="text-sm text-text-muted mb-4">
              ¿Qué correo deseas usar para <strong className="text-text-main">{nombreAlumno}</strong>?
            </p>
          )}

          <div className="space-y-2">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selected === opt.value
                    ? opt.value === 'educamadrid'
                      ? 'border-primary-light bg-primary-light/60'
                      : 'border-border-base bg-surface-subtle'
                    : 'border-border-base hover:border-border-base bg-surface-card'
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected === opt.value
                    ? opt.value === 'educamadrid'
                      ? 'border-primary'
                      : 'border-text-muted'
                    : 'border-border-base'
                }`}>
                  {selected === opt.value && (
                    <div className={`h-2 w-2 rounded-full ${
                      opt.value === 'educamadrid' ? 'bg-primary' : 'bg-text-muted'
                    }`} />
                  )}
                </div>
                <div>
                  <span className={`text-sm font-semibold ${
                    selected === opt.value ? 'text-text-main' : 'text-text-main'
                  }`}>
                    {opt.label}
                  </span>
                  <p className="text-[10px] text-text-muted mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl border border-border-base transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Aceptar
          </button>
        </div>
    </Modal>
  );
}
