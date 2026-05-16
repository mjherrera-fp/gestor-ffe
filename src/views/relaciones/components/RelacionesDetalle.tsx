import React, { useState } from 'react';
import { FileText, ArrowLeft, Send, Clock, ShieldCheck, CheckCircle2, Calendar, FileDown, Users, CalendarDays, Download, Loader2, FileArchive } from 'lucide-react';
import { RelacionAlumno, Alumno, RelacionEstado, PlanFormativoEstado, SeguimientoEstado, ValoracionEstado, SelectedDocs } from '../../../types/index.ts';
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
  onDescargarPlanFormativo: (tipo: 'docx' | 'pdf', alumno: Alumno) => Promise<void>;
  onDescargarSeguimiento: (alumno: Alumno) => Promise<void>;
  onAdvanceSeguimientoIndividual: (alumno: Alumno) => void;
  onMoveBackSeguimientoIndividual: (alumno: Alumno) => void;
  onDescargarValoracion: (alumno: Alumno) => Promise<void>;
  onAdvanceValoracionIndividual: (alumno: Alumno) => void;
  onMoveBackValoracionIndividual: (alumno: Alumno) => void;
  onDescargarCarta: () => Promise<void>;
  onDescargarRelacion: (tipo: 'docx' | 'pdf') => Promise<void>;
  onDescargarCalendario: (alumno: Alumno) => Promise<void>;
  onHandleDescargarTodo: () => Promise<void>;
  isDownloadingMasivo: boolean;
  downloadProgress: number;
  downloadStatus: string;
  setShowSelectionModal: React.Dispatch<React.SetStateAction<boolean>>;
  showSelectionModal: boolean;
  selectedDocs: SelectedDocs;
  setSelectedDocs: React.Dispatch<React.SetStateAction<SelectedDocs>>;
}

export function RelacionDetalle({
  selectedRelacion, alumnos,
  onAdvanceStatus, onMoveBackStatus,
  onAdvancePlanStatus, onMoveBackPlanStatus,
  onAdvancePlanIndividual, onMoveBackPlanIndividual,
  onDescargarPlanFormativo, onDescargarSeguimiento,
  onAdvanceSeguimientoIndividual, onMoveBackSeguimientoIndividual,
  onDescargarValoracion, onAdvanceValoracionIndividual, onMoveBackValoracionIndividual,
  onDescargarCarta, onDescargarCalendario, onHandleDescargarTodo,
  isDownloadingMasivo, downloadProgress, downloadStatus,
  setShowSelectionModal, showSelectionModal, setSelectedDocs, selectedDocs
}: RelacionDetalleProps) {

  const [isDownloading, setIsDownloading] = useState(false);

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
      {/* MODAL 1: SELECCIÓN DE DOCUMENTOS A DESCARGAR */}
      {showSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Seleccionar Documentación</h3>
              <p className="text-xs text-slate-500 mt-1">
                Elige qué archivos deseas incluir en el paquete comprimido (.ZIP) de la relación actual.
              </p>
            </div>

            {/* NUEVO: Botones de Selección Rápida */}
            <div className="flex justify-end gap-3 mb-2">
              <button
                type="button"
                onClick={() => setSelectedDocs({
                  plan: true,
                  seguimiento: true,
                  valoracion: true,
                  calendario: true,
                  relacion: true,
                  carta: true
                })}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
              >
                Seleccionar Todos
              </button>
              <span className="text-slate-300 text-[11px]">|</span>
              <button
                type="button"
                onClick={() => setSelectedDocs({
                  plan: false,
                  seguimiento: false,
                  valoracion: false,
                  calendario: false,
                  relacion: false,
                  carta: false
                })}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
              >
                Deseleccionar Todos
              </button>
            </div>

            {/* Checkboxes de opciones */}
            <div className="space-y-3 my-6">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.relacion}
                  onChange={(e) => setSelectedDocs({ ...selectedDocs, relacion: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Relación de alumnos</p>
                  <p className="text-[11px] text-slate-400">Documento en formato Word (.docx) y PDF con la relación de alumnos</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.plan}
                  onChange={(e) => setSelectedDocs({ ...selectedDocs, plan: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Plan Formativo</p>
                  <p className="text-[11px] text-slate-400">Documento por alumno en formato Word (.docx) y PDF</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.seguimiento}
                  onChange={(e) => setSelectedDocs({ ...selectedDocs, seguimiento: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Ficha de Seguimiento Periódico</p>
                  <p className="text-[11px] text-slate-400">Plantilla editable por alumno en formato Word (.docx)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.valoracion}
                  onChange={(e) => setSelectedDocs({ ...selectedDocs, valoracion: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Valoración Final</p>
                  <p className="text-[11px] text-slate-400">Plantilla editable por alumno en formato Word (.docx)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.calendario}
                  onChange={(e) => setSelectedDocs({ ...selectedDocs, calendario: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Calendario de Prácticas</p>
                  <p className="text-[11px] text-slate-400">Documento de asistencia por alumno en formato PDF</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.carta}
                  onChange={(e) => setSelectedDocs({ ...selectedDocs, carta: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Carta a la empresa</p>
                  <p className="text-[11px] text-slate-400">Documento explicativo sobre las FFE</p>
                </div>
              </label>
            </div>

            {/* Botones de acción del Modal */}
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSelectionModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onHandleDescargarTodo()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/10 transition-all transform active:scale-98"
              >
                Aceptar y Generar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE PROGRESO DE DESCARGA */}
      {isDownloadingMasivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative overflow-hidden">

            {/* Decoración superior */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                {downloadProgress === 100 ? (
                  <FileArchive className="h-6 w-6 text-blue-600" />
                ) : (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-800">
                Descargando Documentación
              </h3>

              <p className="text-sm text-slate-500 mt-2 min-h-10">
                {downloadStatus}
              </p>

              {/* Barra de progreso */}
              <div className="w-full mt-6">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                  <span>Progreso</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

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

        {/* Botón de Descargar Todo (intacto) */}
        <button
          onClick={() => setShowSelectionModal(true)}
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
                          onClick={async () => onDescargarPlanFormativo('docx', alumno)}
                          showText={true}
                          className="h-8 px-2 bg-white border border-slate-200 text-blue-600 rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                        />
                        <BotonDescargaPDF
                          onClick={async () => onDescargarPlanFormativo('pdf', alumno)}
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
                          onClick={async () => onDescargarSeguimiento(alumno)}
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
                          onClick={async () => onDescargarValoracion(alumno)}
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