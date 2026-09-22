import React, { useEffect, useState } from 'react';
import { CalendarPlus, X, Loader2, TriangleAlert } from 'lucide-react';
import { Empresa, TutorEmpresa } from '../types/index.ts';
import { Modal } from './ui/Modal.tsx';
import { CustomSelect } from './CustomSelect.tsx';
import { mostrarToast } from '../utils/toast.ts';
import { buildIcsEvent, downloadIcsFallback } from '../utils/calendar.ts';

interface CalendarioEventoModalProps {
  open: boolean;
  empresaId: number | null;
  tutorPreseleccionadoId?: number | null;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function buildCuerpo(emp: Empresa, tutor?: TutorEmpresa): string {
  const contacto = emp.personaContacto?.trim() || 'la empresa';
  const nomTutor = tutor && `${tutor.nombre?.trim() || ''} ${tutor.apellidos?.trim() || ''}`.trim();
  return [
    `Reunión con ${contacto} de la empresa ${emp.nombre}`,
    'Datos de contacto:',
    ` - email: ${emp.email?.trim() || 'No informado'}`,
    ` - teléfono: ${emp.tlfn?.trim() || 'No informado'}`,
    '',
    'Tutor:',
    ` - nombre: ${nomTutor || 'No informado'}`,
    ` - email: ${tutor?.email?.trim() || 'No informado'}`,
    ` - teléfono: ${tutor?.tlfn?.trim() || 'No informado'}`,
  ].join('\n');
}

export function CalendarioEventoModal({ open, empresaId, tutorPreseleccionadoId = null, onClose }: CalendarioEventoModalProps) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [tutores, setTutores] = useState<TutorEmpresa[]>([]);
  const [tutorId, setTutorId] = useState<number | ''>('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('10:00');
  const [horaFin, setHoraFin] = useState('11:00');
  const [tipoLugar, setTipoLugar] = useState<'calle' | 'online' | 'otro'>('online');
  const [lugar, setLugar] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [errorCarga, setErrorCarga] = useState(false);

  const direccionEmpresa = (emp: Empresa) =>
    [emp.direccion?.trim(), emp.ciudad?.trim()].filter(Boolean).join(', ');

  const aplicarDefaults = (emp: Empresa, tutoresDeEmpresa: TutorEmpresa[]) => {
    const direccion = direccionEmpresa(emp);
    const lugarDef = direccion || 'ONLINE';
    const asuntoDef = `Cita con ${emp.nombre}`;

    let tutorSel: number | '' = '';
    if (tutorPreseleccionadoId && tutoresDeEmpresa.some(t => t.id === tutorPreseleccionadoId)) {
      tutorSel = tutorPreseleccionadoId;
    } else {
      tutorSel = (tutoresDeEmpresa.find(t => t.email?.trim() && t.tlfn?.trim()) ?? tutoresDeEmpresa[0])?.id ?? '';
    }

    setFecha(hoyLocal());
    setHoraInicio('10:00');
    setHoraFin('11:00');
    setTipoLugar(direccion ? 'calle' : 'online');
    setLugar(lugarDef);
    setAsunto(asuntoDef);
    setTutorId(tutorSel);
    setCuerpo(buildCuerpo(emp, tutoresDeEmpresa.find(t => t.id === tutorSel)));
  };

  const seleccionarTipoLugar = (tipo: 'calle' | 'online' | 'otro') => {
    setTipoLugar(tipo);
    if (tipo === 'calle' && empresa) {
      setLugar(direccionEmpresa(empresa));
    } else if (tipo === 'online') {
      setLugar('ONLINE');
    }
  };

  const cargarEmpresa = async () => {
    if (!empresaId) return;
    setCargando(true);
    setErrorCarga(false);
    try {
      let emp: Empresa | null = null;
      const res = await fetch(`/api/empresas/${empresaId}`);
      if (res.ok) emp = await res.json();
      if (!emp) {
        const listaRes = await fetch('/api/empresas');
        if (listaRes.ok) {
          const lista = await listaRes.json() as Empresa[];
          emp = lista.find(e => e.id === empresaId) || null;
        }
      }
      if (!emp) {
        setErrorCarga(true);
        setEmpresa(null);
        return;
      }
      setEmpresa(emp);

      let tutoresDeEmpresa: TutorEmpresa[] = [];
      try {
        const tRes = await fetch(`/api/empresas/${empresaId}/tutores`);
        if (tRes.ok) tutoresDeEmpresa = await tRes.json();
      } catch { /* tutores opcionales */ }
      setTutores(tutoresDeEmpresa);
      aplicarDefaults(emp, tutoresDeEmpresa);
    } catch {
      setErrorCarga(true);
      setEmpresa(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open && empresaId) cargarEmpresa();
    if (!open) {
      setEmpresa(null);
      setTutores([]);
      setTutorId('');
      setErrorCarga(false);
    }
  }, [open, empresaId]);

  const cambiarTutor = (id: number | '') => {
    setTutorId(id);
    if (empresa) setCuerpo(buildCuerpo(empresa, tutores.find(t => t.id === id)));
  };

  const guardar = async () => {
    if (!empresa) return;
    if (tipoLugar === 'otro' && !lugar.trim()) { mostrarToast('Escribe el lugar de la cita', 'error'); return; }
    if (!fecha) { mostrarToast('Indica la fecha de la cita', 'error'); return; }
    if (!horaInicio || !horaFin) { mostrarToast('Indica la hora de inicio y fin', 'error'); return; }

    const inicio = `${fecha}T${horaInicio}`;
    const fin = `${fecha}T${horaFin}`;
    const ics = buildIcsEvent({
      summary: asunto.trim(),
      location: lugar.trim(),
      description: cuerpo,
      start: inicio,
      end: fin,
    });
    const slug = (empresa.nombre || 'empresa').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const filename = `cita-${slug || 'empresa'}.ics`;

    setGuardando(true);
    try {
      let ok = false;
      if (window.calendar?.createIcsEvent) {
        const res = await window.calendar.createIcsEvent(ics, filename);
        ok = res?.ok === true;
      }
      if (!ok) {
        downloadIcsFallback(ics, filename);
        mostrarToast('Archivo .ics descargado, ábrelo para añadirlo a tu calendario');
      } else {
        mostrarToast('Evento añadido a tu calendario');
      }
      onClose();
    } catch {
      downloadIcsFallback(ics, filename);
      mostrarToast('Archivo .ics descargado, ábrelo para añadirlo a tu calendario');
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full bg-surface-subtle border border-border-base rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all';
  const labelCls = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1';

  return (
    <Modal open={open} onClose={onClose} maxWidth="lg">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-base shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Añadir evento al calendario</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">
              {empresa?.nombre || (cargando ? 'Cargando...' : 'Cita con empresa')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-main transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Contenido */}
      <div className="px-6 py-5 overflow-y-auto space-y-4">
        {cargando && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando datos de la empresa...
          </div>
        )}

        {!cargando && errorCarga && (
          <div className="py-10 text-center">
            <TriangleAlert className="h-10 w-10 mx-auto text-danger mb-3" />
            <p className="text-sm text-text-muted font-medium">No se pudo cargar la empresa.</p>
          </div>
        )}

        {!cargando && !errorCarga && empresa && (
          <>
            {/* Fecha y horas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Fecha</label>
                <input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Hora inicio</label>
                <input type="time" className={inputCls} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Hora fin</label>
                <input type="time" className={inputCls} value={horaFin} onChange={e => setHoraFin(e.target.value)} />
              </div>
            </div>

            {/* Lugar */}
            <div>
              <label className={labelCls}>Lugar</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'calle' as const, label: 'Calle', disabled: !empresa.direccion?.trim() },
                  { key: 'online' as const, label: 'Online' },
                  { key: 'otro' as const, label: 'Otro' },
                ]).map(op => (
                  <button
                    key={op.key}
                    type="button"
                    disabled={op.disabled}
                    onClick={() => seleccionarTipoLugar(op.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                      tipoLugar === op.key
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-subtle text-text-muted border-border-base hover:text-text-main hover:border-primary/40'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {tipoLugar === 'otro' && (
                <input
                  type="text"
                  autoFocus
                  className={`${inputCls} mt-2`}
                  value={lugar}
                  onChange={e => setLugar(e.target.value)}
                  placeholder="Escribe el lugar de la cita..."
                />
              )}
              {tipoLugar === 'calle' && (
                <p className="text-[10px] text-text-muted mt-1">{lugar}</p>
              )}
              {!empresa.direccion?.trim() && (
                <p className="text-[10px] text-text-muted mt-1">La empresa no tiene dirección informada: usa Online o escribe un lugar.</p>
              )}
            </div>

            {/* Asunto */}
            <div>
              <label className={labelCls}>Asunto</label>
              <input type="text" className={inputCls} value={asunto} onChange={e => setAsunto(e.target.value)} />
            </div>

            {/* Tutor */}
            <div>
              <label className={labelCls}>Tutor de la empresa</label>
              <CustomSelect
                options={tutores.length > 0
                  ? tutores.map(t => ({ id: t.id!, label: `${t.nombre || ''} ${t.apellidos || ''}`.trim() || `Tutor ${t.id}` }))
                  : [{ id: '', label: 'Sin tutores registrados' }]}
                value={tutorId}
                onChange={v => cambiarTutor(v as number | '')}
                wrapperClassName="w-full"
                classListboxButton="!text-xs"
              />
              {tutores.length === 0 && (
                <p className="text-[10px] text-text-muted mt-1">El bloque Tutor del cuerpo quedará como «No informado».</p>
              )}
            </div>

            {/* Cuerpo */}
            <div>
              <label className={labelCls}>Cuerpo</label>
              <textarea
                className={`${inputCls} min-h-40 resize-y leading-relaxed`}
                value={cuerpo}
                onChange={e => setCuerpo(e.target.value)}
                placeholder="Detalle de la cita..."
              />
              <p className="text-[10px] text-text-muted mt-1">El bloque Tutor se regenera al cambiar el tutor seleccionado.</p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!cargando && !errorCarga && empresa && (
        <div className="px-6 py-4 border-t border-border-base bg-surface-subtle/40 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-text-muted hover:bg-surface-hover rounded-xl transition-all border border-border-base"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Añadir a calendario
          </button>
        </div>
      )}
    </Modal>
  );
}