import React from 'react';
import { Plus, Trash2, CheckCircle, CheckCircle2 } from 'lucide-react';
import { DetalleAcademico, ResultadoAprendizaje } from '../../../types/index.ts';
import { DateList } from '../../../components/ui/DateList.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';

const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface DetalleFormModalProps {
  open: boolean;
  editing: DetalleAcademico | null;
  formData: Partial<DetalleAcademico>;
  onChange: (data: Partial<DetalleAcademico>) => void;
  newRA: Partial<ResultadoAprendizaje>;
  onNewRAChange: (ra: Partial<ResultadoAprendizaje>) => void;
  onAddRA: () => void;
  onRemoveRA: (id: string) => void;
  newTutoria: string;
  setNewTutoria: (v: string) => void;
  onAddTutoria: () => void;
  onRemoveTutoria: (d: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function DetalleFormModal({
  open, editing, formData, onChange,
  newRA, onNewRAChange, onAddRA, onRemoveRA,
  newTutoria, setNewTutoria, onAddTutoria, onRemoveTutoria,
  onSubmit, onClose,
}: DetalleFormModalProps) {
  const update = (field: keyof DetalleAcademico) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl" backdropClass="bg-slate-900/60 backdrop-blur-md" cardClass="rounded-4xl">

        {/* Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
            Configuración de Ciclo (Detalle Académico)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45 h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar flex-1">

          {/* ── Datos del ciclo ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Nombre del Ciclo</label>
              <input
                required
                className={inputClass}
                value={formData.ciclo || ''}
                onChange={update('ciclo')}
                placeholder="Ej: Desarrollo de Aplicaciones Multiplataforma"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className={labelClass}>Código</label>
                <input
                  required
                  className={inputClass}
                  value={formData.codigo || ''}
                  onChange={update('codigo')}
                  placeholder="Ej: IFC303"
                />
              </div>
              <div>
                <label className={labelClass}>Grupo</label>
                <input
                  required
                  className={inputClass}
                  value={formData.codigoGrupo || ''}
                  onChange={update('codigoGrupo')}
                  placeholder="Ej: 2IFCS02DA"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:col-span-2">
              <div>
                <label className={labelClass}>Nivel</label>
                <input
                  required
                  className={inputClass}
                  value={formData.nivel || ''}
                  onChange={update('nivel')}
                  placeholder="Ej: 2º"
                />
              </div>
              <div>
                <label className={labelClass}>Grado</label>
                <input
                  required
                  className={inputClass}
                  value={formData.grado || ''}
                  onChange={update('grado')}
                  placeholder="Ej: Superior"
                />
              </div>
              <div>
                <label className={labelClass}>Régimen</label>
                <input
                  required
                  className={inputClass}
                  value={formData.regimen || ''}
                  onChange={update('regimen')}
                  placeholder="Ej: General"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Nombre Corto</label>
              <input
                className={inputClass}
                value={formData.nombreCorto || ''}
                onChange={update('nombreCorto')}
                placeholder="Ej: 2º C.F.G.S. DAM"
              />
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
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                  Resultados de Aprendizaje
                </h4>
              </div>
              <span className="bg-indigo-50 px-2 py-0.5 rounded text-[9px] font-black text-indigo-600 uppercase">
                {formData.resultadosAprendizaje?.length || 0} RA
              </span>
            </div>

            {/* Formulario de nuevo RA */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <input
                  className="col-span-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-400"
                  value={newRA.modulo}
                  onChange={e => onNewRAChange({ ...newRA, modulo: e.target.value })}
                  placeholder="Módulo"
                />
                <input
                  className="col-span-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-400"
                  value={newRA.codigo}
                  onChange={e => onNewRAChange({ ...newRA, codigo: e.target.value })}
                  placeholder="Cód."
                />
                <input
                  className="col-span-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-400"
                  value={newRA.ra}
                  onChange={e => onNewRAChange({ ...newRA, ra: e.target.value })}
                  placeholder="ID RA (Ej: RA1)"
                />
              </div>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-400"
                value={newRA.nombre}
                onChange={e => onNewRAChange({ ...newRA, nombre: e.target.value })}
                placeholder="Nombre descriptivo del RA"
              />
              <textarea
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-400 resize-none h-16"
                value={newRA.actividadFormativa}
                onChange={e => onNewRAChange({ ...newRA, actividadFormativa: e.target.value })}
                placeholder="Ejemplo de Actividad Formativa (Opcional)..."
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex-1">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={newRA.impartidoEmpresa}
                    onChange={e => onNewRAChange({ ...newRA, impartidoEmpresa: e.target.checked })}
                  />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                    Íntegro empresa
                  </span>
                </label>
                <button
                  type="button"
                  onClick={onAddRA}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Añadir RA
                </button>
              </div>
            </div>

            {/* Lista de RAs */}
            <div className="mt-4 space-y-2 max-h-45 overflow-y-auto pr-1">
              {formData.resultadosAprendizaje?.map(ra => (
                <div
                  key={ra.id}
                  className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm flex items-start justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {ra.modulo}:{ra.ra}
                      </span>
                      {ra.impartidoEmpresa && (
                        <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                          <CheckCircle className="h-2.5 w-2.5" /> Empresa
                        </span>
                      )}
                    </div>
                    <h5 className="text-[10px] font-black text-slate-800 leading-tight">{ra.nombre}</h5>
                    {ra.actividadFormativa && (
                      <p className="text-[9px] text-slate-400 mt-1 italic line-clamp-2 leading-tight">
                        {ra.actividadFormativa}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveRA(ra.id)}
                    className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(!formData.resultadosAprendizaje || formData.resultadosAprendizaje.length === 0) && (
                <div className="text-center py-6 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">
                    Sin RA definidos
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-slate-900/10"
            >
              Guardar Detalle Académico
            </button>
          </div>
        </form>
    </Modal>
  );
}
