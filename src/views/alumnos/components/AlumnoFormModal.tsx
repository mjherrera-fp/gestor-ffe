import React from 'react';
import { X } from 'lucide-react';
import { Alumno, DetalleAcademico } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { HorasWarningModal } from './HorasWarningModal.tsx';

const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

interface AlumnoFormModalProps {
  open: boolean;
  editing: Alumno | null;
  formData: Partial<Alumno>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Alumno>>>;
  detalles: DetalleAcademico[];
  pendingSubmitData: any | null;
  onSubmit: (e: React.FormEvent) => void;
  onConfirmClearDates: () => void;
  onCancelWarning: () => void;
  onClose: () => void;
}

export function AlumnoFormModal({
  open, editing, formData, setFormData,
  detalles, pendingSubmitData,
  onSubmit, onConfirmClearDates, onCancelWarning, onClose,
}: AlumnoFormModalProps) {
  const update = (field: keyof Alumno) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="text-xl font-bold text-slate-800">
            {editing ? 'Editar Expediente' : 'Nuevo Registro de Alumno'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal advertencia de horas (anidado) */}
        {pendingSubmitData && (
          <HorasWarningModal
            open={!!pendingSubmitData}
            onConfirm={onConfirmClearDates}
            onCancel={onCancelWarning}
          />
        )}

        {/* Formulario */}
        <form onSubmit={onSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
          <div>
            <label className={labelClass}>Nombre</label>
            <input required className={inputClass} value={formData.nombre || ''} onChange={update('nombre')} />
          </div>
          <div>
            <label className={labelClass}>Apellidos</label>
            <input required className={inputClass} value={formData.apellidos || ''} onChange={update('apellidos')} />
          </div>
          <div>
            <label className={labelClass}>DNI / Pasaporte</label>
            <input required className={inputClass} value={formData.dni || ''} onChange={update('dni')} />
          </div>
          <div>
            <label className={labelClass}>Número Seguridad Social</label>
            <input required className={inputClass} value={formData.numSS || ''} onChange={update('numSS')} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input required className={inputClass} value={formData.tlfn || ''} onChange={update('tlfn')} />
          </div>
          <div>
            <label className={labelClass}>Fecha Nacimiento</label>
            <input
              required
              type="date"
              className={inputClass}
              value={formData.fechaNacimiento || ''}
              onChange={update('fechaNacimiento')}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Email EducaMadrid</label>
            <input required type="email" className={inputClass} value={formData.emailEduca || ''} onChange={update('emailEduca')} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Email Personal</label>
            <input required type="email" className={inputClass} value={formData.emailPersonal || ''} onChange={update('emailPersonal')} />
          </div>
          <div>
            <label className={labelClass}>Horas Totales FFE</label>
            <input
              required
              type="number"
              min="0"
              className={inputClass}
              value={formData.totalHorasFFE ?? 0}
              onChange={e => setFormData(prev => ({ ...prev, totalHorasFFE: Number(e.target.value) }))}
            />
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

          {/* Botones */}
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Descartar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Guardar Expediente
            </button>
          </div>
        </form>
    </Modal>
  );
}
