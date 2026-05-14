import React from 'react';
import { Trash2, Archive, RotateCcw } from 'lucide-react';
import { ConfirmAction } from '../hooks/useCursos.ts';

interface ConfirmActionModalProps {
  action: ConfirmAction;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIG = {
  delete: {
    icon:    Trash2,
    iconBg:  'bg-red-50 text-red-600',
    title:   '¿Eliminar curso?',
    message: 'Se eliminará TODA la información asociada (alumnos, convenios, relaciones). Esta acción es irreversible.',
    btnCls:  'bg-red-600 hover:bg-red-700',
    label:   'Eliminar',
  },
  archive: {
    icon:    Archive,
    iconBg:  'bg-amber-50 text-amber-600',
    title:   '¿Archivar curso?',
    message: 'El curso dejará de aparecer en los selectores principales.',
    btnCls:  'bg-amber-600 hover:bg-amber-700',
    label:   'Archivar',
  },
  restore: {
    icon:    RotateCcw,
    iconBg:  'bg-amber-50 text-amber-600',
    title:   '¿Restaurar curso?',
    message: 'El curso volverá a estar activo y disponible en todos los selectores.',
    btnCls:  'bg-amber-600 hover:bg-amber-700',
    label:   'Restaurar',
  },
};

export function ConfirmActionModal({ action, onConfirm, onCancel }: ConfirmActionModalProps) {
  const cfg = CONFIG[action.type];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${cfg.iconBg}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{cfg.title}</h3>
        <p className="text-slate-500 text-sm mb-6">{cfg.message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-lg text-white font-semibold transition-colors ${cfg.btnCls}`}
          >
            Sí, {cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}
