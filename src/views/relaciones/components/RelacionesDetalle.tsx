import React from 'react';
import { FileText, ArrowLeft, Send, Clock, ShieldCheck, CheckCircle2, Calendar, FileDown, Users, CalendarDays } from 'lucide-react';
import { RelacionAlumno, Alumno, RelacionEstado, PlanFormativoEstado, SeguimientoEstado, ValoracionEstado } from '../../../types/index.ts';
import { BotonDescargaPDF } from '../../../components/BotonDescargaPDF.tsx';
import { BotonDescargaDOCX } from '../../../components/BotonDescargaDOCX.tsx';
import { StatusBadge } from './RelacionesListado.tsx';
import { getAnexoStatusButton, getPlanStatusButton, getSeguimientoStatusButton, getValoracionStatusButton } from '../utils/relacionesUtils.ts';
import { Title } from '@/src/components/Title.tsx';

interface RelacionDetalleProps {
  selectedRelacion: RelacionAlumno | null;
  alumnos: Alumno[];
  onAdvanceStatus: (rel: RelacionAlumno) => void;
  onMoveBackStatus: (rel: RelacionAlumno) => void;
  onAdvancePlanStatus: (rel: RelacionAlumno) => void;
  onMoveBackPlanStatus: (rel: RelacionAlumno) => void;
  onAdvancePlanIndividual: (alumno: Alumno) => void;
  onMoveBackPlanIndividual: (alumno: Alumno) => void;
  onDescargarPlan: (tipo: 'docx' | 'pdf') => void;
  onDescargarPlanIndividual: (tipo: 'docx' | 'pdf', alumno: Alumno) => Promise<void>;
  onDescargarSeguimientoIndividual: (alumno: Alumno) => Promise<void>;
  onAdvanceSeguimientoIndividual: (alumno: Alumno) => void;
  onMoveBackSeguimientoIndividual: (alumno: Alumno) => void;
  onDescargarValoracionIndividual: (alumno: Alumno) => Promise<void>;
  onAdvanceValoracionIndividual: (alumno: Alumno) => void;
  onMoveBackValoracionIndividual: (alumno: Alumno) => void;
  onDescargarCarta: () => Promise<void>;
  onDescargarCalendario: (alumno: Alumno) => Promise<void>;
}

