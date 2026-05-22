import React from 'react';
import { X } from 'lucide-react';
import { Curso } from '../../../types/index.ts';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

interface CursoFormModalProps {
  editing: Curso | null;
  formData: Partial<Curso>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Curso>>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CursoFormModal({
  editing, formData, setFormData,
  onSubmit, onClose,
}: CursoFormModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="text-xl font-bold text-slate-800">
            {editing ? 'Editar Curso' : 'Crear Nuevo Curso'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6 overflow-y-auto">

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <input
              required
              className={inputCls}
              value={formData.descripcion || ''}
              onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Ej: Curso 2025-2026"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input
                required
                type="date"
                className={inputCls}
                value={formData.fechaInicio || ''}
                onChange={e => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input
                required
                type="date"
                className={inputCls}
                value={formData.fechaFin || ''}
                onChange={e => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              {editing ? 'Actualizar' : 'Crear Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
