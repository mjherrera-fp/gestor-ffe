import React from 'react';
import { Plus } from 'lucide-react';
import { CentroEducativo } from '../../../types/index.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface CentroFormModalProps {
  editing: CentroEducativo | null;
  formData: Partial<CentroEducativo>;
  onChange: (data: Partial<CentroEducativo>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CentroFormModal({ editing, formData, onChange, onSubmit, onClose }: CentroFormModalProps) {
  const update = (field: keyof CentroEducativo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
            {editing ? 'Editar Centro' : 'Añadir Nuevo Centro'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45 h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-4">
          <div>
            <label className={labelClass}>Nombre del Centro</label>
            <input
              required
              className={inputClass}
              value={formData.nombre || ''}
              onChange={update('nombre')}
            />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input
              required
              className={inputClass}
              value={formData.ciudad || ''}
              onChange={update('ciudad')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                required
                className={inputClass}
                value={formData.telefono || ''}
                onChange={update('telefono')}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                required
                type="email"
                className={inputClass}
                value={formData.email || ''}
                onChange={update('email')}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all mt-6 shadow-xl shadow-primary/20"
          >
            Guardar Centro Educativo
          </button>
        </form>
      </div>
    </div>
  );
}
