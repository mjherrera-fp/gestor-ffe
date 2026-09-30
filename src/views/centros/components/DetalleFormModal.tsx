import React from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { DetalleAcademico } from '../../../types/index.ts';
import { DateList } from '../../../components/ui/DateList.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Title } from '../../../components/Title.tsx';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required } from '../../../utils/validation.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-1';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  ciclo: [required('Nombre del Ciclo')],
  codigo: [required('Código')],
  codigoGrupo: [required('Grupo')],
  nivel: [required('Nivel')],
  grado: [required('Grado')],
  regimen: [required('Régimen')],
  nombreCorto: [required('Nombre Corto')],
};

interface DetalleFormModalProps {
  open: boolean;
  editing: DetalleAcademico | null;
  formData: Partial<DetalleAcademico>;
  onChange: (data: Partial<DetalleAcademico>) => void;
  newTutoria: string;
  setNewTutoria: (v: string) => void;
  onAddTutoria: () => void;
  onRemoveTutoria: (d: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function DetalleFormModal({
  open, editing, formData, onChange,
  newTutoria, setNewTutoria, onAddTutoria, onRemoveTutoria,
  onSubmit, onClose,
}: DetalleFormModalProps) {
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const update = (field: keyof DetalleAcademico) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl" backdropClass="bg-overlay backdrop-blur-md" cardClass="rounded-4xl">

        {/* Header */}
        <div className="px-8 py-6 bg-surface-subtle border-b border-border-base flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h3 className="font-black text-text-main uppercase tracking-widest text-xs">
              Configuración de Ciclo (Detalle Académico)
            </h3>
            {editing && (
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">
                {formData.resultadosAprendizaje?.length || 0} RA · se editan desde la ficha del ciclo
              </p>
            )}
          </div>
          <Title text="Cerrar">
            <button onClick={onClose} className="text-text-muted hover:text-text-main shrink-0">
              <Plus className="rotate-45 h-6 w-6" />
            </button>
          </Title>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar flex-1">

          {/* ── Datos del ciclo ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Nombre del Ciclo<span className="text-red-500 ml-0.5">*</span></label>
              <input
                className={`${inputClass} ${errors.ciclo ? inputErrCls : ''}`}
                value={formData.ciclo || ''}
                onChange={update('ciclo')}
                placeholder="Ej: Desarrollo de Aplicaciones Multiplataforma"
                onBlur={() => onBlur('ciclo', formData.ciclo)}
              />
              {errors.ciclo && <p className={errMsgCls}>{errors.ciclo}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className={labelClass}>Código<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  className={`${inputClass} ${errors.codigo ? inputErrCls : ''}`}
                  value={formData.codigo || ''}
                  onChange={update('codigo')}
                  placeholder="Ej: IFCS02"
                  onBlur={() => onBlur('codigo', formData.codigo)}
                />
                {errors.codigo && <p className={errMsgCls}>{errors.codigo}</p>}
              </div>
              <div>
                <label className={labelClass}>Grupo<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  className={`${inputClass} ${errors.codigoGrupo ? inputErrCls : ''}`}
                  value={formData.codigoGrupo || ''}
                  onChange={update('codigoGrupo')}
                  placeholder="Ej: 2IFCS02DA"
                  onBlur={() => onBlur('codigoGrupo', formData.codigoGrupo)}
                />
                {errors.codigoGrupo && <p className={errMsgCls}>{errors.codigoGrupo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:col-span-2">
              <div>
                <label className={labelClass}>Nivel<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  className={`${inputClass} ${errors.nivel ? inputErrCls : ''}`}
                  value={formData.nivel || ''}
                  onChange={update('nivel')}
                  placeholder="Ej: 2º"
                  onBlur={() => onBlur('nivel', formData.nivel)}
                />
                {errors.nivel && <p className={errMsgCls}>{errors.nivel}</p>}
              </div>
              <div>
                <label className={labelClass}>Grado<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  className={`${inputClass} ${errors.grado ? inputErrCls : ''}`}
                  value={formData.grado || ''}
                  onChange={update('grado')}
                  placeholder="Ej: Superior"
                  onBlur={() => onBlur('grado', formData.grado)}
                />
                {errors.grado && <p className={errMsgCls}>{errors.grado}</p>}
              </div>
              <div>
                <label className={labelClass}>Régimen<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  className={`${inputClass} ${errors.regimen ? inputErrCls : ''}`}
                  value={formData.regimen || ''}
                  onChange={update('regimen')}
                  placeholder="Ej: General"
                  onBlur={() => onBlur('regimen', formData.regimen)}
                />
                {errors.regimen && <p className={errMsgCls}>{errors.regimen}</p>}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Nombre Corto<span className="text-red-500 ml-0.5">*</span></label>
              <input
                className={`${inputClass} ${errors.nombreCorto ? inputErrCls : ''}`}
                value={formData.nombreCorto || ''}
                onChange={update('nombreCorto')}
                placeholder="Ej: 2º C.F.G.S. DAM"
                onBlur={() => onBlur('nombreCorto', formData.nombreCorto)}
              />
              {errors.nombreCorto && <p className={errMsgCls}>{errors.nombreCorto}</p>}
            </div>
          </div>

          {/* ── Tutorías ── */}
          <div>
            <DateList
              label="Días de Tutorías"
              count={formData.tutorias?.length || 0}
              dates={formData.tutorias || []}
              newDate={newTutoria}
              onNewDateChange={setNewTutoria}
              onAdd={onAddTutoria}
              onRemove={onRemoveTutoria}
              emptyText="No se han añadido días de tutoría todavía."
            />
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
            >
              Guardar Detalle Académico
            </button>
          </div>
        </form>
    </Modal>
  );
}
