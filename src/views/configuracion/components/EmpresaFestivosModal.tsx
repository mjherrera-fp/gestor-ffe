import React, { useState, useEffect } from 'react';
import { Plus, Loader2, ExternalLink, X } from 'lucide-react';
import { DateList } from '../../../components/ui/DateList.tsx';
import { allLocalidades, LocalidadEntry } from '../../../data/geo/geoData.ts';

interface EmpresaFestivosModalProps {
  localidad: string;
  festivos: string[];
  onSave: (festivos: string[]) => void;
  onClose: () => void;
}

export function EmpresaFestivosModal({ localidad, festivos, onSave, onClose }: EmpresaFestivosModalProps) {
  const [dates, setDates] = useState<string[]>([...festivos].sort());
  const [newDate, setNewDate] = useState('');
  const [loadingFestivos, setLoadingFestivos] = useState(false);
  const [showAgradecimiento, setShowAgradecimiento] = useState(false);
  const [festivosImportados, setFestivosImportados] = useState(0);

  const localidadEntry: LocalidadEntry | undefined = allLocalidades.find(
    l => l.name.toLowerCase() === localidad.toLowerCase()
  );
  const slug = localidadEntry?.slug || null;

  const handleAdd = () => {
    if (!newDate) return;
    if (!dates.includes(newDate)) {
      setDates(prev => [...prev, newDate].sort());
    }
    setNewDate('');
  };

  const handleRemove = (d: string) => {
    setDates(prev => prev.filter(x => x !== d));
  };

  const handleObtenerFestivos = async () => {
    if (!slug) return;
    setLoadingFestivos(true);
    try {
      const res = await fetch(`/api/festivos/obtener?slug=${slug}`);
      const data = await res.json();
      if (data.fechas?.length) {
        const nuevasFechas = data.fechas.filter((f: string) => !dates.includes(f));
        const newSet = [...new Set([...dates, ...data.fechas])];
        newSet.sort();
        setDates(newSet);
        setFestivosImportados(nuevasFechas.length);
        setShowAgradecimiento(true);
      }
    } catch {
      alert('No se pudieron obtener los días festivos.');
    } finally {
      setLoadingFestivos(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(dates);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
              Festivos de empresa
            </h3>
            <p className="text-sm text-slate-500 mt-1">{localidad}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45 h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <DateList
            label="Días Festivos"
            count={dates.length}
            dates={dates}
            newDate={newDate}
            onNewDateChange={setNewDate}
            onAdd={handleAdd}
            onRemove={handleRemove}
            emptyText="No se han añadido días festivos para esta localidad."
            headerExtra={slug ? (
              <button
                type="button"
                disabled={loadingFestivos}
                onClick={handleObtenerFestivos}
                className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loadingFestivos && <Loader2 className="h-3 w-3 animate-spin" />}
                {loadingFestivos ? 'Obteniendo...' : 'Obtener festivos con calendariosnacionales.com'}
              </button>
            ) : undefined}
          />

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all mt-6 shadow-xl shadow-primary/20"
          >
            Guardar Festivos
          </button>
        </form>

        {showAgradecimiento && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
                  Festivos añadidos
                </h3>
                <button onClick={() => setShowAgradecimiento(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Se han añadido <strong>{festivosImportados}</strong> días festivos.
                Revise que todos los días sean correctos antes de guardar.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Servicio ofrecido por{' '}
                <a
                  href="https://calendariosnacionales.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline underline-offset-2 inline-flex items-center gap-1"
                >
                  calendariosnacionales.com <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <button
                type="button"
                onClick={() => setShowAgradecimiento(false)}
                className="w-full bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