export function RelacionDetalle({
  selectedRelacion, alumnos,
  onAdvanceStatus, onMoveBackStatus,
  onAdvancePlanStatus, onMoveBackPlanStatus,
  onAdvancePlanIndividual, onMoveBackPlanIndividual,
  onDescargarPlan, onDescargarPlanIndividual,
  onDescargarSeguimientoIndividual, onAdvanceSeguimientoIndividual,
  onMoveBackSeguimientoIndividual, onDescargarValoracionIndividual,
  onAdvanceValoracionIndividual, onMoveBackValoracionIndividual,
  onDescargarCarta, onDescargarCalendario
}: RelacionDetalleProps) {

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

      {/* Cabecera */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800 leading-tight">Gestión de Documentación</h2>
        <p className="text-xs font-mono text-slate-500 mt-1">Ref: {selectedRelacion.numRelacion}</p>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">

        {/* ── BLOQUE 1: ANEXO DE RELACIÓN ── */}
        <section className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              1. Anexo de Relación
            </label>
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
        </section>

        {/* ── BLOQUE 2: PLANES FORMATIVOS (por alumno) ── */}
        <section className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 2. Planes Formativos
            </label>
          </div>

          <div className="space-y-3">
            {selectedRelacion.alumnos?.map(alumno => {
              const estadoPlan = (alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
              const planBtn = getPlanStatusButton(estadoPlan);
              const isInitial = estadoPlan === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE
                || estadoPlan === 'PENDIENTE_ENVIAR_ESTUDIANTE';

              return (
                <div
                  key={alumno.id}
                  className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm flex flex-col gap-3"
                >
                  {/* Cabecera alumno */}
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-bold text-slate-700 truncate pr-2">
                      {alumno.nombre} {alumno.apellidos}
                    </span>
                    <StatusBadge estado={estadoPlan} type="plan" />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex gap-1 shrink-0">
                        <BotonDescargaDOCX
                          onClick={async () => onDescargarPlanIndividual('docx', alumno)}
                          showText={true}
                          className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                        />
                        <BotonDescargaPDF
                          onClick={async () => onDescargarPlanIndividual('pdf', alumno)}
                          showText={true}
                          className="h-8 px-2 bg-white border border-slate-200 text-red-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-red-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                        />
                      </div>

                      {planBtn ? (
                        <Title text={planBtn.label}>
                          <button
                            onClick={() => onAdvancePlanIndividual(alumno)}
                            className={`flex-1 h-8 px-2 min-w-0 rounded-lg text-white font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md transition-all hover:brightness-90 ${planBtn.color}`}
                          >
                            {React.createElement(planBtn.icon, { className: 'h-3.5 w-3.5 shrink-0' })}
                            <span className="truncate">{planBtn.label}</span>
                          </button>
                        </Title>
                      ) : (
                        <div className="flex-1 h-8 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-[9px] border border-emerald-100 uppercase whitespace-nowrap flex items-center justify-center">
                          COMPLETADO
                        </div>
                      )}
                    </div>

                    {!isInitial && (
                      <button
                        onClick={() => onMoveBackPlanIndividual(alumno)}
                        className="w-full h-7 border border-slate-200 text-slate-500 rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <ArrowLeft className="h-3 w-3 shrink-0" /> Deshacer estado
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BLOQUE 3: SEGUIMIENTO (por alumno) ── */}
        <section className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 3. Seguimiento
            </label>
          </div>

          <div className="space-y-3">
            {selectedRelacion.alumnos?.map(alumno => {
              const estadoSeguimiento = (alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE;
              const planBtn = getSeguimientoStatusButton(estadoSeguimiento);
              const isInitial = estadoSeguimiento === SeguimientoEstado.PENDIENTE

              return (
                <div
                  key={alumno.id}
                  className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm flex flex-col gap-3"
                >
                  {/* Cabecera alumno */}
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-bold text-slate-700 truncate pr-2">
                      {alumno.nombre} {alumno.apellidos}
                    </span>
                    <StatusBadge estado={estadoSeguimiento} type="seguimiento" />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex gap-1 shrink-0">
                        <BotonDescargaDOCX
                          onClick={async () => onDescargarSeguimientoIndividual(alumno)}
                          showText={true}
                          className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                        />
                      </div>

                      {planBtn ? (
                        <Title text={planBtn.label}>
                          <button
                            onClick={() => onAdvanceSeguimientoIndividual(alumno)}
                            className={`flex-1 h-8 px-2 min-w-0 rounded-lg text-white font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md transition-all hover:brightness-90 ${planBtn.color}`}
                          >
                            {React.createElement(planBtn.icon, { className: 'h-3.5 w-3.5 shrink-0' })}
                            <span className="truncate">{planBtn.label}</span>
                          </button>
                        </Title>
                      ) : (
                        <div className="flex-1 h-8 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-[9px] border border-emerald-100 uppercase whitespace-nowrap flex items-center justify-center">
                          COMPLETADO
                        </div>
                      )}
                    </div>

                    {!isInitial && (
                      <button
                        onClick={() => onMoveBackSeguimientoIndividual(alumno)}
                        className="w-full h-7 border border-slate-200 text-slate-500 rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <ArrowLeft className="h-3 w-3 shrink-0" /> Deshacer estado
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BLOQUE 4: VALORACION (por alumno) ── */}
        <section className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 4. Valoración
            </label>
          </div>

          <div className="space-y-3">
            {selectedRelacion.alumnos?.map(alumno => {
              const estadoValoracion = (alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE;
              const planBtn = getValoracionStatusButton(estadoValoracion);
              const isInitial = estadoValoracion === ValoracionEstado.PENDIENTE;

              return (
                <div
                  key={alumno.id}
                  className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm flex flex-col gap-3"
                >
                  {/* Cabecera alumno */}
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-bold text-slate-700 truncate pr-2">
                      {alumno.nombre} {alumno.apellidos}
                    </span>
                    <StatusBadge estado={estadoValoracion} type="valoracion" />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex gap-1 shrink-0">
                        <BotonDescargaDOCX
                          onClick={async () => onDescargarValoracionIndividual(alumno)}
                          showText={true}
                          className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                        />
                      </div>

                      {planBtn ? (
                        <Title text={planBtn.label}>
                          <button
                            onClick={() => onAdvanceValoracionIndividual(alumno)}
                            className={`flex-1 h-8 px-2 min-w-0 rounded-lg text-white font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md transition-all hover:brightness-90 ${planBtn.color}`}
                          >
                            {React.createElement(planBtn.icon, { className: 'h-3.5 w-3.5 shrink-0' })}
                            <span className="truncate">{planBtn.label}</span>
                          </button>
                        </Title>
                      ) : (
                        <div className="flex-1 h-8 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-[9px] border border-emerald-100 uppercase whitespace-nowrap flex items-center justify-center">
                          COMPLETADO
                        </div>
                      )}
                    </div>

                    {!isInitial && (
                      <button
                        onClick={() => onMoveBackValoracionIndividual(alumno)}
                        className="w-full h-7 border border-slate-200 text-slate-500 rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <ArrowLeft className="h-3 w-3 shrink-0" /> Deshacer estado
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BLOQUE 5: OTROS DOCUMENTOS (por alumno) ── */}
        <section className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 5. Otros documentos
            </label>
          </div>

          <div title="Descargar Carta de Presentación">
            <BotonDescargaPDF
              onClick={async () => onDescargarCarta()}
              showText={true}
              text="Carta de inicio de las FFE"
              className="w-full py-2.5 font-bold text-[10px] uppercase flex items-center justify-center gap-2 bg-white border border-slate-200 text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm active:scale-90 disabled:opacity-50"
            />
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
                <div className="flex gap-1.5 flex-1">
                  {/* Añadimos w-full al div del tooltip para que no colapse al contenido */}
                  <div title="Descargar Calendario" className="w-full">
                    <BotonDescargaPDF
                      onClick={async () => onDescargarCalendario(alumno)}
                      showText={true}
                      text="CALENDARIO"
                      icon={CalendarDays}
                      className="h-8 w-full gap-1.5 flex items-center justify-center bg-white border border-slate-200 text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm active:scale-90 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}