import React from 'react';
import { X, Mail } from 'lucide-react';
import { EmailTargetType } from '../types/email.ts';

interface EmailTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tipo: EmailTargetType) => void;
  nombreAlumno?: string;
}

export function EmailTypeSelector({
  isOpen,
  onClose,
  onConfirm,
  nombreAlumno,
}: EmailTypeSelectorProps) {
  const [selected, setSelected] = React.useState<EmailTargetType>('educamadrid');

  if (!isOpen) return null;

  const options: { value: EmailTargetType; label: string; description: string; color: string }[] = [
    { value: 'educamadrid', label: 'Correo EducaMadrid', description: 'usuario@educamadrid.org', color: 'blue' },
    { value: 'personal', label: 'Correo Personal', description: 'Correo particular del alumno', color: 'slate' },
    { value: 'ambos', label: 'Ambos', description: 'Enviar a las dos direcciones', color: 'slate' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Seleccionar Correo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {nombreAlumno && (
            <p className="text-sm text-slate-500 mb-4">
              ¿Qué correo deseas usar para <strong className="text-slate-700">{nombreAlumno}</strong>?
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
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-300 bg-slate-50'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected === opt.value
                    ? opt.value === 'educamadrid'
                      ? 'border-blue-500'
                      : 'border-slate-500'
                    : 'border-slate-300'
                }`}>
                  {selected === opt.value && (
                    <div className={`h-2 w-2 rounded-full ${
                      opt.value === 'educamadrid' ? 'bg-blue-500' : 'bg-slate-500'
                    }`} />
                  )}
                </div>
                <div>
                  <span className={`text-sm font-semibold ${
                    selected === opt.value ? 'text-slate-800' : 'text-slate-600'
                  }`}>
                    {opt.label}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
