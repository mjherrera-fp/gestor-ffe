import React, { useEffect, useState } from 'react';
import { BadgeX, Loader2, X } from 'lucide-react';
import { Alumno, FFEMotivoNoRealizacion } from '../../../types/index.ts';
import { Modal } from '../../../components/ui/Modal.tsx';
import { mostrarToast } from '../../../utils/toast.ts';

interface Props {
  open: boolean;
  alumnos: Alumno[];
  onClose: () => void;
  onGuardado: () => void;
}

/**
 * Motivo de no realizacion de las FFE para varios alumnos a la vez.
 *
 * Es el mismo guardado que el de un alumno suelto (PUT /api/ffe/evaluaciones),
 * repetido por alumno. Igual que alli, solo tiene sentido para los que no
 * estan asignados a una relacion: los asignados se dejan fuera y se avisa.
 */
export function MotivoFFEMasivoModal({ open, alumnos, onClose, onGuardado }: Props) {
  const [motivos, setMotivos] = useState<FFEMotivoNoRealizacion[]>([]);
  const [motivoId, setMotivoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const sinAsignar = alumnos.filter(a => a.relacionId === null);
  const asignados = alumnos.length - sinAsignar.length;

  useEffect(() => {
    if (!open) return;
    setMotivoId(null);
    setCargando(true);
    fetch('/api/ffe/motivos-no-realizacion')
      .then(r => r.json())
      .then(setMotivos)
      .catch(() => setMotivos([]))
      .finally(() => setCargando(false));
  }, [open]);

  const guardar = async () => {
    if (motivoId === null) return;
    setGuardando(true);
    let fallos = 0;
    for (const a of sinAsignar) {
      try {
        const res = await fetch(`/api/ffe/evaluaciones/${a.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relacionId: null,
            fechaEvaluacion: null,
            valoracionFinalId: null,
            motivoNoRealizacionId: motivoId,
          }),
        });
        if (!res.ok) fallos++;
      } catch {
        fallos++;
      }
    }
    setGuardando(false);
    const guardados = sinAsignar.length - fallos;
    if (fallos > 0) {
      mostrarToast(`Motivo guardado en ${guardados} alumno${guardados === 1 ? '' : 's'}; ${fallos} no se pudieron guardar.`, 'error');
    } else {
      mostrarToast(`Motivo guardado en ${guardados} alumno${guardados === 1 ? '' : 's'}.`);
    }
    onGuardado();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-soft text-warning-strong">
              <BadgeX className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Motivo de no realización</h3>
              <p className="text-sm text-text-muted">
                {sinAsignar.length} alumno{sinAsignar.length === 1 ? '' : 's'} seleccionado{sinAsignar.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-main">
            <X className="h-5 w-5" />
          </button>
        </div>

        {asignados > 0 && (
          <p className="mb-4 text-xs font-medium text-warning-strong bg-warning-soft border border-warning/20 rounded-xl px-3 py-2">
            {asignados} de los seleccionados {asignados === 1 ? 'está asignado' : 'están asignados'} a una relación y no
            se {asignados === 1 ? 'le' : 'les'} pondrá motivo.
          </p>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-warning-strong" />
          </div>
        ) : sinAsignar.length === 0 ? (
          <p className="text-sm text-text-muted">Ninguno de los alumnos seleccionados está pendiente de asignar.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Selecciona el motivo por el que estos alumnos no cursan FFE:</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {motivos.map(m => (
                <label
                  key={m.id}
                  className={`block p-3 rounded-xl border cursor-pointer transition-all ${motivoId === m.id
                    ? 'border-warning/40 bg-warning-soft'
                    : 'border-border-base bg-surface-card hover:bg-surface-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="ffeMotivoMasivo"
                    value={m.id}
                    checked={motivoId === m.id}
                    onChange={() => setMotivoId(m.id)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-text-main">{m.codigo}</span>
                  <span className="text-sm text-text-muted ml-2">— {m.valor}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border-base">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || motivoId === null || sinAsignar.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-warning text-white text-sm font-semibold rounded-xl hover:bg-warning/90 disabled:opacity-50 transition-colors"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeX className="h-4 w-4" />}
            {guardando ? 'Guardando...' : `Guardar en ${sinAsignar.length}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
