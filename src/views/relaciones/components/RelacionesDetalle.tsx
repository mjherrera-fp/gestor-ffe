import React, {useState} from 'react';
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Download,
  ExternalLink,
  FileBadge,
  FileText,
  Loader2,
  Mail,
  X
} from 'lucide-react';
import {
  Alumno,
  FFEResultadoRA,
  FFEValoracionFinal,
  FirmaTipo,
  FirmaTipoLabels,
  PlanFormativoEstado,
  RelacionAlumno,
  RelacionEstado,
  ResultadoAprendizaje,
  SeguimientoEstado,
  SelectedDocs,
  ValoracionEstado
} from '../../../types/index.ts';
import {BotonDescargaPDF} from '../../../components/BotonDescargaPDF.tsx';
import {BotonDescargaDOCX} from '../../../components/BotonDescargaDOCX.tsx';
import {CustomSelect} from '../../../components/CustomSelect.tsx';
import {StatusBadge} from './RelacionesListado.tsx';
import {
  getAnexoStatusButton,
  getPlanStatusButton,
  getSeguimientoStatusButton,
  getValoracionStatusButton
} from '../utils/relacionesUtils.ts';
import {Title} from '@/src/components/Title.tsx';
import {Modal} from '../../../components/ui/Modal.tsx';
import {mostrarToast} from '../../../utils/toast.ts';

const FIRMA_CICLO: FirmaTipo[] = [FirmaTipo.SIN_ASIGNAR, FirmaTipo.DIGITAL, FirmaTipo.MANUAL];
const COMPARADOR_NATURAL = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

interface FFERAEstado {
  modulo: string;
  codigoModulo: string;
  numeroRa: string;
  nombreRa: string;
  aprobado: boolean;
}

function FirmaSelector({ value, onChange }: { value?: FirmaTipo; onChange: (v: FirmaTipo) => void }) {
  const firma = value || FirmaTipo.SIN_ASIGNAR;
  const next = () => {
    const idx = FIRMA_CICLO.indexOf(firma);
    return FIRMA_CICLO[(idx + 1) % FIRMA_CICLO.length];
  };
  return (
    <Title text="Haz clic para cambiar tipo de firma">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChange(next()); }}
