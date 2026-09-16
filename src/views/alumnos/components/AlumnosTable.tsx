import React, { useState, useRef, useEffect } from 'react';
import { User, Phone, GraduationCap, Edit2, Trash2, Send, CheckCircle, Clock, Search, Mail, BadgeX, Loader2, X, FileText, Upload, TriangleAlert } from 'lucide-react';
import { Alumno, FFEMotivoNoRealizacion } from '../../../types/index.ts';
import { Title } from '../../../components/Title.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';

interface AlumnosTableProps {
  alumnos: Alumno[];
  onEdit: (a: Alumno) => void;
  onDelete: (id: number) => void;
  onAcademicDetail: (a: Alumno) => void;
  onEmail: (a: Alumno) => void;
  onFileUpload: (id: number, file: File) => void;
  onFileDelete: (id: number) => void;
  onViewCV: (a: Alumno) => void;
}

export function AlumnosTable({ alumnos, onEdit, onDelete, onAcademicDetail, onEmail, onFileUpload, onFileDelete, onViewCV }: AlumnosTableProps) {
  const [ffeModalAlumnoId, setFfeModalAlumnoId] = useState<number | null>(null);
  const [ffeMotivos, setFfeMotivos] = useState<FFEMotivoNoRealizacion[]>([]);
  const [ffeMotivoSelected, setFfeMotivoSelected] = useState<number | null>(null);
  const [savingFFEMotivo, setSavingFFEMotivo] = useState(false);
  const [loadingFFEMotivos, setLoadingFFEMotivos] = useState(false);

  // ── Scroll horizontal superior (minimapa de ancho completo) + columna Alumno fija ──
  const tableRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const applyMaxScrollLeft = (next: number) => {
    const el = tableRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = Math.max(0, Math.min(max, next));
  };

  const syncFromMain = () => {
    const el = tableRef.current;
    if (!el) return;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${-el.scrollLeft}px)`;
    if (thumbRef.current) thumbRef.current.style.left = `${el.scrollLeft}px`;
  };

  const onDragMove = (e: PointerEvent) => {
    const s = dragState.current;
    if (!s) return;
    applyMaxScrollLeft(s.startScrollLeft + (e.clientX - s.startX));
  };

  const onDragUp = () => {
    dragState.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
  };

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = tableRef.current;
    if (!el) return;
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const el = tableRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const pos = e.clientX - track.getBoundingClientRect().left;
    applyMaxScrollLeft(pos - el.clientWidth / 2);
  };

  useEffect(() => {
    const measure = () => {
      const el = tableRef.current;
      if (el) {
        setTableWidth(el.scrollWidth);
        setViewportWidth(el.clientWidth);
      }
      if (theadRef.current) setHeaderHeight(theadRef.current.offsetHeight);
      syncFromMain();
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [alumnos]);

  const handleOpenFFEMotivo = async (alumnoId: number) => {
    setFfeModalAlumnoId(alumnoId);
    setLoadingFFEMotivos(true);
    try {
      const [motivosRes, evRes] = await Promise.all([
        fetch('/api/ffe/motivos-no-realizacion'),
        fetch(`/api/ffe/evaluaciones/${alumnoId}`),
      ]);
      setFfeMotivos(await motivosRes.json());
      if (evRes.ok) {
        const ev = await evRes.json();
        setFfeMotivoSelected(ev?.motivoNoRealizacionId ?? null);
      } else {
        setFfeMotivoSelected(null);
      }
    } catch { } finally { setLoadingFFEMotivos(false); }
  };

  const handleSaveFFEMotivo = async () => {
    setSavingFFEMotivo(true);
    try {
      await fetch(`/api/ffe/evaluaciones/${ffeModalAlumnoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relacionId: null,
          fechaEvaluacion: null,
          valoracionFinalId: null,
          motivoNoRealizacionId: ffeMotivoSelected,
        }),
      });
      setFfeModalAlumnoId(null);
    } finally { setSavingFFEMotivo(false); }
  };

  const handleDeleteCV = async (alumno: Alumno) => {
    if (!window.confirm('¿Eliminar el CV de este alumno?')) return;
    await onFileDelete(alumno.id!);
  };

  const modalAlumno = ffeModalAlumnoId ? alumnos.find(a => a.id === ffeModalAlumnoId) : null;
  return (<>
    <div className="bg-white rounded-4xl border border-slate-100 shadow-sm overflow-hidden relative">
      <div ref={tableRef} onScroll={syncFromMain} className="overflow-x-auto">
      {alumnos.length > 0 && tableWidth > viewportWidth && (
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          className="absolute left-0 z-30 h-3.5 overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none bg-white border-b border-slate-200"
          style={{ top: headerHeight, width: tableWidth, transform: 'translateX(0px)' }}
        >
          <div
            ref={thumbRef}
            onPointerDown={onThumbPointerDown}
            className="absolute top-0 bottom-0 rounded-r-md bg-slate-300 hover:bg-slate-400 transition-colors"
            style={{ left: 0, width: Math.max(viewportWidth, 48) }}
          />
        </div>
      )}
      <table className="w-full text-left border-separate border-spacing-0 table-fixed">
        <colgroup>
          <col style={{ width: '240px' }} />
          <col style={{ width: '140px' }} />
          <col style={{ width: '180px' }} />
          <col style={{ width: '210px' }} />
          <col style={{ width: '150px' }} />
          <col style={{ width: '150px' }} />
          <col style={{ width: '240px' }} />
        </colgroup>
        <thead ref={theadRef}>
          <tr className="bg-slate-50">
            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 border-b border-slate-100">Alumno</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">DNI / Pasaporte</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Contacto</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Email EducaMadrid</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Estado Asignación</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">FFE Pte.</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-100">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map(alumno => {
            const isAssigned = alumno.relacionId !== null;
            return (
              <tr key={alumno.id} className="hover:bg-slate-50/50 transition-colors group font-sans">

                {/* Nombre */}
                <td className="px-8 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{alumno.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{alumno.apellidos}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {!alumno.numSS?.trim() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-[9px] font-bold uppercase tracking-wide">
                            <TriangleAlert className="h-3 w-3" /> Falta NSS
                          </span>
                        )}
                        {!!alumno.alumnoIncompleto && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wide">
                            <TriangleAlert className="h-3 w-3" /> Falta info estudiante
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* DNI */}
                <td className="px-6 py-4 border-b border-slate-50">
                  <span className="text-sm font-medium text-slate-600 font-mono">{alumno.dni}</span>
                </td>

                {/* Teléfono */}
                <td className="px-6 py-4 border-b border-slate-50">
                  <div className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-300" /> {alumno.tlfn}
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-4 border-b border-slate-50">
                  <div className="text-sm text-slate-500 truncate max-w-45 font-medium">{alumno.emailEduca}</div>
                </td>

                {/* Estado asignación */}
                <td className="px-6 py-4 border-b border-slate-50">
                  {isAssigned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-tight border border-emerald-100">
                      Asignado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-tight border border-amber-100">
                      Pdte. Asignar
                    </span>
                  )}
                </td>

                {/* Horas FFE */}
                <td className="px-6 py-4 border-b border-slate-50">
                  {(alumno.totalHorasFFE || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                      <Clock className="h-3 w-3" /> {alumno.totalHorasFFE} Horas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                      <CheckCircle className="h-3 w-3" /> Completado
                    </span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 text-right border-b border-slate-50">
                  <div className="flex items-center justify-end gap-1">
                    {!isAssigned && (
                      <Title text="Seleciona motivo para la no realización de las FFE">
                        <button
                          onClick={() => handleOpenFFEMotivo(alumno.id!)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <BadgeX className="h-4 w-4" />
                        </button>
                      </Title>
                    )}
                    <Title text={alumno.cvPath ? 'Ver CV' : 'Subir CV'}>
                      <button
                        onClick={() => alumno.cvPath ? onViewCV(alumno) : document.getElementById(`cv-upload-${alumno.id}`)?.click()}
                        className={`p-2 rounded-lg transition-all ${alumno.cvPath
                            ? 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        {alumno.cvPath ? <FileText className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                      </button>
                    </Title>
                    <input
                      id={`cv-upload-${alumno.id}`}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => e.target.files && onFileUpload(alumno.id!, e.target.files[0])}
                    />
                    <Title text="Enviar correo">
                      <button
                        onClick={() => onEmail(alumno)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </Title>
                    <Title text="Editar estudiante">
                      <button
                        onClick={() => onEdit(alumno)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </Title>
                    <Title text="Eliminar estudiante">
                      <button
                        onClick={() => onDelete(alumno.id!)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Title>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {alumnos.length === 0 && (
        <div className="p-20 text-center">
          <Search className="h-12 w-12 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold text-sm">
            No se encontraron alumnos con los criterios de búsqueda.
          </p>
        </div>
      )}
    </div>

    {/* ─── MODAL MOTIVO FFE ─── */}
    <Modal open={ffeModalAlumnoId !== null} onClose={() => setFfeModalAlumnoId(null)} maxWidth="sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <BadgeX className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Sin relación</h3>
              <p className="text-sm text-slate-500">
                {modalAlumno?.nombre} {modalAlumno?.apellidos}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setFfeModalAlumnoId(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingFFEMotivos ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Selecciona el motivo por el que el alumno no cursa FFE:</p>
            <div className="space-y-2">
              {ffeMotivos.map(m => (
                <label
                  key={m.id}
                  className={`block p-3 rounded-xl border cursor-pointer transition-all ${ffeMotivoSelected === m.id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="ffeMotivo"
                    value={m.id}
                    checked={ffeMotivoSelected === m.id}
                    onChange={() => setFfeMotivoSelected(m.id)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-slate-800">{m.codigo}</span>
                  <span className="text-sm text-slate-500 ml-2">— {m.valor}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFfeModalAlumnoId(null)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFFEMotivo}
                disabled={savingFFEMotivo || ffeMotivoSelected === null}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {savingFFEMotivo ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeX className="h-4 w-4" />}
                {savingFFEMotivo ? 'Guardando...' : 'Guardar motivo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  </>
  );
}
