import React, { useState, useEffect } from 'react';
import { Save, X, GraduationCap, Building2, MapPin, Phone, Mail, Hash, Layers, ListFilter } from 'lucide-react';
import { DetalleAcademico, Alumno } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';

interface Props {
  open: boolean;
  alumno: Alumno;
  onClose: () => void;
}

export default function DetalleAcademicoModal({ open, alumno, onClose }: Props) {
  const [detalles, setDetalles] = useState<DetalleAcademico[]>([]);
  const [selectedId, setSelectedId] = useState<string>(alumno?.detalleAcademicoId?.toString() || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/detalles-academicos');
        const all = await res.json();
        setDetalles(all);
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/alumnos/${alumno.id}/link-detalle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detalleId: selectedId ? parseInt(selectedId) : null })
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !alumno) return null;

  return (
    <Modal open={open} onClose={onClose} maxWidth="lg">
        <div className="px-8 py-6 border-b border-border-base flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main leading-none">Vincular Académico</h3>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Para {alumno.nombre} {alumno.apellidos}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors p-2 hover:bg-slate-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1">
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Seleccionar Centro / Ciclo / Grupo</label>
            <div className="bg-white rounded-xl overflow-visible"> {/* Cambiar hidden por visible */}
              <CustomSelect
                value={selectedId}
                onChange={setSelectedId}
                options={detalles.map(d => ({
                  id: d.id,
                  label: `${(d as any).nombreCorto || d.codigoGrupo} - ${(d as any).centroNombre || ''}`
                }))}
                classListboxButton="py-3"
              />
            </div>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-8 bg-slate-50 p-4 rounded-xl border border-dashed border-border-base">
            Si no encuentras el detalle académico, créalo primero en la sección de <strong>Profesor</strong> del menú principal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button type="button" onClick={onClose} className="w-full py-3 border border-border-base rounded-xl font-bold text-xs uppercase tracking-widest text-text-muted hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">
              {saving ? 'Guardando...' : 'Vincular'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
