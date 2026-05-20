import React, { useState } from 'react';
import { FileText, ArrowLeft, Send, Clock, ShieldCheck, CheckCircle2, Calendar, FileDown, Users, CalendarDays, Download, Loader2, FileArchive, Mail } from 'lucide-react';
import { RelacionAlumno, Alumno, RelacionEstado, PlanFormativoEstado, SeguimientoEstado, ValoracionEstado, SelectedDocs, FirmaTipo, FirmaTipoLabels } from '../../../types/index.ts';
import { BotonDescargaPDF } from '../../../components/BotonDescargaPDF.tsx';
import { BotonDescargaDOCX } from '../../../components/BotonDescargaDOCX.tsx';
import { StatusBadge } from './RelacionesListado.tsx';
import { getAnexoStatusButton, getPlanStatusButton, getSeguimientoStatusButton, getValoracionStatusButton } from '../utils/relacionesUtils.ts';
import { Title } from '@/src/components/Title.tsx';

const FIRMA_CICLO: FirmaTipo[] = [FirmaTipo.SIN_ASIGNAR, FirmaTipo.DIGITAL, FirmaTipo.MANUAL];

function FirmaSelector({ value, onChange }: { value?: FirmaTipo; onChange: (v: FirmaTipo) => void }) {
  const firma = value || FirmaTipo.SIN_ASIGNAR;
  const next = () => {
    const idx = FIRMA_CICLO.indexOf(firma);
    return FIRMA_CICLO[(idx + 1) % FIRMA_CICLO.length];
  };
  return (
    <button
      type="button"
      onClick={() => onChange(next())}
      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${firma === FirmaTipo.DIGITAL
          ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
          : firma === FirmaTipo.MANUAL
            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`}
      title="Haz clic para cambiar tipo de firma"
    >
      {FirmaTipoLabels[firma]}
    </button>
  );
}

interface RelacionDetalleProps {
  selectedRelacion: RelacionAlumno | null;
  alumnos: Alumno[];
  onAdvanceStatus: (rel: RelacionAlumno) => void;
  onMoveBackStatus: (rel: RelacionAlumno) => void;
  onAdvancePlanStatus: (rel: RelacionAlumno) => void;
  onMoveBackPlanStatus: (rel: RelacionAlumno) => void;
  onAdvancePlanIndividual: (alumno: Alumno) => void;
  onMoveBackPlanIndividual: (alumno: Alumno) => void;
  onDescargarPlanFormativo: (tipo: 'docx' | 'pdf', alumno: Alumno) => Promise<void>;
  onDescargarSeguimiento: (alumno: Alumno) => Promise<void>;
  onAdvanceSeguimientoIndividual: (alumno: Alumno) => void;
  onMoveBackSeguimientoIndividual: (alumno: Alumno) => void;
  onDescargarValoracion: (alumno: Alumno) => Promise<void>;
  onAdvanceValoracionIndividual: (alumno: Alumno) => void;
  onMoveBackValoracionIndividual: (alumno: Alumno) => void;
  onDescargarCarta: () => Promise<void>;
  onEmailRelacion: (tipo: 'docx' | 'pdf') => Promise<void>;
  onEmailPlanFormativo: (tipo: 'docx' | 'pdf', alumno: Alumno) => Promise<void>;
  onEmailSeguimiento: (alumno: Alumno) => Promise<void>;
  onEmailValoracion: (alumno: Alumno) => Promise<void>;
  onEmailCarta: () => Promise<void>;
  onEmailCalendario: (alumno: Alumno) => Promise<void>;
  onDescargarRelacion: (tipo: 'docx' | 'pdf') => Promise<void>;
  onDescargarCalendario: (alumno: Alumno) => Promise<void>;
  onHandleDescargarTodo: (relaciones: RelacionAlumno[]) => Promise<void>;
  isDownloadingMasivo: boolean;
  downloadProgress: number;
  downloadStatus: string;
  setTargetDownloadRelaciones: React.Dispatch<React.SetStateAction<RelacionAlumno[]>>;
  targetDownloadRelaciones: RelacionAlumno[];
  selectedDocs: SelectedDocs;
  setSelectedDocs: React.Dispatch<React.SetStateAction<SelectedDocs>>;
  setTargetEmailRelaciones: React.Dispatch<React.SetStateAction<RelacionAlumno[]>>;
  onUpdateFirma: (campo: keyof Pick<RelacionAlumno, 'firmaRelacion' | 'firmaPlanFormativo' | 'firmaSeguimiento' | 'firmaValoracion'>, valor: FirmaTipo) => void;
}

export function RelacionDetalle({
  selectedRelacion, alumnos,
  onAdvanceStatus, onMoveBackStatus,
  onAdvancePlanStatus, onMoveBackPlanStatus,
  onAdvancePlanIndividual, onMoveBackPlanIndividual,
  onDescargarPlanFormativo, onDescargarSeguimiento,
  onAdvanceSeguimientoIndividual, onMoveBackSeguimientoIndividual,
  onDescargarValoracion, onAdvanceValoracionIndividual, onMoveBackValoracionIndividual,
  onEmailRelacion, onEmailPlanFormativo, onEmailSeguimiento, onEmailValoracion,
  onEmailCarta, onEmailCalendario,
  onDescargarCarta, onDescargarCalendario, onHandleDescargarTodo,
  isDownloadingMasivo, downloadProgress, downloadStatus,
  setTargetDownloadRelaciones, targetDownloadRelaciones, setSelectedDocs, selectedDocs,
  setTargetEmailRelaciones,
  onUpdateFirma
}: RelacionDetalleProps) {

  const [isDownloading, setIsDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const toggleCard = (key: string) => {
    setCollapsedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allPlanesCompleted = selectedRelacion?.alumnos?.every(alumno => {
    const estado = (alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
    return !getPlanStatusButton(estado);
  }) ?? false;

  const allSeguimientosCompleted = selectedRelacion?.alumnos?.every(alumno => {
    const estado = (alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE;
    return !getSeguimientoStatusButton(estado);
  }) ?? false;

  const allValoracionesCompleted = selectedRelacion?.alumnos?.every(alumno => {
    const estado = (alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE;
    return !getValoracionStatusButton(estado);
  }) ?? false;

  if (!selectedRelacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
        <div className="bg-slate-50 p-6 rounded-full mb-4">
          <FileText className="h-12 w-12 text-slate-200" />
        </div>
        <h3 className="text-base font-bold text-slate-700 mb-2">Selecciona una relación</h3>
        <p className="text-xs text-slate-500">
          Para gestionar la documentación y los anexos asociados a la relación.
        </p>
      </div>
    );
  }

  const anexoBtn = getAnexoStatusButton(selectedRelacion.estado);

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">


      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between mb-4">

        {/* NUEVO CONTENEDOR: Agrupa el título y la Ref en una columna */}
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Gestión de documentación
          </h3>
          {/* La referencia debajo del título con un margen superior pequeño (mt-1) */}
          <span className="text-xs text-slate-500 font-medium mt-1">
            Ref: {selectedRelacion.numRelacion} {/* <-- Asegúrate de usar tu variable real aquí */}
          </span>
        </div>


        {/* Botón de Enviar Todo */}
        <button
          onClick={() => { if (selectedRelacion) setTargetEmailRelaciones([selectedRelacion]); }}
          className="flex items-center gap-1.5 px-3 py-1.5 mr-3 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          title="Enviar documentación seleccionada por correo a la empresa"
        >
          <Mail className="h-3.5 w-3.5" />
        </button>

        {/* Botón de Descargar Todo */}
        <button
          onClick={() => {
            if (selectedRelacion) setTargetDownloadRelaciones([selectedRelacion]);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          title="Descargar todos los documentos"
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </button>

      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">

        {/* ── BLOQUE 1: ANEXO DE RELACIÓN ── */}
        <section className={`rounded-2xl p-4 space-y-4 transition-colors bg-slate-50/50 border ${anexoBtn ? 'border-slate-100' : 'border-emerald-100'
          }`}>
          <button
            onClick={() => toggleCard('anexo')}
            className="w-full flex items-center justify-between text-left"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${anexoBtn ? 'text-blue-600' : 'text-emerald-600'
              }`}>
              <FileText className="h-3.5 w-3.5" />1. Anexo de Relación
            </label>
            <FirmaSelector value={selectedRelacion.firmaRelacion} onChange={v => onUpdateFirma('firmaRelacion', v)} />
          </button>

          {(!(collapsedCards['anexo'] ?? !anexoBtn)) && (
            <>
              <div className="flex justify-end">
                <StatusBadge estado={selectedRelacion.estado} type="relacion" />
              </div>

              <div className="flex gap-2">
                <BotonDescargaDOCX
                  url={`/api/relaciones-alumnos/${selectedRelacion.id}/documento`}
                  name={`Anexo_${selectedRelacion.numRelacion.replace(/\//g, '_')}.docx`}
                  showText={true}
                />
                <BotonDescargaPDF
                  url={`/api/relaciones-alumnos/${selectedRelacion.id}/documento/pdf`}
                  name={`Anexo_${selectedRelacion.numRelacion.replace(/\//g, '_')}.pdf`}
                  showText={true}
                />
                <button
                  onClick={async () => { setSendingEmail('relacion'); try { await onEmailRelacion('pdf'); } finally { setSendingEmail(null); } }}
                  disabled={sendingEmail === 'relacion'}
                  title="Enviar por correo"
                  className="h-8 px-2.5 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-[10px] font-bold uppercase disabled:opacity-50"
                >
                  {sendingEmail === 'relacion' ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                </button>
              </div>

              {anexoBtn ? (
                <button
                  onClick={() => onAdvanceStatus(selectedRelacion)}
                  className={`w-full py-2.5 rounded-xl text-white font-bold text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg transition-all ${anexoBtn.color}`}
                >
                  {React.createElement(anexoBtn.icon, { className: 'h-4 w-4' })}
                  {anexoBtn.label}
                </button>
              ) : (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl text-center font-bold text-[10px] border border-emerald-100 uppercase">
                  Anexo Completado
                </div>
              )}

              {selectedRelacion.estado !== RelacionEstado.PENDIENTE_ENVIAR_EMPRESA && (
                <button
                  onClick={() => onMoveBackStatus(selectedRelacion)}
                  className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Regresar Estado Anterior
                </button>
              )}
            </>
          )}
        </section>

        {/* ── BLOQUE 2: PLANES FORMATIVOS (por alumno) ── */}
        <section className={`rounded-2xl p-4 space-y-4 transition-colors bg-blue-50/30 border ${allPlanesCompleted ? 'border-emerald-100' : 'border-blue-100'
          }`}>
          <button
            onClick={() => toggleCard('allPlanes')}
            className="w-full flex items-center justify-between text-left"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${allPlanesCompleted ? 'text-emerald-600' : 'text-blue-600'
              }`}>
              <FileText className="h-3.5 w-3.5" /> 2. Planes Formativos
            </label>
            <FirmaSelector value={selectedRelacion.firmaPlanFormativo} onChange={v => onUpdateFirma('firmaPlanFormativo', v)} />
          </button>

          {(!(collapsedCards['allPlanes'] ?? allPlanesCompleted)) && (
            <div className="space-y-3">
              {selectedRelacion.alumnos?.map(alumno => {
                const estadoPlan = (alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
                const planBtn = getPlanStatusButton(estadoPlan);
                const isInitial = estadoPlan === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE
                  || estadoPlan === 'PENDIENTE_ENVIAR_ESTUDIANTE';
                const isCompleted = !planBtn;

                return (
                  <div
                    key={alumno.id}
                    className={`rounded-xl p-3 shadow-sm flex flex-col gap-3 transition-colors bg-white border ${isCompleted ? 'border-emerald-600' : 'border-blue-100'
                      }`}
                  >
                    <button
                      onClick={() => toggleCard(`plan-${alumno.id}`)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-slate-700 truncate pr-2">
                        {alumno.nombre} {alumno.apellidos}
                      </span>
                      <StatusBadge estado={estadoPlan} type="plan" />
                    </button>

                    {(!(collapsedCards[`plan-${alumno.id}`] ?? isCompleted)) && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1 shrink-0">
                          <BotonDescargaDOCX
                            onClick={async () => onDescargarPlanFormativo('docx', alumno)}
                            showText={true}
                            className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <BotonDescargaPDF
                            onClick={async () => onDescargarPlanFormativo('pdf', alumno)}
                            showText={true}
                            className="h-8 px-2 bg-white border border-slate-200 text-red-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-red-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <button
                            onClick={async () => { const key = `plan-${alumno.id}`; setSendingEmail(key); try { await onEmailPlanFormativo('pdf', alumno); } finally { setSendingEmail(null); } }}
                            disabled={sendingEmail === `plan-${alumno.id}`}
                            title="Enviar por correo"
                            className="h-8 px-2.5 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-[10px] font-bold uppercase disabled:opacity-50"
                          >
                            {sendingEmail === `plan-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                          </button>
                        </div>

                        {planBtn ? (
                          <Title text={planBtn.label}>
                            <button
                              onClick={() => onAdvancePlanIndividual(alumno)}
                              className={`w-full h-8 px-2 rounded-lg text-white font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md transition-all hover:brightness-90 ${planBtn.color}`}
                            >
                              {React.createElement(planBtn.icon, { className: 'h-3.5 w-3.5 shrink-0' })}
                              <span className="truncate">{planBtn.label}</span>
                            </button>
                          </Title>
                        ) : (
                          <div className="w-full h-8 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-[9px] border border-emerald-100 uppercase whitespace-nowrap flex items-center justify-center">
                            COMPLETADO
                          </div>
                        )}

                        {!isInitial && (
                          <button
                            onClick={() => onMoveBackPlanIndividual(alumno)}
                            className="w-full h-7 border border-slate-200 text-slate-500 rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                          >
                            <ArrowLeft className="h-3 w-3 shrink-0" /> Deshacer estado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BLOQUE 3: SEGUIMIENTO (por alumno) ── */}
        <section className={`rounded-2xl p-4 space-y-4 transition-colors bg-blue-50/30 border ${allSeguimientosCompleted ? 'border-emerald-100' : 'border-blue-100'
          }`}>
          <button
            onClick={() => toggleCard('allSeg')}
            className="w-full flex items-center justify-between text-left"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${allSeguimientosCompleted ? 'text-emerald-600' : 'text-blue-600'
              }`}>
              <FileText className="h-3.5 w-3.5" /> 3. Seguimiento
            </label>
            <FirmaSelector value={selectedRelacion.firmaSeguimiento} onChange={v => onUpdateFirma('firmaSeguimiento', v)} />
          </button>

          {(!(collapsedCards['allSeg'] ?? allSeguimientosCompleted)) && (
            <div className="space-y-3">
              {selectedRelacion.alumnos?.map(alumno => {
                const estadoSeguimiento = (alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE;
                const planBtn = getSeguimientoStatusButton(estadoSeguimiento);
                const isInitial = estadoSeguimiento === SeguimientoEstado.PENDIENTE
                const isCompleted = !planBtn;

                return (
                  <div
                    key={alumno.id}
                    className={`rounded-xl p-3 shadow-sm flex flex-col gap-3 transition-colors bg-white border ${isCompleted ? 'border-emerald-600' : 'border-blue-100'
                      }`}
                  >
                    <button
                      onClick={() => toggleCard(`seg-${alumno.id}`)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-slate-700 truncate pr-2">
                        {alumno.nombre} {alumno.apellidos}
                      </span>
                      <StatusBadge estado={estadoSeguimiento} type="seguimiento" />
                    </button>

                    {(!(collapsedCards[`seg-${alumno.id}`] ?? isCompleted)) && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1 shrink-0">
                          <BotonDescargaDOCX
                            onClick={async () => onDescargarSeguimiento(alumno)}
                            showText={true}
                            className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <button
                            onClick={async () => { const key = `seg-${alumno.id}`; setSendingEmail(key); try { await onEmailSeguimiento(alumno); } finally { setSendingEmail(null); } }}
                            disabled={sendingEmail === `seg-${alumno.id}`}
                            title="Enviar por correo"
                            className="h-8 px-2.5 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-[10px] font-bold uppercase disabled:opacity-50"
                          >
                            {sendingEmail === `seg-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                          </button>
                        </div>

                        {planBtn ? (
                          <Title text={planBtn.label}>
                            <button
                              onClick={() => onAdvanceSeguimientoIndividual(alumno)}
                              className={`w-full h-8 px-2 rounded-lg text-white font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md transition-all hover:brightness-90 ${planBtn.color}`}
                            >
                              {React.createElement(planBtn.icon, { className: 'h-3.5 w-3.5 shrink-0' })}
                              <span className="truncate">{planBtn.label}</span>
                            </button>
                          </Title>
                        ) : (
                          <div className="w-full h-8 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-[9px] border border-emerald-100 uppercase whitespace-nowrap flex items-center justify-center">
                            COMPLETADO
                          </div>
                        )}

                        {!isInitial && (
                          <button
                            onClick={() => onMoveBackSeguimientoIndividual(alumno)}
                            className="w-full h-7 border border-slate-200 text-slate-500 rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                          >
                            <ArrowLeft className="h-3 w-3 shrink-0" /> Deshacer estado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BLOQUE 4: VALORACION (por alumno) ── */}
        <section className={`rounded-2xl p-4 space-y-4 transition-colors bg-blue-50/30 border ${allValoracionesCompleted ? 'border-emerald-100' : 'border-blue-100'
          }`}>
          <button
            onClick={() => toggleCard('allVal')}
            className="w-full flex items-center justify-between text-left"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${allValoracionesCompleted ? 'text-emerald-600' : 'text-blue-600'
              }`}>
              <FileText className="h-3.5 w-3.5" /> 4. Valoración
            </label>
            <FirmaSelector value={selectedRelacion.firmaValoracion} onChange={v => onUpdateFirma('firmaValoracion', v)} />
          </button>

          {(!(collapsedCards['allVal'] ?? allValoracionesCompleted)) && (
            <div className="space-y-3">
              {selectedRelacion.alumnos?.map(alumno => {
                const estadoValoracion = (alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE;
                const planBtn = getValoracionStatusButton(estadoValoracion);
                const isInitial = estadoValoracion === ValoracionEstado.PENDIENTE;
                const isCompleted = !planBtn;

                return (
                  <div
                    key={alumno.id}
                    className={`rounded-xl p-3 shadow-sm flex flex-col gap-3 transition-colors bg-white border ${isCompleted ? 'border-emerald-600' : 'border-blue-100'
                      }`}
                  >
                    <button
                      onClick={() => toggleCard(`val-${alumno.id}`)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-slate-700 truncate pr-2">
                        {alumno.nombre} {alumno.apellidos}
                      </span>
                      <StatusBadge estado={estadoValoracion} type="valoracion" />
                    </button>

                    {(!(collapsedCards[`val-${alumno.id}`] ?? isCompleted)) && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1 shrink-0">
                          <BotonDescargaDOCX
                            onClick={async () => onDescargarValoracion(alumno)}
                            showText={true}
                            className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <button
                            onClick={async () => { const key = `val-${alumno.id}`; setSendingEmail(key); try { await onEmailValoracion(alumno); } finally { setSendingEmail(null); } }}
                            disabled={sendingEmail === `val-${alumno.id}`}
                            title="Enviar por correo"
                            className="h-8 px-2.5 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-[10px] font-bold uppercase disabled:opacity-50"
                          >
                            {sendingEmail === `val-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                          </button>
                        </div>

                        {planBtn ? (
                          <Title text={planBtn.label}>
                            <button
                              onClick={() => onAdvanceValoracionIndividual(alumno)}
                              className={`w-full h-8 px-2 rounded-lg text-white font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md transition-all hover:brightness-90 ${planBtn.color}`}
                            >
                              {React.createElement(planBtn.icon, { className: 'h-3.5 w-3.5 shrink-0' })}
                              <span className="truncate">{planBtn.label}</span>
                            </button>
                          </Title>
                        ) : (
                          <div className="w-full h-8 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-[9px] border border-emerald-100 uppercase whitespace-nowrap flex items-center justify-center">
                            COMPLETADO
                          </div>
                        )}

                        {!isInitial && (
                          <button
                            onClick={() => onMoveBackValoracionIndividual(alumno)}
                            className="w-full h-7 border border-slate-200 text-slate-500 rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                          >
                            <ArrowLeft className="h-3 w-3 shrink-0" /> Deshacer estado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BLOQUE 5: OTROS DOCUMENTOS (por alumno) ── */}
        <section className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 5. Otros documentos
            </label>
          </div>

          <div className="flex gap-2">
            <div className="flex-1" title="Descargar Carta de Presentación">
              <BotonDescargaPDF
                onClick={async () => onDescargarCarta()}
                showText={true}
                text="Carta de inicio de las FFE"
                className="w-full py-2.5 font-bold text-[10px] uppercase flex items-center justify-center gap-2 bg-white border border-slate-200 text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm active:scale-90 disabled:opacity-50"
              />
            </div>
            <button
              onClick={async () => { setSendingEmail('carta'); try { await onEmailCarta(); } finally { setSendingEmail(null); } }}
              disabled={sendingEmail === 'carta'}
              title="Enviar por correo"
              className="h-10 px-3 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 shrink-0 text-[10px] font-bold uppercase disabled:opacity-50"
            >
              {sendingEmail === 'carta' ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            {selectedRelacion.alumnos?.map((alumno) => (
              <div
                key={alumno.id}
                className="group bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-left justify-between gap-2"
              >

                {/* Información del Alumno */}
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-700 truncate pr-2">
                      {alumno.nombre} {alumno.apellidos}
                    </span>
                  </div>
                </div>

                {/* Acciones de Descarga */}
                <div className="flex gap-1.5">
                  <div title="Descargar Calendario" className="flex-1">
                    <BotonDescargaPDF
                      onClick={async () => onDescargarCalendario(alumno)}
                      showText={true}
                      text="CALENDARIO"
                      icon={CalendarDays}
                      className="h-8 w-full gap-1.5 flex items-center justify-center bg-white border border-slate-200 text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm active:scale-90 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={async () => { const key = `cal-${alumno.id}`; setSendingEmail(key); try { await onEmailCalendario(alumno); } finally { setSendingEmail(null); } }}
                    disabled={sendingEmail === `cal-${alumno.id}`}
                    title="Enviar por correo"
                    className="h-8 px-2.5 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 shrink-0 text-[10px] font-bold uppercase disabled:opacity-50"
                  >
                    {sendingEmail === `cal-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}