import React from 'react';
import { X } from 'lucide-react';
import { Alumno, DetalleAcademico } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { HorasWarningModal } from './HorasWarningModal.tsx';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required, email, isNumber } from '../../../utils/validation.ts';

const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2 text-text-main outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
const inputErrorClass = 'border-red-400 ring-2 ring-red-200';
const labelClass = 'block text-sm font-medium text-text-main mb-1';
const errorMsgClass = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  nombre: [required('Nombre')],
  apellidos: [],
  dni: [],
  numSS: [],
  tlfn: [],
  fechaNacimiento: [],
  emailEduca: [email('Email EducaMadrid')],
  emailPersonal: [email('Email Personal')],
  totalHorasFFE: [isNumber('Horas Totales FFE')],
};

interface AlumnoFormModalProps {
  open: boolean;
  editing: Alumno | null;
  formData: Partial<Alumno>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Alumno>>>;
  detalles: DetalleAcademico[];
  pendingSubmitData: any | null;
  onSubmit: (e: React.FormEvent) => void;
  onConfirmRecalcular: () => void;
  onCancelWarning: () => void;
  onClose: () => void;
}

export function AlumnoFormModal({
  open, editing, formData, setFormData,
  detalles, pendingSubmitData,
  onSubmit, onConfirmRecalcular, onCancelWarning, onClose,
}: AlumnoFormModalProps) {
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const update = (field: keyof Alumno) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl">

        {/* Header */}
        <div className="px-8 py-6 border-b border-border-base flex items-center justify-between bg-surface-subtle shrink-0">
          <h3 className="text-xl font-bold text-text-main">
            {editing ? 'Editar Expediente' : 'Nuevo Registro de Alumno'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal advertencia de horas (anidado) */}
        {pendingSubmitData && (
          <HorasWarningModal
            open={!!pendingSubmitData}
            onConfirm={onConfirmRecalcular}
            onCancel={onCancelWarning}
          />
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
          <div>
            <label className={labelClass}>Nombre<span className="text-red-500 ml-0.5">*</span></label>
            <input
              className={`${inputClass} ${errors.nombre ? inputErrorClass : ''}`}
              value={formData.nombre || ''}
              onChange={update('nombre')}
              onBlur={() => onBlur('nombre', formData.nombre)}
            />
            {errors.nombre && <p className={errorMsgClass}>{errors.nombre}</p>}
          </div>
          <div>
            <label className={labelClass}>Apellidos<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              className={`${inputClass} ${errors.apellidos ? inputErrorClass : ''}`}
              value={formData.apellidos || ''}
              onChange={update('apellidos')}
              onBlur={() => onBlur('apellidos', formData.apellidos)}
            />
            {errors.apellidos && <p className={errorMsgClass}>{errors.apellidos}</p>}
          </div>
          <div>
            <label className={labelClass}>DNI / Pasaporte<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              className={`${inputClass} ${errors.dni ? inputErrorClass : ''}`}
              value={formData.dni || ''}
              onChange={update('dni')}
              onBlur={() => onBlur('dni', formData.dni)}
            />
            {errors.dni && <p className={errorMsgClass}>{errors.dni}</p>}
          </div>
          <div>
            <label className={labelClass}>Número Seguridad Social<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              className={`${inputClass} ${errors.numSS ? inputErrorClass : ''}`}
              value={formData.numSS || ''}
              onChange={update('numSS')}
              onBlur={() => onBlur('numSS', formData.numSS)}
            />
            {errors.numSS && <p className={errorMsgClass}>{errors.numSS}</p>}
          </div>
          <div>
            <label className={labelClass}>Teléfono<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              className={`${inputClass} ${errors.tlfn ? inputErrorClass : ''}`}
              value={formData.tlfn || ''}
              onChange={update('tlfn')}
              onBlur={() => onBlur('tlfn', formData.tlfn)}
            />
            {errors.tlfn && <p className={errorMsgClass}>{errors.tlfn}</p>}
          </div>
          <div>
            <label className={labelClass}>Fecha Nacimiento<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              type="date"
              className={`${inputClass} ${errors.fechaNacimiento ? inputErrorClass : ''}`}
              value={formData.fechaNacimiento || ''}
              onChange={update('fechaNacimiento')}
              onBlur={() => onBlur('fechaNacimiento', formData.fechaNacimiento)}
            />
            {errors.fechaNacimiento && <p className={errorMsgClass}>{errors.fechaNacimiento}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Email EducaMadrid<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              type="email"
              className={`${inputClass} ${errors.emailEduca ? inputErrorClass : ''}`}
              value={formData.emailEduca || ''}
              onChange={update('emailEduca')}
              onBlur={() => onBlur('emailEduca', formData.emailEduca)}
            />
            {errors.emailEduca && <p className={errorMsgClass}>{errors.emailEduca}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Email Personal<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              type="email"
              className={`${inputClass} ${errors.emailPersonal ? inputErrorClass : ''}`}
              value={formData.emailPersonal || ''}
              onChange={update('emailPersonal')}
              onBlur={() => onBlur('emailPersonal', formData.emailPersonal)}
            />
            {errors.emailPersonal && <p className={errorMsgClass}>{errors.emailPersonal}</p>}
          </div>
          <div>
            <label className={labelClass}>Horas Totales FFE<span className="text-amber-500 ml-0.5">*</span></label>
            <input
              type="number"
              className={`${inputClass} ${errors.totalHorasFFE ? inputErrorClass : ''}`}
              value={formData.totalHorasFFE ?? 0}
              onChange={e => setFormData(prev => ({ ...prev, totalHorasFFE: Number(e.target.value) }))}
              onBlur={() => onBlur('totalHorasFFE', formData.totalHorasFFE)}
            />
            {errors.totalHorasFFE && <p className={errorMsgClass}>{errors.totalHorasFFE}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Detalle Académico Asignado</label>
            <CustomSelect
              options={detalles.map(d => ({
                id: d.id,
                label: `${(d as any).nombreCorto || d.codigoGrupo} - ${(d as any).centroNombre || ''}`,
              }))}
              value={formData.detalleAcademicoId || ''}
              onChange={val => setFormData(prev => ({ ...prev, detalleAcademicoId: Number(val) }))}
              name="detalleAcademico"
              classListboxButton="py-4"
            />
            {detalles.length === 0 && (
              <p className="text-xs text-red-500 mt-1 font-medium italic">
                * Debes crear al menos un detalle académico primero.
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Comentario</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Casos particulares del alumno"
              value={formData.comentario || ''}
              onChange={e => setFormData(prev => ({ ...prev, comentario: e.target.value }))}
            />
          </div>

          {/* Botones */}
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-border-base rounded-xl font-medium text-text-main hover:bg-surface-hover transition-all"
            >
              Descartar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              Guardar Expediente
            </button>
          </div>
        </form>
    </Modal>
  );
}
