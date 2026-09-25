import {useEffect, useState} from 'react';
import {Ban, Loader2, TriangleAlert, X} from 'lucide-react';
import {Modal} from '../../../components/ui/Modal.tsx';
import {AnulacionPreview, RelacionAlumno} from '../../../types/index.ts';

const hoyLocal = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

interface AnulacionFFEModalProps {
  open: boolean;
  rel: RelacionAlumno | null;
  alumnoId: number | null;
  onClose: () => void;
  onPreview: (alumnoId: number, fecha: string) => Promise<AnulacionPreview | null>;
  onSubmit: (alumnoId: number, fecha: string, motivo: string) => Promise<unknown>;
}

export function AnulacionFFEModal({ open, rel, alumnoId, onClose, onPreview, onSubmit }: AnulacionFFEModalProps) {
  const alumno = rel?.alumnos?.find(a => a.id === alumnoId) ?? null;
  const fechaMin = alumno?.fechaInicio ?? undefined;
  const fechaMax = hoyLocal();

  const [fecha, setFecha] = useState(fechaMax);
  const [motivo, setMotivo] = useState('');
  const [preview, setPreview] = useState<AnulacionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFecha(fechaMax);
      setMotivo('');
      setError(null);
      setPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alumnoId]);

  useEffect(() => {
    if (!open || !alumnoId || !fecha) return;
    let cancelled = false;
    setLoadingPreview(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await onPreview(alumnoId, fecha);
        if (!cancelled) setPreview(data);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [open, alumnoId, fecha, onPreview]);

  const handleSubmit = async () => {
    if (!alumnoId) return;
    if (!motivo.trim()) {
      setError('El motivo de la anulación es obligatorio.');
      return;
    }
    if (fechaMin && fecha < fechaMin) {
      setError('La fecha de anulación no puede ser anterior al inicio de la relación.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(alumnoId, fecha, motivo.trim());
    } catch (e: any) {
      setError(e?.message || 'No se ha podido anular la FFE.');
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="md">
      {!alumno ? (
        <div className="p-8 text-center text-sm text-text-muted">
          No se ha encontrado al alumno en la relación.
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger-soft text-danger-strong">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Anular FFE</h3>
                <p className="text-sm text-text-muted">
                  {alumno.nombre} {alumno.apellidos}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-surface-subtle/60 border border-border-base rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted font-semibold">Referencia</span>
                <span className="font-mono font-bold text-primary">{rel?.numRelacion || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-semibold">Total Horas FFE</span>
                <span className="font-black text-text-main">{preview?.totalHoras ?? alumno.totalHorasFFE}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-semibold">Fecha inicio</span>
                <span className="text-text-main">{alumno.fechaInicio ? alumno.fechaInicio : '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Fecha de anulación
              </label>
              <input
                type="date"
                value={fecha}
                min={fechaMin}
                max={fechaMax}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border-base bg-surface-card text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Motivo de la anulación <span className="text-danger">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={3}
                placeholder="Describe el motivo por el que se anula la FFE de este alumno…"
                className="w-full px-3 py-2 rounded-lg border border-border-base bg-surface-card text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            {error && (
              <div className="text-xs font-semibold text-danger-strong bg-danger-soft border border-danger/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="bg-warning-soft/60 border border-warning/30 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-semibold">Horas realizadas hasta la fecha</span>
                <span className={`font-black ${loadingPreview ? 'text-text-muted' : 'text-warning-strong'}`}>
                  {loadingPreview ? 'Calculando…' : `${preview?.horasRealizadas ?? 0}h`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-semibold">Nuevo Total Horas FFE tras anular</span>
                <span className="font-black text-text-main">
                  {loadingPreview ? '…' : `${preview?.horasPendientes ?? 0}h`}
                </span>
              </div>
              <p className="text-[11px] text-text-muted leading-snug">
                El alumno quedará desvinculado de la relación y se eliminarán sus fechas de inicio y fin. La anulación quedará registrada en el histórico.
              </p>
            </div>

            <div className="bg-danger-soft border border-danger/30 rounded-xl p-3 flex items-start gap-2 text-[11px] font-semibold text-danger-strong">
              <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Esta operación no se puede revertir.</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-text-muted hover:bg-surface-hover rounded-xl border border-border-base transition-all font-sans"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-danger text-white text-sm font-bold rounded-xl shadow-lg shadow-danger/20 hover:bg-danger/90 transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Anular FFE
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}