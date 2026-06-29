import React from 'react';
import { X } from 'lucide-react';
import { TutorEmpresa } from '../../../types/index.ts';
import { Modal } from '../../../components/ui/Modal.tsx';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required, email, phone, compose } from '../../../utils/validation.ts';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  nombre: [required('Nombre')],
  apellidos: [required('Apellidos')],
  nif: [required('NIF / NIE')],
  email: [compose(required('Email Directo'), email('Email Directo'))],
  tlfn: [compose(required('Teléfono Directo'), phone('Teléfono Directo'))],
};

interface TutorFormModalProps {
  open: boolean;
  editing: TutorEmpresa | null;
  formData: Partial<TutorEmpresa>;
  onChange: (data: Partial<TutorEmpresa>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function TutorFormModal({ open, editing, formData, onChange, onSubmit, onClose }: TutorFormModalProps) {
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const update = (field: keyof TutorEmpresa) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="md" cardClass="rounded-3xl">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {editing ? 'Editar Tutor' : 'Nuevo Tutor'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre<span className="text-red-500 ml-0.5">*</span></label>
              <input
                className={`${inputCls} ${errors.nombre ? inputErrCls : ''}`}
                value={formData.nombre || ''}
                onChange={update('nombre')}
                onBlur={() => onBlur('nombre', formData.nombre)}
              />
              {errors.nombre && <p className={errMsgCls}>{errors.nombre}</p>}
            </div>
            <div>
              <label className={labelCls}>Apellidos<span className="text-red-500 ml-0.5">*</span></label>
              <input
                className={`${inputCls} ${errors.apellidos ? inputErrCls : ''}`}
                value={formData.apellidos || ''}
                onChange={update('apellidos')}
                onBlur={() => onBlur('apellidos', formData.apellidos)}
              />
              {errors.apellidos && <p className={errMsgCls}>{errors.apellidos}</p>}
            </div>
          </div>
          <div>
            <label className={labelCls}>NIF / NIE<span className="text-red-500 ml-0.5">*</span></label>
            <input
              className={`${inputCls} ${errors.nif ? inputErrCls : ''}`}
              value={formData.nif || ''}
              onChange={update('nif')}
              onBlur={() => onBlur('nif', formData.nif)}
            />
            {errors.nif && <p className={errMsgCls}>{errors.nif}</p>}
          </div>
          <div>
            <label className={labelCls}>Email Directo<span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="email"
              className={`${inputCls} ${errors.email ? inputErrCls : ''}`}
              value={formData.email || ''}
              onChange={update('email')}
              onBlur={() => onBlur('email', formData.email)}
            />
            {errors.email && <p className={errMsgCls}>{errors.email}</p>}
          </div>
          <div>
            <label className={labelCls}>Teléfono Directo<span className="text-red-500 ml-0.5">*</span></label>
            <input
              className={`${inputCls} ${errors.tlfn ? inputErrCls : ''}`}
              value={formData.tlfn || ''}
              onChange={update('tlfn')}
              onBlur={() => onBlur('tlfn', formData.tlfn)}
            />
            {errors.tlfn && <p className={errMsgCls}>{errors.tlfn}</p>}
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
    </Modal>
  );
}
