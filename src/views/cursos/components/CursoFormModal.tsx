import React from 'react';
import { X } from 'lucide-react';
import { Curso } from '../../../types/index.ts';
import { Modal } from '../../../components/ui/Modal.tsx';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required } from '../../../utils/validation.ts';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  descripcion: [required('Descripción')],
  fechaInicio: [required('Fecha Inicio')],
  fechaFin: [required('Fecha Fin')],
};

interface CursoFormModalProps {
  open: boolean;
  editing: Curso | null;
  formData: Partial<Curso>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Curso>>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CursoFormModal({
  open, editing, formData, setFormData,
  onSubmit, onClose,
}: CursoFormModalProps) {
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="lg">

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
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción<span className="text-red-500 ml-0.5">*</span></label>
            <input
              className={`${inputCls} ${errors.descripcion ? inputErrCls : ''}`}
              value={formData.descripcion || ''}
              onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Ej: Curso 2025-2026"
              onBlur={() => onBlur('descripcion', formData.descripcion)}
            />
            {errors.descripcion && <p className={errMsgCls}>{errors.descripcion}</p>}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha Inicio<span className="text-red-500 ml-0.5">*</span></label>
              <input
                type="date"
                className={`${inputCls} ${errors.fechaInicio ? inputErrCls : ''}`}
                value={formData.fechaInicio || ''}
                onChange={e => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                onBlur={() => onBlur('fechaInicio', formData.fechaInicio)}
              />
              {errors.fechaInicio && <p className={errMsgCls}>{errors.fechaInicio}</p>}
            </div>
            <div>
              <label className={labelCls}>Fecha Fin<span className="text-red-500 ml-0.5">*</span></label>
              <input
                type="date"
                className={`${inputCls} ${errors.fechaFin ? inputErrCls : ''}`}
                value={formData.fechaFin || ''}
                onChange={e => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                onBlur={() => onBlur('fechaFin', formData.fechaFin)}
              />
              {errors.fechaFin && <p className={errMsgCls}>{errors.fechaFin}</p>}
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
    </Modal>
  );
}
