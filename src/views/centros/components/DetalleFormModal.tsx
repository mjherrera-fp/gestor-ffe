import React from 'react';
import { Plus, Trash2, Pencil, X, CheckCircle, CheckCircle2 } from 'lucide-react';
import { DetalleAcademico, ResultadoAprendizaje } from '../../../types/index.ts';
import { DateList } from '../../../components/ui/DateList.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Title } from '../../../components/Title.tsx';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required } from '../../../utils/validation.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-1';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';
const COMPARADOR_RA = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

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
  newRA: Partial<ResultadoAprendizaje>;
  onNewRAChange: (ra: Partial<ResultadoAprendizaje>) => void;
  onAddRA: () => void;
  onRemoveRA: (id: string) => void;
  onEditRA: (ra: ResultadoAprendizaje) => void;
  onCancelEditRA: () => void;
  editingRAId: string | null;
  newTutoria: string;
  setNewTutoria: (v: string) => void;
  onAddTutoria: () => void;
  onRemoveTutoria: (d: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function DetalleFormModal({
  open, editing, formData, onChange,
  newRA, onNewRAChange, onAddRA, onRemoveRA, onEditRA, onCancelEditRA, editingRAId,
  newTutoria, setNewTutoria, onAddTutoria, onRemoveTutoria,
  onSubmit, onClose,
}: DetalleFormModalProps) {
  const { errors, onBlur, validateAll } = useFormValidation(RULES);
  const resultadosOrdenados = [...(formData.resultadosAprendizaje || [])].sort((a, b) =>
    COMPARADOR_RA.compare(a.codigo, b.codigo)
    || COMPARADOR_RA.compare(a.ra, b.ra)
    || COMPARADOR_RA.compare(a.modulo, b.modulo)
  );

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
        <div className="px-8 py-6 bg-surface-subtle border-b border-border-base flex items-center justify-between shrink-0">
          <h3 className="font-black text-text-main uppercase tracking-widest text-xs">
            Configuración de Ciclo (Detalle Académico)
          </h3>
          <Title text="Cerrar">
            <button onClick={onClose} className="text-text-muted hover:text-text-main">
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

          {/* ── Resultados de Aprendizaje ── */}
          <div className="mt-6 pt-6 border-t border-border-base">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h4 className="text-[11px] font-black text-text-main uppercase tracking-wider">
                  Resultados de Aprendizaje
                </h4>
              </div>
              <span className="bg-primary-light px-2 py-0.5 rounded text-[9px] font-black text-primary uppercase">
                {formData.resultadosAprendizaje?.length || 0} RA
              </span>
            </div>

            {/* Formulario de nuevo RA */}
            <div className="bg-surface-subtle/50 rounded-xl p-4 border border-border-base/60 space-y-3">
              {editingRAId && (
                <div className="flex items-center justify-between bg-primary-light border border-primary-light rounded-lg px-3 py-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Pencil className="h-3 w-3" /> Editando RA
                  </span>
                  <Title text="Cancelar edición">
                    <button
                      type="button"
                      onClick={onCancelEditRA}
                      className="text-primary hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Title>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                <input
                  className="col-span-1 bg-surface-card border border-border-base rounded-lg px-2 py-1.5 text-[10px] font-bold text-text-main outline-none focus:border-primary"
                  value={newRA.modulo}
                  onChange={e => onNewRAChange({ ...newRA, modulo: e.target.value })}
                  placeholder="Nombre del módulo"
                />
                <input
                  className="col-span-1 bg-surface-card border border-border-base rounded-lg px-2 py-1.5 text-[10px] font-bold text-text-main outline-none focus:border-primary"
                  value={newRA.codigo}
                  onChange={e => onNewRAChange({ ...newRA, codigo: e.target.value })}
                  placeholder="Cód.del módulo"
                />
                <input
                  className="col-span-2 bg-surface-card border border-border-base rounded-lg px-2 py-1.5 text-[10px] font-bold text-text-main outline-none focus:border-primary"
                  value={newRA.ra}
                  onChange={e => onNewRAChange({ ...newRA, ra: e.target.value })}
                  placeholder="ID RA (Ej: RA1)"
                />
              </div>
              <input
                className="w-full bg-surface-card border border-border-base rounded-lg px-3 py-2 text-[10px] font-bold text-text-main outline-none focus:border-primary"
                value={newRA.nombre}
                onChange={e => onNewRAChange({ ...newRA, nombre: e.target.value })}
                placeholder="Nombre descriptivo del RA"
              />
              <textarea
                className="w-full bg-surface-card border border-border-base rounded-lg px-3 py-2 text-[10px] font-bold text-text-main outline-none focus:border-primary resize-none h-16"
                value={newRA.actividadFormativa}
                onChange={e => onNewRAChange({ ...newRA, actividadFormativa: e.target.value })}
                placeholder="Ejemplo de Actividad Formativa (Opcional)..."
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer bg-surface-card border border-border-base rounded-lg px-2 py-1.5 flex-1">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-border-base text-primary focus:ring-primary"
                    checked={newRA.impartidoEmpresa}
                    onChange={e => onNewRAChange({ ...newRA, impartidoEmpresa: e.target.checked })}
                  />
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight">
                    Íntegro empresa
                  </span>
                </label>
                <button
                  type="button"
                  onClick={onAddRA}
                  className={`${editingRAId ? 'bg-success/90 hover:bg-success' : 'bg-primary hover:bg-primary/90'} text-white px-3 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all flex items-center gap-1`}
                >
                  {editingRAId ? <CheckCircle className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {editingRAId ? 'Guardar RA' : 'Añadir RA'}
                </button>
              </div>
            </div>

            {/* Lista de RAs */}
            <div className="mt-4 space-y-2 max-h-45 overflow-y-auto pr-1">
              {resultadosOrdenados.map(ra => (
                <div
                  key={ra.id}
                  className="bg-surface-card border border-border-base rounded-lg p-3 shadow-sm flex items-start justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[8px] font-black text-primary uppercase bg-primary-light px-1.5 py-0.5 rounded border border-primary-light">
                        {ra.codigo} - {ra.modulo}: {ra.ra}
                      </span>
                      {ra.impartidoEmpresa && (
                        <span className="text-[8px] font-black text-success uppercase bg-success-soft px-1.5 py-0.5 rounded border border-success/20 flex items-center gap-0.5">
                          <CheckCircle className="h-2.5 w-2.5" /> Empresa
                        </span>
                      )}
                    </div>
                    <h5 className="text-[10px] font-black text-text-main leading-tight">{ra.nombre}</h5>
                    {ra.actividadFormativa && (
                      <p className="text-[9px] text-text-muted mt-1 italic line-clamp-2 leading-tight">
                        {ra.actividadFormativa}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Title text="Editar RA">
                      <button
                        type="button"
                        onClick={() => onEditRA(ra)}
                        className="text-text-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Title>
                    <Title text="Eliminar RA">
                      <button
                        type="button"
                        onClick={() => onRemoveRA(ra.id)}
                        className="text-text-muted hover:text-danger p-1 rounded-md hover:bg-danger-soft transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Title>
                  </div>
                </div>
              ))}
              {(!formData.resultadosAprendizaje || formData.resultadosAprendizaje.length === 0) && (
                <div className="text-center py-6 bg-surface-subtle/30 border border-dashed border-border-base rounded-xl">
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest italic opacity-60">
                    Sin RA definidos
                  </p>
                </div>
              )}
            </div>
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
