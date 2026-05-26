import React from 'react';
import { X, Calendar } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal.tsx';

interface HorasWarningModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HorasWarningModal({ open, onConfirm, onCancel }: HorasWarningModalProps) {
  return (
    <Modal open={open} onClose={onCancel} zIndex={70} maxWidth="md" cardClass="rounded-4xl p-8 relative">
        <button
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="h-8 w-8" />
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-3">Atención: Horas modificadas</h3>
        <p className="text-sm text-slate-500 font-medium mb-8">
          Has modificado el total de horas de un alumno que ya está asignado a una relación de
          prácticas. <br /><br />
          De continuar, <b>se eliminarán su Fecha de Inicio y Fecha de Fin</b> actuales, ya que sus
          prácticas deben ser recalculadas en el panel de Relaciones.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-amber-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all font-sans"
          >
            Sí, borrar fechas
          </button>
        </div>
    </Modal>
  );
}