className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${firma === FirmaTipo.DIGITAL
          ? 'bg-primary-light text-primary border-primary-light hover:bg-primary/15'
          : firma === FirmaTipo.MANUAL
            ? 'bg-warning-soft text-warning-strong border-warning/20 hover:bg-warning/15'
            : 'bg-surface-subtle text-text-muted border-border-base hover:bg-surface-hover'
        }`}
      >
        {FirmaTipoLabels[firma]}
      </button>
    </Title>
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
  onOpenDocManager: (rel: RelacionAlumno, entidad: string, alumno?: Alumno) => void;
  anexoRelacionExterno?: boolean;
  anexoRelacionUrl?: string;
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
  onDescargarCarta, onDescargarCalendario, onDescargarRelacion, onHandleDescargarTodo,
  isDownloadingMasivo, downloadProgress, downloadStatus,
  setTargetDownloadRelaciones, targetDownloadRelaciones, setSelectedDocs, selectedDocs,
  setTargetEmailRelaciones,
                                  onUpdateFirma,
                                  onOpenDocManager,
                                  anexoRelacionExterno = false,
                                  anexoRelacionUrl = ''
}: RelacionDetalleProps) {

  const [isDownloading, setIsDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [ffeModalAlumno, setFfeModalAlumno] = useState<Alumno | null>(null);
  const [ffeRAs, setFfeRAs] = useState<FFERAEstado[]>([]);
  const [ffeValoraciones, setFfeValoraciones] = useState<FFEValoracionFinal[]>([]);
  const [ffeValoracionFinalId, setFfeValoracionFinalId] = useState<number | null>(null);
  const [loadingFFE, setLoadingFFE] = useState(false);
  const [savingFFE, setSavingFFE] = useState(false);
  const toggleCard = (key: string) => {
    setCollapsedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenFFE = async (alumno: Alumno) => {
    setFfeModalAlumno(alumno);
    setLoadingFFE(true);
    try {
      const [detalleRes, valoracionesRes, evRes, raRes] = await Promise.all([
        fetch(`/api/detalles-academicos`),
        fetch('/api/ffe/valoraciones-finales'),
        fetch(`/api/ffe/evaluaciones/${alumno.id}`),
        alumno.relacionId ? fetch(`/api/ffe/ra-resultados/${alumno.id}/${alumno.relacionId}`) : Promise.resolve(null),
      ]);
      const detalles: any[] = await detalleRes.json();
      const detalle = detalles.find((d: any) => d.id === (alumno as any).detalleAcademicoId);
      const raList: ResultadoAprendizaje[] = detalle?.resultadosAprendizaje || [];
      const valoraciones: FFEValoracionFinal[] = await valoracionesRes.json();
      const evaluacion = evRes.ok ? await evRes.json() : null;
      const savedRAs: FFEResultadoRA[] = raRes && raRes.ok ? await raRes.json() : [];
      const orderedRAs = [...raList].sort((a, b) =>
        COMPARADOR_NATURAL.compare(a.codigo, b.codigo)
        || COMPARADOR_NATURAL.compare(a.ra, b.ra)
        || COMPARADOR_NATURAL.compare(a.modulo, b.modulo)
      );

      setFfeRAs(orderedRAs.map((ra: ResultadoAprendizaje) => {
        const saved = savedRAs.find((s) => s.modulo === ra.modulo && s.codigoRa === ra.ra)
          || savedRAs.find((s) => s.modulo === ra.modulo && s.codigoRa === ra.codigo && s.nombreRa === ra.nombre);
        return {
          modulo: ra.modulo,
          codigoModulo: ra.codigo,
          numeroRa: ra.ra,
          nombreRa: ra.nombre,
          aprobado: saved ? !!saved.aprobado : true,
        };
      }));
      setFfeValoraciones(valoraciones);
      setFfeValoracionFinalId(evaluacion?.valoracionFinalId ?? null);
    } catch {} finally { setLoadingFFE(false); }
  };

  const handleSaveFFE = async () => {
    if (!ffeModalAlumno) return;
    setSavingFFE(true);
    try {
      const alumno = ffeModalAlumno;
      if (alumno.relacionId) {
        await fetch(`/api/ffe/ra-resultados/${alumno.id}/${alumno.relacionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: ffeRAs.map(({ modulo, numeroRa, nombreRa, aprobado }) => ({
              modulo,
              codigoRa: numeroRa,
              nombreRa,
              aprobado,
            })),
          }),
        });
      }
      await fetch(`/api/ffe/evaluaciones/${alumno.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relacionId: alumno.relacionId ?? null,
          fechaEvaluacion: new Date().toISOString().split('T')[0],
          valoracionFinalId: ffeValoracionFinalId,
          motivoNoRealizacionId: null,
        }),
      });
      setFfeModalAlumno(null);
    } finally { setSavingFFE(false); }
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-muted">
        <div className="bg-surface-subtle p-6 rounded-full mb-4">
          <FileText className="h-12 w-12 text-text-muted" />
        </div>
        <h3 className="text-base font-bold text-text-main mb-2">Selecciona una relación</h3>
        <p className="text-xs text-text-muted">
          Para gestionar la documentación y los anexos asociados a la relación.
        </p>
      </div>
    );
  }

  const anexoBtn = getAnexoStatusButton(selectedRelacion.estado);

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in slide-in-from-right-4 duration-300">


      <div className="p-6 border-b border-border-base bg-surface-subtle/50 flex items-start justify-between mb-4 shrink-0">

        {/* NUEVO CONTENEDOR: Agrupa el título y la Ref en una columna */}
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">
            Gestión de documentación
          </h3>
          {/* La referencia debajo del título con un margen superior pequeño (mt-1) */}
          <span className="text-xs text-text-muted font-medium mt-1">
            Ref: {selectedRelacion.numRelacion} {/* <-- Asegúrate de usar tu variable real aquí */}
          </span>
        </div>


        {/* Botón de Enviar Todo */}
        <Title text="Enviar documentación seleccionada por correo a la empresa">
          <button
            onClick={() => { if (selectedRelacion) setTargetEmailRelaciones([selectedRelacion]); }}
            className="flex items-center gap-1.5 px-3 py-1.5 mr-3 bg-primary-light text-primary hover:bg-primary/15 border border-primary-light rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Mail className="h-3.5 w-3.5" />
          </button>
        </Title>

        {/* Botón de Descargar Todo */}
        <Title text="Descargar todos los documentos">
          <button
            onClick={() => {
              if (selectedRelacion) setTargetDownloadRelaciones([selectedRelacion]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary/15 border border-primary-light rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </button>
        </Title>

      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">

        {/* ── BLOQUE 1: ANEXO DE RELACIÓN ── */}
<section className={`rounded-2xl p-4 space-y-4 transition-colors bg-surface-subtle/50 border ${anexoBtn ? 'border-border-base' : 'border-success/20'
        }`}>
          <div
            onClick={() => toggleCard('anexo')}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${anexoBtn ? 'text-primary' : 'text-success'
              }`}>
              <FileText className="h-3.5 w-3.5" />1. Anexo de Relación
            </label>
            <FirmaSelector value={selectedRelacion.firmaRelacion} onChange={v => onUpdateFirma('firmaRelacion', v)} />
          </div>

          {(!(collapsedCards['anexo'] ?? !anexoBtn)) && (
            <>
              <div className="flex justify-end">
                <StatusBadge estado={selectedRelacion.estado} type="relacion" />
              </div>

              <div className="flex gap-2">
                {anexoRelacionExterno ? (
                  <Title text="Abrir el anexo de relación en el enlace externo">
                    <button
                      onClick={() => {
                        if (!anexoRelacionUrl.trim()) {
                          mostrarToast('No se ha configurado la URL del anexo de relación', 'error');
                          return;
                        }
                        window.open(anexoRelacionUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="h-8 px-3 flex-1 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light text-[10px] font-bold uppercase"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" /> Anexo externo
                    </button>
                  </Title>
                ) : (
                  <>
                    <BotonDescargaDOCX
                      onClick={() => onDescargarRelacion('docx')}
                      showText={true}
                    />
                    <Title text="Descargar PDF">
                      <BotonDescargaPDF
                        onClick={() => onDescargarRelacion('pdf')}
                        showText={true}
                      />
                    </Title>
                  </>
                )}
                <Title text="Enviar por correo">
                  <button
                    onClick={async () => { setSendingEmail('relacion'); try { await onEmailRelacion('pdf'); } finally { setSendingEmail(null); } }}
                    disabled={sendingEmail === 'relacion'}
                    className="h-8 px-2.5 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light text-[10px] font-bold uppercase disabled:opacity-50"
                  >
                    {sendingEmail === 'relacion' ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                  </button>
                </Title>
                <Title text="Gestor documental">
                  <button
                      onClick={() => onOpenDocManager(selectedRelacion, 'relacion')}
                      className="h-8 px-2.5 flex items-center justify-center gap-1 bg-surface-subtle text-text-muted rounded-lg hover:bg-surface-hover transition-colors border border-border-base text-[10px] font-bold uppercase"
                  >
                    <Archive className="h-3.5 w-3.5"/> DOCS
                  </button>
                </Title>
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
                <div className="bg-success-soft text-success-strong p-2.5 rounded-xl text-center font-bold text-[10px] border border-success/20 uppercase">
                  Anexo Completado
                </div>
              )}

              {selectedRelacion.estado !== RelacionEstado.PENDIENTE_ENVIAR_EMPRESA && (
                <button
                  onClick={() => onMoveBackStatus(selectedRelacion)}
                  className="w-full py-2.5 border border-border-base text-text-muted rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-surface-subtle"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Regresar Estado Anterior
                </button>
              )}
            </>
          )}
        </section>

        {/* ── BLOQUE 2: PLANES FORMATIVOS (por alumno) ── */}
<section className={`rounded-2xl p-4 space-y-4 transition-colors bg-primary-light/30 border ${allPlanesCompleted ? 'border-success/20' : 'border-primary-light'
        }`}>
          <div
            onClick={() => toggleCard('allPlanes')}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${allPlanesCompleted ? 'text-success' : 'text-primary'
              }`}>
              <FileText className="h-3.5 w-3.5" /> 2. Planes Formativos
            </label>
            <FirmaSelector value={selectedRelacion.firmaPlanFormativo} onChange={v => onUpdateFirma('firmaPlanFormativo', v)} />
          </div>

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
                    className={`rounded-xl p-3 shadow-sm flex flex-col gap-3 transition-colors bg-surface-card border ${isCompleted ? 'border-success' : 'border-primary-light'
                      }`}
                  >
                    <button
                      onClick={() => toggleCard(`plan-${alumno.id}`)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-text-main truncate pr-2">
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
                            className="h-8 px-2 bg-surface-card border border-border-base text-primary rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-primary-light transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <Title text="Descargar PDF">
                            <BotonDescargaPDF
                              onClick={async () => onDescargarPlanFormativo('pdf', alumno)}
                              showText={true}
                              className="h-8 px-2 bg-surface-card border border-border-base text-danger rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-danger-soft transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                            />
                          </Title>
                          <Title text="Enviar por correo">
                            <button
                              onClick={async () => { const key = `plan-${alumno.id}`; setSendingEmail(key); try { await onEmailPlanFormativo('pdf', alumno); } finally { setSendingEmail(null); } }}
                              disabled={sendingEmail === `plan-${alumno.id}`}
                              className="h-8 px-2.5 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light text-[10px] font-bold uppercase disabled:opacity-50"
                            >
                              {sendingEmail === `plan-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                            </button>
                          </Title>
                          <Title text="Gestor documental">
                            <button
                                onClick={() => onOpenDocManager(selectedRelacion, 'plan-formativo', alumno)}
                                className="h-8 px-2.5 flex items-center justify-center gap-1 bg-surface-subtle text-text-muted rounded-lg hover:bg-surface-hover transition-colors border border-border-base text-[10px] font-bold uppercase"
                            >
                              <Archive className="h-3.5 w-3.5"/> DOCS
                            </button>
                          </Title>
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
                          <div className="w-full h-8 bg-success-soft text-success-strong rounded-lg text-center font-bold text-[9px] border border-success/20 uppercase whitespace-nowrap flex items-center justify-center">
                            COMPLETADO
                          </div>
                        )}

                        {!isInitial && (
                          <button
                            onClick={() => onMoveBackPlanIndividual(alumno)}
                            className="w-full h-7 border border-border-base text-text-muted rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-surface-subtle transition-colors"
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
<section className={`rounded-2xl p-4 space-y-4 transition-colors bg-primary-light/30 border ${allSeguimientosCompleted ? 'border-success/20' : 'border-primary-light'
        }`}>
          <div
            onClick={() => toggleCard('allSeg')}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${allSeguimientosCompleted ? 'text-success' : 'text-primary'
              }`}>
              <FileText className="h-3.5 w-3.5" /> 3. Seguimiento
            </label>
            <FirmaSelector value={selectedRelacion.firmaSeguimiento} onChange={v => onUpdateFirma('firmaSeguimiento', v)} />
          </div>

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
                    className={`rounded-xl p-3 shadow-sm flex flex-col gap-3 transition-colors bg-surface-card border ${isCompleted ? 'border-success' : 'border-primary-light'
                      }`}
                  >
                    <button
                      onClick={() => toggleCard(`seg-${alumno.id}`)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-text-main truncate pr-2">
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
                            className="h-8 px-2 bg-surface-card border border-border-base text-primary rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-primary-light transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <Title text="Enviar por correo">
                            <button
                              onClick={async () => { const key = `seg-${alumno.id}`; setSendingEmail(key); try { await onEmailSeguimiento(alumno); } finally { setSendingEmail(null); } }}
                              disabled={sendingEmail === `seg-${alumno.id}`}
                              className="h-8 px-2.5 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light text-[10px] font-bold uppercase disabled:opacity-50"
                            >
                              {sendingEmail === `seg-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                            </button>
                          </Title>
                          <Title text="Gestor documental">
                            <button
                                onClick={() => onOpenDocManager(selectedRelacion, 'seguimiento', alumno)}
                                className="h-8 px-2.5 flex items-center justify-center gap-1 bg-surface-subtle text-text-muted rounded-lg hover:bg-surface-hover transition-colors border border-border-base text-[10px] font-bold uppercase"
                            >
                              <Archive className="h-3.5 w-3.5"/> DOCS
                            </button>
                          </Title>
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
                          <div className="w-full h-8 bg-success-soft text-success-strong rounded-lg text-center font-bold text-[9px] border border-success/20 uppercase whitespace-nowrap flex items-center justify-center">
                            COMPLETADO
                          </div>
                        )}

                        {!isInitial && (
                          <button
                            onClick={() => onMoveBackSeguimientoIndividual(alumno)}
                            className="w-full h-7 border border-border-base text-text-muted rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-surface-subtle transition-colors"
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
<section className={`rounded-2xl p-4 space-y-4 transition-colors bg-primary-light/30 border ${allValoracionesCompleted ? 'border-success/20' : 'border-primary-light'
        }`}>
          <div
            onClick={() => toggleCard('allVal')}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${allValoracionesCompleted ? 'text-success' : 'text-primary'
              }`}>
              <FileText className="h-3.5 w-3.5" /> 4. Valoración
            </label>
            <FirmaSelector value={selectedRelacion.firmaValoracion} onChange={v => onUpdateFirma('firmaValoracion', v)} />
          </div>

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
                    className={`rounded-xl p-3 shadow-sm flex flex-col gap-3 transition-colors bg-surface-card border ${isCompleted ? 'border-success' : 'border-primary-light'
                      }`}
                  >
                    <button
                      onClick={() => toggleCard(`val-${alumno.id}`)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-text-main truncate pr-2">
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
                            className="h-8 px-2 bg-surface-card border border-border-base text-primary rounded-lg text-[9px] uppercase whitespace-nowrap hover:bg-primary-light transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                          />
                          <Title text="Enviar por correo">
                            <button
                              onClick={async () => { const key = `val-${alumno.id}`; setSendingEmail(key); try { await onEmailValoracion(alumno); } finally { setSendingEmail(null); } }}
                              disabled={sendingEmail === `val-${alumno.id}`}
                              className="h-8 px-2.5 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light text-[10px] font-bold uppercase disabled:opacity-50"
                            >
                              {sendingEmail === `val-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                            </button>
                          </Title>
                          <Title text="Gestor documental">
                            <button
                                onClick={() => onOpenDocManager(selectedRelacion, 'valoracion', alumno)}
                                className="h-8 px-2.5 flex items-center justify-center gap-1 bg-surface-subtle text-text-muted rounded-lg hover:bg-surface-hover transition-colors border border-border-base text-[10px] font-bold uppercase"
                            >
                              <Archive className="h-3.5 w-3.5"/> DOCS
                            </button>
                          </Title>
                          <Title text="Evaluación FFE">
                            <button
                              onClick={async () => handleOpenFFE(alumno)}
                              className="h-8 px-2.5 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light text-[10px] font-bold uppercase"
                            >
                              <FileBadge className="h-3.5 w-3.5" />
                            </button>
                          </Title>
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
                          <div className="w-full h-8 bg-success-soft text-success-strong rounded-lg text-center font-bold text-[9px] border border-success/20 uppercase whitespace-nowrap flex items-center justify-center">
                            COMPLETADO
                          </div>
                        )}

                        {!isInitial && (
                          <button
                            onClick={() => onMoveBackValoracionIndividual(alumno)}
                            className="w-full h-7 border border-border-base text-text-muted rounded-lg font-bold text-[9px] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 hover:bg-surface-subtle transition-colors"
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
        <section className="bg-surface-subtle/50 border border-border-base rounded-2xl p-5 space-y-4">
          <div className="pb-2 border-b border-border-base">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 5. Otros documentos
            </label>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Title text="Descargar Carta de Presentación">
                <BotonDescargaPDF
                  onClick={async () => onDescargarCarta()}
                  showText={true}
                  text="Carta de inicio de las FFE"
                  className="w-full py-2.5 font-bold text-[10px] uppercase flex items-center justify-center gap-2 bg-surface-card border border-border-base text-danger hover:text-danger hover:border-danger/20 hover:bg-danger-soft rounded-lg transition-all shadow-sm active:scale-90 disabled:opacity-50"
                />
              </Title>
            </div>
            <Title text="Enviar por correo">
              <button
                onClick={async () => { setSendingEmail('carta'); try { await onEmailCarta(); } finally { setSendingEmail(null); } }}
                disabled={sendingEmail === 'carta'}
                className="h-10 px-3 flex items-center justify-center gap-1 bg-primary-light/40 text-primary rounded-lg hover:bg-primary-light/60 transition-colors border border-primary/15 shrink-0 text-[10px] font-bold uppercase disabled:opacity-50"
              >
                {sendingEmail === 'carta' ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
              </button>
            </Title>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            {selectedRelacion.alumnos?.map((alumno) => (
              <div
                key={alumno.id}
                className="group bg-surface-card border border-border-base rounded-xl p-3 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 flex items-left justify-between gap-2"
              >

                {/* Información del Alumno */}
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text-main truncate pr-2">
                      {alumno.nombre} {alumno.apellidos}
                    </span>
                  </div>
                </div>

                {/* Acciones de Descarga */}
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <Title text="Descargar Calendario">
                      <BotonDescargaPDF
                        onClick={async () => onDescargarCalendario(alumno)}
                        showText={true}
                        text="CALENDARIO"
                        icon={CalendarDays}
                        className="h-8 w-full gap-1.5 flex items-center justify-center bg-surface-card border border-border-base text-danger hover:text-danger hover:border-danger/20 hover:bg-danger-soft rounded-lg transition-all shadow-sm active:scale-90 disabled:opacity-50"
                      />
                    </Title>
                  </div>
                  <Title text="Enviar por correo">
                    <button
                      onClick={async () => { const key = `cal-${alumno.id}`; setSendingEmail(key); try { await onEmailCalendario(alumno); } finally { setSendingEmail(null); } }}
                      disabled={sendingEmail === `cal-${alumno.id}`}
                      className="h-8 px-2.5 flex items-center justify-center gap-1 bg-primary-light text-primary rounded-lg hover:bg-primary/15 transition-colors border border-primary-light shrink-0 text-[10px] font-bold uppercase disabled:opacity-50"
                    >
                      {sendingEmail === `cal-${alumno.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Mail className="h-3.5 w-3.5" />} Mail
                    </button>
                  </Title>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ─── MODAL EVALUACIÓN FFE ─── */}
      <Modal open={!!ffeModalAlumno} onClose={() => setFfeModalAlumno(null)} maxWidth="xl" cardClass="overflow-visible">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-light text-primary">
                <FileBadge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Evaluación FFE</h3>
                <p className="text-sm text-text-muted">
                  {ffeModalAlumno?.nombre} {ffeModalAlumno?.apellidos}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setFfeModalAlumno(null)} className="text-text-muted hover:text-text-main">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loadingFFE ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* RA list */}
              <div>
                <h4 className="text-sm font-bold text-text-main mb-3 uppercase tracking-wider">Resultados de Aprendizaje</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ffeRAs.length === 0 && (
                    <p className="text-xs text-text-muted italic">No hay RA definidos para este alumno.</p>
                  )}
                  {ffeRAs.map((ra, i) => (
                    <div key={`${ra.modulo}-${ra.codigoModulo}-${ra.numeroRa}-${i}`} className="flex items-center justify-between p-3 rounded-xl border border-border-base bg-surface-subtle/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-main">
                          <span className="text-primary">{ra.modulo} ({ra.codigoModulo})</span>
                          <span className="text-text-muted font-normal"> — {ra.numeroRa}</span>
                          {ra.nombreRa && <span className="text-text-muted font-normal">: {ra.nombreRa}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => setFfeRAs(prev => prev.map((r, j) => j === i ? { ...r, aprobado: true } : r))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            ra.aprobado ? 'bg-success-soft text-success-strong border border-success/20' : 'bg-surface-card text-text-muted border border-border-base hover:bg-surface-subtle'
                          }`}
                        >
                          <CheckSquare className="h-3 w-3 inline mr-1" /> Aprobado
                        </button>
                        <button
                          type="button"
                          onClick={() => setFfeRAs(prev => prev.map((r, j) => j === i ? { ...r, aprobado: false } : r))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            !ra.aprobado ? 'bg-danger-soft text-danger border border-danger/20' : 'bg-surface-card text-text-muted border border-border-base hover:bg-surface-subtle'
                          }`}
                        >
                          <X className="h-3 w-3 inline mr-1" /> Suspendido
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valoración final */}
              <div>
                <h4 className="text-sm font-bold text-text-main mb-3 uppercase tracking-wider">Valoración final</h4>
                <CustomSelect
                  options={[
                    { id: '', label: 'Seleccionar valoración final...' },
                    ...ffeValoraciones.map(vf => ({ id: vf.id, label: `${vf.codigo} — ${vf.valor}` })),
                  ]}
                  value={ffeValoracionFinalId ?? ''}
                  onChange={v => setFfeValoracionFinalId(v === '' ? null : Number(v))}
                  classListboxButton="text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-base">
                <button
                  type="button"
                  onClick={() => setFfeModalAlumno(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFFE}
                  disabled={savingFFE}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingFFE ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBadge className="h-4 w-4" />}
                  {savingFFE ? 'Guardando...' : 'Guardar evaluación'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}