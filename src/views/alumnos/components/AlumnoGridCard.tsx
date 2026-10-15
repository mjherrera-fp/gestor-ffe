import React, { useState } from 'react';
import {
  User, Mail, Phone, Edit2, Trash2, Send,
  FileUp, CheckCircle, Clock, Eye, BadgeX, Loader2, X, TriangleAlert, MessageSquare
} from 'lucide-react';
import { Alumno, FFEMotivoNoRealizacion } from '../../../types/index.ts';
import { Title } from '../../../components/Title.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';

interface AlumnoGridCardProps {
  alumno: Alumno;
  onEdit: (a: Alumno) => void;
  onDelete: (id: number) => void;
  onAcademicDetail: (a: Alumno) => void;
  onEmail: (a: Alumno) => void;
  onFileUpload: (id: number, file: File) => void;
  onFileDelete: (id: number) => void;
  onViewCV: (a: Alumno) => void;
  onGoToAnulaciones?: (a: Alumno) => void;
}

export function AlumnoGridCard({
  alumno, onEdit, onDelete, onAcademicDetail, onEmail, onFileUpload, onFileDelete, onViewCV, onGoToAnulaciones
}: AlumnoGridCardProps) {
  const isAssigned = alumno.relacionId !== null;
  const [ffeMotivoModal, setFfeMotivoModal] = useState(false);
  const [ffeMotivos, setFfeMotivos] = useState<FFEMotivoNoRealizacion[]>([]);
  const [ffeMotivoSelected, setFfeMotivoSelected] = useState<number | null>(null);
  const [savingFFEMotivo, setSavingFFEMotivo] = useState(false);
  const [loadingFFEMotivos, setLoadingFFEMotivos] = useState(false);

  const handleOpenFFEMotivo = async () => {
    setFfeMotivoModal(true);
    setLoadingFFEMotivos(true);
    try {
      const [motivosRes, evRes] = await Promise.all([
        fetch('/api/ffe/motivos-no-realizacion'),
        fetch(`/api/ffe/evaluaciones/${alumno.id}`),
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
      await fetch(`/api/ffe/evaluaciones/${alumno.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relacionId: null,
          fechaEvaluacion: null,
          valoracionFinalId: null,
          motivoNoRealizacionId: ffeMotivoSelected,
        }),
      });
      setFfeMotivoModal(false);
    } finally { setSavingFFEMotivo(false); }
  };

  return (<>
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full">
      <div className="p-6 flex flex-col grow">

        {/* Cabecera */}
        <div className="flex items-start justify-between mb-4">
          <div className="bg-surface-subtle p-3 rounded-lg border border-border-base group-hover:bg-primary/5 transition-colors">
            <User className="h-6 w-6 text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <div className="flex gap-1.5">
            {!isAssigned && (
              <Title text="Seleciona motivo para la no realización de las FFE">
                <button
                  onClick={handleOpenFFEMotivo}
                  className="p-1.5 text-text-muted hover:text-warning-strong transition-colors hover:bg-warning-soft rounded-md"
                >
                  <BadgeX className="h-4 w-4" />
                </button>
              </Title>
            )}
            <Title text="Enviar correo">
              <button
                onClick={() => onEmail(alumno)}
                className="p-1.5 text-text-muted hover:text-primary transition-colors hover:bg-primary-light rounded-md"
              >
                <Mail className="h-4 w-4" />
              </button>
            </Title>
            <Title text="Editar estudiante">
              <button
                onClick={() => onEdit(alumno)}
                className="p-1.5 text-text-muted hover:text-primary transition-colors hover:bg-primary-light rounded-md"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </Title>
            <Title text="Eliminar estudiante">
              <button
                onClick={() => onDelete(alumno.id!)}
                className="p-1.5 text-text-muted hover:text-danger transition-colors hover:bg-danger-soft rounded-md"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Title>
          </div>
        </div>

        {/* Nombre */}
        <div className="mb-4">
          <h3 className="font-bold text-base text-text-main leading-tight mb-0.5">
            {alumno.nombre} {alumno.apellidos}
          </h3>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">DNI: {alumno.dni}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {alumno.comentario?.trim() && (
              <Title text={alumno.comentario}>
                <span className="inline-flex p-1 rounded-full text-primary bg-primary/10 border border-primary/20 cursor-help">
                  <MessageSquare className="h-3 w-3" />
                </span>
              </Title>
            )}
            {!!alumno.anulacionesCount && onGoToAnulaciones && (
              <Title text="Ver anulaciones de FFE en el histórico">
                <button
                  onClick={() => onGoToAnulaciones(alumno)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-soft text-danger-strong border border-danger/20 rounded-full text-[9px] font-black uppercase tracking-wide hover:bg-danger/15 transition-colors"
                >
                  {alumno.anulacionesCount} A
                </button>
              </Title>
            )}
            {!alumno.numSS?.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-soft text-danger-strong border border-danger/20 rounded-full text-[9px] font-bold uppercase tracking-wide">
                <TriangleAlert className="h-3 w-3" /> Falta NSS
              </span>
            )}
            {!!alumno.alumnoIncompleto && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning-soft text-warning-strong border border-warning/20 rounded-full text-[9px] font-bold uppercase tracking-wide">
                <TriangleAlert className="h-3 w-3" /> Falta info estudiante
              </span>
            )}
          </div>
        </div>

        {/* Datos contacto + estado */}
        <div className="space-y-2 border-t border-border-base pt-4 mt-auto">
          <div className="flex items-center gap-2.5 text-xs text-text-main font-medium">
            <Mail className="h-3.5 w-3.5 text-text-muted" />
            <span className="truncate">{alumno.emailEduca}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-text-main font-medium">
            <Phone className="h-3.5 w-3.5 text-text-muted" /> {alumno.tlfn}
          </div>
          {(alumno.totalHorasFFE || 0) > 0 ? (
            <div className="flex items-center gap-2.5 text-xs font-bold text-warning-strong bg-warning-soft px-2 py-1 rounded-md mt-1 border border-warning/20">
              <Clock className="h-3.5 w-3.5" /> {alumno.totalHorasFFE} Horas
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs font-bold text-success-strong bg-success-soft px-2 py-1 rounded-md mt-1 border border-success/20">
              <CheckCircle className="h-3.5 w-3.5" /> Completado
            </div>
          )}
          {isAssigned ? (
            <div className="flex items-center gap-2.5 text-xs font-bold text-success-strong bg-success-soft px-2 py-1 rounded-md mt-1 border border-success/20">
              <CheckCircle className="h-3.5 w-3.5" /> Alumno Asignado
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs font-bold text-warning-strong bg-warning-soft px-2 py-1 rounded-md mt-1 border border-warning/20">
              <Clock className="h-3.5 w-3.5" /> Pendiente de Asignación
            </div>
          )}
        </div>
      </div>

      {/* Footer: CV */}
      <div className="px-6 py-4 bg-surface-subtle/50 border-t border-border-base flex items-center justify-between mt-auto">
        {alumno.cvPath ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onViewCV(alumno)}
              className="flex items-center gap-1.5 text-success font-bold text-[10px] uppercase tracking-wider hover:text-success-strong transition-colors bg-success-soft px-2 py-1 rounded-md"
            >
              <Eye className="h-4 w-4" /> Ver CV
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-text-muted font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
            <FileUp className="h-4 w-4" />
            Subir CV (.pdf)
            <input
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={e => e.target.files && onFileUpload(alumno.id!, e.target.files[0])}
            />
          </label>
        )}
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50">
          #{alumno.id}
        </div>
      </div>
    </div>

    {/* ─── MODAL MOTIVO FFE ─── */}
    <Modal open={ffeMotivoModal} onClose={() => setFfeMotivoModal(false)} maxWidth="sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-soft text-warning-strong">
              <BadgeX className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Sin relación</h3>
              <p className="text-sm text-text-muted">
                {alumno.nombre} {alumno.apellidos}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setFfeMotivoModal(false)} className="text-text-muted hover:text-text-main">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingFFEMotivos ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-warning-strong" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Selecciona el motivo por el que el alumno no cursa FFE:</p>
            <div className="space-y-2">
              {ffeMotivos.map(m => (
                <label
                  key={m.id}
                  className={`block p-3 rounded-xl border cursor-pointer transition-all ${ffeMotivoSelected === m.id
                    ? 'border-warning/40 bg-warning-soft'
                    : 'border-border-base bg-surface-card hover:bg-surface-hover'
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
                  <span className="text-sm font-semibold text-text-main">{m.codigo}</span>
                  <span className="text-sm text-text-muted ml-2">— {m.valor}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-base">
              <button
                type="button"
                onClick={() => setFfeMotivoModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFFEMotivo}
                disabled={savingFFEMotivo || ffeMotivoSelected === null}
                className="flex items-center gap-2 px-5 py-2.5 bg-warning text-white text-sm font-semibold rounded-xl hover:bg-warning/90 disabled:opacity-50 transition-colors"
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