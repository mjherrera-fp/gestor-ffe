import React from 'react';
import { X } from 'lucide-react';
import { TutorEmpresa } from '../../../types/index.ts';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1';

interface TutorFormModalProps {
  editing: TutorEmpresa | null;
  formData: Partial<TutorEmpresa>;
  onChange: (data: Partial<TutorEmpresa>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function TutorFormModal({ editing, formData, onChange, onSubmit, onClose }: TutorFormModalProps) {
  const update = (field: keyof TutorEmpresa) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {editing ? 'Editar Tutor' : 'Nuevo Tutor'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input required className={inputCls} value={formData.nombre || ''} onChange={update('nombre')} />
            </div>
            <div>
              <label className={labelCls}>Apellidos</label>
              <input required className={inputCls} value={formData.apellidos || ''} onChange={update('apellidos')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>NIF / NIE</label>
            <input required className={inputCls} value={formData.nif || ''} onChange={update('nif')} />
          </div>
          <div>
            <label className={labelCls}>Email Directo</label>
            <input required type="email" className={inputCls} value={formData.email || ''} onChange={update('email')} />
          </div>
          <div>
            <label className={labelCls}>Teléfono Directo</label>
            <input required className={inputCls} value={formData.tlfn || ''} onChange={update('tlfn')} />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Confirmar Tutor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
