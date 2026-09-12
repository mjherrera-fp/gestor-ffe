import React from 'react';
import {
  X, User, Building2, Calendar, Clock, ArrowLeftRight, Plus, Hash
} from 'lucide-react';
import {
  RelacionAlumno, Alumno, Convenio, TutorEmpresa,
  RelacionEstado, RelacionEstadoLabels, HorarioSemanal
} from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { DEFAULT_HORARIO, getDayName } from '../utils/relacionesUtils.ts';
import { BulkHorario } from '../hooks/useRelaciones.ts';
import { formatDate } from '../../../lib/dateUtils.ts';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required } from '../../../utils/validation.ts';

const inputCls = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  numRelacion: [required('Relación Nº')],
  tutorEmpresaId: [required('Tutor Empresa')],
  estado: [required('Estado de Tramitación')],
};

interface RelacionFormModalProps {
  open: boolean;
  editing: RelacionAlumno | null;
  formData: Partial<RelacionAlumno>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<RelacionAlumno>>>;
  // Alumnos
  alumnos: Alumno[];
  searchTermAlumno: string;
  setSearchTermAlumno: (v: string) => void;
  filteredAlumnos: Alumno[];
  onAddAlumno: (a: Alumno) => void;
  onRemoveAlumno: (id: number) => void;
  onUpdateStudentHours: (id: number, h: number) => void;
  onUpdateStudentStartDate: (id: number, d: string) => void;
  calculateEndDateForHours: (start: string, hours: number) => string | null;
  // Fechas generales
  targetStartDate: string;
  setTargetStartDate: (v: string) => void;
  targetEndDate: string;
  setTargetEndDate: (v: string) => void;
  onApplyStartDateToAll: () => void;
  onApplyTargetEndDate: () => void;
  // Convenio
  convenios: (Convenio & { empresaNombre: string })[];
  filteredConvenios: (Convenio & { empresaNombre: string })[];
  searchTermConvenio: string;
  setSearchTermConvenio: (v: string) => void;
  isConvenioDropdownOpen: boolean;
  setIsConvenioDropdownOpen: (v: boolean) => void;
  // Tutor
  tutores: TutorEmpresa[];
  // Horario
  bulkHorario: BulkHorario;
  setBulkHorario: React.Dispatch<React.SetStateAction<BulkHorario>>;
  onApplyBulkHorario: () => void;
  // Acciones
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RelacionFormModal({
  open, editing, formData, setFormData,
  alumnos, searchTermAlumno, setSearchTermAlumno, filteredAlumnos,
  onAddAlumno, onRemoveAlumno, onUpdateStudentHours, onUpdateStudentStartDate, calculateEndDateForHours,
  targetStartDate, setTargetStartDate, targetEndDate, setTargetEndDate,
  onApplyStartDateToAll, onApplyTargetEndDate,
  convenios, filteredConvenios, searchTermConvenio, setSearchTermConvenio,
  isConvenioDropdownOpen, setIsConvenioDropdownOpen,
  tutores, bulkHorario, setBulkHorario, onApplyBulkHorario,
  onSubmit, onClose,
}: RelacionFormModalProps) {
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  const estadosOptions = Object.values(RelacionEstado).map(e => ({
    id: e,
    label: RelacionEstadoLabels[e as RelacionEstado],
  }));

  const tutoresOptions = tutores.map(t => ({
    id: t.id,
    label: `${t.nombre} ${t.apellidos}`,
  }));

  const DAY_LABELS: Record<string, string> = {
    lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J',
    viernes: 'V', sabado: 'S', domingo: 'D',
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="6xl" backdropClass="bg-slate-900/60 backdrop-blur-md" cardClass="rounded-4xl">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {editing ? 'Editar Relación' : 'Nueva Relación'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sincroniza alumnos, empresas y sus horarios específicos.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

              {/* ── COLUMNA IZQUIERDA ── */}
              <div className="lg:col-span-2 space-y-8">

                {/* Selección de alumnos */}
                <div className="bg-slate-50 rounded-3xl p-6 space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Selección de Alumno(s)
                  </h4>

                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                        placeholder="Buscar por nombre..."
                        value={searchTermAlumno}
                        onChange={e => setSearchTermAlumno(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 mt-1 ml-1 italic">
                        * Solo se muestran alumnos sin relación asignada.
                      </p>
                      {filteredAlumnos.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto py-2">
                          {filteredAlumnos.map(a => (
                            <button
                              key={a.id}
                              type="button"
                              className="w-full text-left px-5 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                              onClick={() => onAddAlumno(a)}
                            >
                              <span className="font-bold text-slate-700">{a.nombre} {a.apellidos}</span>
                              <Plus className="h-4 w-4 text-primary" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lista de alumnos seleccionados */}
                    <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-2">
                      {formData.alumnos?.map(ar => {
                        const alum            = alumnos.find(a => a.id === ar.id);
                        const studentStartDate = ar.fechaInicio || '';
                        const studentEndDate   = calculateEndDateForHours(studentStartDate, ar.totalHorasFFE);
                        return (
                          <div key={ar.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-800">
                                {alum?.nombre} {alum?.apellidos}
                              </span>
                              <button
                                type="button"
                                onClick={() => onRemoveAlumno(ar.id!)}
                                className="text-red-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Horas FFE</label>
                                <input
                                  type="number"
                                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-primary focus:ring-2 focus:ring-primary/10 outline-none"
                                  value={ar.totalHorasFFE}
                                  onChange={e => onUpdateStudentHours(ar.id!, Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Fecha Inicio</label>
                                <input
                                  type="date"
                                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/10 outline-none"
                                  value={ar.fechaInicio || ''}
                                  onChange={e => onUpdateStudentStartDate(ar.id!, e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Fin Estimado</span>
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {studentEndDate ? formatDate(studentEndDate) : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {(!formData.alumnos || formData.alumnos.length === 0) && (
                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic bg-white rounded-2xl border border-dashed border-slate-200">
                          No hay alumnos seleccionados
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Periodo general */}
                <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Periodo general
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha Inicio General</label>
                        <button
                          type="button"
                          onClick={onApplyStartDateToAll}
                          disabled={!formData.alumnos?.length}
                          className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tight disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                        >
                          Aplicar a todos
                        </button>
                      </div>
                      <input
                        type="date"
                        disabled={!formData.alumnos?.length}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        value={targetStartDate}
                        onChange={e => setTargetStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha Fin Objetivo</label>
                        <button
                          type="button"
                          onClick={onApplyTargetEndDate}
                          disabled={!formData.alumnos?.length}
                          className="text-[9px] font-bold text-emerald-600 hover:underline uppercase tracking-tight disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                        >
                          Cálculo retroactivo
                        </button>
                      </div>
                      <input
                        type="date"
                        disabled={!formData.alumnos?.length}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        value={targetEndDate}
                        onChange={e => setTargetEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Entidad colaboradora */}
                <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> Entidad Colaboradora
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Relación Nº<span className="text-red-500 ml-0.5">*</span></label>
                      <input
                        className={`${inputCls} ${errors.numRelacion ? inputErrCls : ''}`}
                        value={formData.numRelacion}
                        onChange={e => setFormData(prev => ({ ...prev, numRelacion: e.target.value }))}
                        onBlur={() => onBlur('numRelacion', formData.numRelacion)}
                      />
                      {errors.numRelacion && <p className={errMsgCls}>{errors.numRelacion}</p>}
                    </div>

                    {/* Buscador de convenio */}
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Convenio</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                        placeholder="Buscar convenio..."
                        value={searchTermConvenio}
                        onChange={e => {
                          setSearchTermConvenio(e.target.value);
                          setFormData(prev => ({ ...prev, convenioId: undefined }));
                          setIsConvenioDropdownOpen(true);
                        }}
                        onFocus={() => setIsConvenioDropdownOpen(true)}
                      />
                      {isConvenioDropdownOpen && (searchTermConvenio || filteredConvenios.length > 0) && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                          {filteredConvenios.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, convenioId: c.id }));
                                setSearchTermConvenio(`${c.empresaNombre} (Ref: ${c.numConvenio})`);
                                setIsConvenioDropdownOpen(false);
                              }}
                            >
                              <div className="font-bold">{c.empresaNombre}</div>
                              <div className="text-[10px] text-slate-400">Ref: {c.numConvenio}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <CustomSelect
                      label="Tutor Empresa"
                      options={tutoresOptions}
                      value={formData.tutorEmpresaId || ''}
                      onChange={val => setFormData(prev => ({ ...prev, tutorEmpresaId: Number(val) }))}
                      required
                      name="tutorEmpresaId"
                      error={errors.tutorEmpresaId}
                    />
                    <CustomSelect
                      label="Estado de Tramitación"
                      options={estadosOptions}
                      value={formData.estado || ''}
                      onChange={val => setFormData(prev => ({ ...prev, estado: val as RelacionEstado }))}
                      required
                      name="estado"
                      error={errors.estado}
                    />
                  </div>
                </div>
              </div>

              {/* ── COLUMNA DERECHA: HORARIO ── */}
              <div className="lg:col-span-3 space-y-6">

                {/* Configuración rápida */}
                <div className="bg-slate-50 border border-primary/20 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Clock className="h-3.5 w-3.5" /> Configuración rápida de horario
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Hora Inicio</label>
                      <input
                        type="time"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                        value={bulkHorario.inicio}
                        onChange={e => setBulkHorario(prev => ({ ...prev, inicio: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Hora Fin</label>
                      <input
                        type="time"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                        value={bulkHorario.fin}
                        onChange={e => setBulkHorario(prev => ({ ...prev, fin: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Total Horas</label>
                      <input
                        type="number"
                        step="0.5"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary font-bold text-primary"
                        value={bulkHorario.horas}
                        onChange={e => setBulkHorario(prev => ({ ...prev, horas: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="flex gap-2">
                      {Object.keys(bulkHorario.dias).map(day => {
                        const isChecked = (bulkHorario.dias as any)[day];
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const newDias = { ...bulkHorario.dias, [day]: !isChecked };
                              setBulkHorario(prev => ({ ...prev, dias: newDias }));
                            }}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border ${
                              isChecked
                                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            {DAY_LABELS[day]}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={onApplyBulkHorario}
                      className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20 border border-primary"
                    >
                      Aplicar horario a la semana
                    </button>
                  </div>
                </div>

                {/* Detalle por día */}
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Detalle por día
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {(Object.keys(DEFAULT_HORARIO) as Array<keyof HorarioSemanal>).map(d => (
                    <div key={d} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-4">
                        <h5 className="text-[11px] font-black text-slate-700 w-24">{getDayName(d)}</h5>
                        <div className="grid grid-cols-3 gap-4 flex-1">
                          <input
                            type="time"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium"
                            value={formData.horario?.[d].inicio}
                            onChange={e => {
                              const h = { ...formData.horario! };
                              h[d] = { ...h[d], inicio: e.target.value };
                              setFormData(prev => ({ ...prev, horario: h }));
                            }}
                          />
                          <input
                            type="time"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium"
                            value={formData.horario?.[d].fin}
                            onChange={e => {
                              const h = { ...formData.horario! };
                              h[d] = { ...h[d], fin: e.target.value };
                              setFormData(prev => ({ ...prev, horario: h }));
                            }}
                          />
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-primary outline-none focus:border-primary"
                              value={formData.horario?.[d].horas}
                              onChange={e => {
                                const h = { ...formData.horario! };
                                h[d] = { ...h[d], horas: Number(e.target.value) };
                                setFormData(prev => ({ ...prev, horario: h }));
                              }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Footer fijo */}
          <div className="px-8 py-5 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all uppercase tracking-widest"
            >
              {editing ? 'Guardar Cambios' : 'Crear Relación'}
            </button>
          </div>
        </form>
    </Modal>
  );
}