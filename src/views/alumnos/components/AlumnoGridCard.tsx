import React, { useState } from 'react';
import {
  User, Mail, Phone, GraduationCap, Edit2, Trash2, Send,
  FileUp, CheckCircle, Clock, X, Eye, BadgeX, Loader2
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
}

export function AlumnoGridCard({
  alumno, onEdit, onDelete, onAcademicDetail, onEmail, onFileUpload, onFileDelete
}: AlumnoGridCardProps) {
  const isAssigned = alumno.relacionId !== null;
  const [isDeleting, setIsDeleting] = useState(false);
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
    } catch {} finally { setLoadingFFEMotivos(false); }
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

  // Función para abrir el Base64 como un archivo PDF real
  const handleOpenPDF = () => {
    if (!alumno.cvPath) return;

    // Extraemos los datos base64 del string (data:application/pdf;base64,JVBERi...)
    const base64Parts = alumno.cvPath.split(',');
    if (base64Parts.length !== 2) return;
    
    const byteCharacters = atob(base64Parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    // Creamos una URL temporal y la abrimos
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  };

  const handleDeleteCV = async () => {
    if (!window.confirm('¿Eliminar el CV de este alumno?')) return;
    setIsDeleting(true);
    await onFileDelete(alumno.id!);
    setIsDeleting(false);
  };

  return (<>
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full">
      <div className="p-6 flex flex-col grow">

        {/* Cabecera */}
        <div className="flex items-start justify-between mb-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 group-hover:bg-primary/5 transition-colors">
            <User className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
          <div className="flex gap-1.5">
            <Title text="Detalles Académicos">
              <button
                onClick={() => onAcademicDetail(alumno)}
                className={`p-1.5 transition-colors rounded-md ${
                  alumno.detalleAcademicoId
                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
              </button>
            </Title>
            {!isAssigned && (
              <Title text="FFE No cursada">
                <button
                  onClick={handleOpenFFEMotivo}
                  className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors hover:bg-amber-50 rounded-md"
                >
                  <BadgeX className="h-4 w-4" />
                </button>
              </Title>
            )}
            <Title text="Enviar correo">
              <button
                onClick={() => onEmail(alumno)}
                className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors hover:bg-blue-50 rounded-md"
              >
                <Mail className="h-4 w-4" />
              </button>
            </Title>
            <button
              onClick={() => onEdit(alumno)}
              className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary-light rounded-md"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(alumno.id!)}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-md"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nombre */}
        <div className="mb-4">
          <h3 className="font-bold text-base text-slate-900 leading-tight mb-0.5">
            {alumno.nombre} {alumno.apellidos}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DNI: {alumno.dni}</p>
        </div>

        {/* Datos contacto + estado */}
        <div className="space-y-2 border-t border-slate-50 pt-4 mt-auto">
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
            <Mail className="h-3.5 w-3.5 text-slate-300" />
            <span className="truncate">{alumno.emailEduca}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
            <Phone className="h-3.5 w-3.5 text-slate-300" /> {alumno.tlfn}
          </div>
          {isAssigned ? (
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mt-1 border border-emerald-100/50">
              <CheckCircle className="h-3.5 w-3.5" /> Alumno Asignado
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-1 border border-amber-100/50">
              <Clock className="h-3.5 w-3.5" /> Pendiente de Asignación
            </div>
          )}
        </div>
      </div>

      {/* Footer: CV */}
      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
        {alumno.cvPath ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenPDF}
              className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider hover:text-emerald-700 transition-colors bg-emerald-50 px-2 py-1 rounded-md"
            >
              <Eye className="h-4 w-4" /> Ver CV
            </button>
            <Title text="Eliminar CV">
              <button
                onClick={handleDeleteCV}
                disabled={isDeleting}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </Title>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
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
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest opacity-50">
          #{alumno.id}
        </div>
      </div>
    </div>

      {/* ─── MODAL MOTIVO FFE ─── */}
      <Modal open={ffeMotivoModal} onClose={() => setFfeMotivoModal(false)} maxWidth="sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <BadgeX className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Sin relación</h3>
                <p className="text-sm text-slate-500">
                  {alumno.nombre} {alumno.apellidos}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setFfeMotivoModal(false)} className="text-slate-400 hover:text-slate-600">
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
                    className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                      ffeMotivoSelected === m.id
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
                  onClick={() => setFfeMotivoModal(false)}
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