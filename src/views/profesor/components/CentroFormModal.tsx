import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, MapPin, ExternalLink, X } from 'lucide-react';
import { CentroEducativo } from '../../../types/index.ts';
import { DateList } from '../../../components/ui/DateList.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import localidades from '../../../data/geo/localidades-madrid.json';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required, email, compose } from '../../../utils/validation.ts';

const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  nombre: [required('Nombre del Centro')],
  ciudad: [required('Ciudad')],
  telefono: [required('Teléfono')],
  email: [compose(required('Email'), email('Email'))],
};

interface CentroFormModalProps {
  open: boolean;
  editing: CentroEducativo | null;
  formData: Partial<CentroEducativo>;
  onChange: (data: Partial<CentroEducativo>) => void;
  newFestivo: string;
  setNewFestivo: (v: string) => void;
  onAddFestivo: () => void;
  onRemoveFestivo: (d: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CentroFormModal({
  open, editing, formData, onChange,
  newFestivo, setNewFestivo, onAddFestivo, onRemoveFestivo,
  onSubmit, onClose,
}: CentroFormModalProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loadingFestivos, setLoadingFestivos] = useState(false);
  const [ciudadFocused, setCiudadFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showAgradecimiento, setShowAgradecimiento] = useState(false);
  const [festivosImportados, setFestivosImportados] = useState(0);
  const ciudadRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = (field: keyof CentroEducativo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  useEffect(() => {
    if (formData.ciudad) {
      const match = localidades.municipalities.find(m => m.name === formData.ciudad);
      setSelectedSlug(match ? match.slug : null);
    }
  }, []);

  useEffect(() => {
    return () => { if (blurTimerRef.current) clearTimeout(blurTimerRef.current); };
  }, []);

  const searchTerm = (formData.ciudad || '').toLowerCase();
  const filtered = searchTerm.length > 0
    ? localidades.municipalities.filter(m => m.name.toLowerCase().includes(searchTerm)).slice(0, 20)
    : [];

  const showDropdown = ciudadFocused && filtered.length > 0;

  useEffect(() => { setHighlightedIndex(-1); }, [filtered.length]);

  const selectMunicipio = (name: string, slug: string) => {
    onChange({ ...formData, ciudad: name });
    setSelectedSlug(slug);
    setCiudadFocused(false);
  };

  const handleCiudadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange({ ...formData, ciudad: value });
    const match = localidades.municipalities.find(m => m.name === value);
    setSelectedSlug(match ? match.slug : null);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const m = filtered[highlightedIndex];
      selectMunicipio(m.name, m.slug);
    } else if (e.key === 'Escape') {
      setCiudadFocused(false);
    }
  };

  const handleObtenerFestivos = async () => {
    if (!selectedSlug) return;
    setLoadingFestivos(true);
    try {
      const res = await fetch(`/api/festivos/obtener?slug=${selectedSlug}`);
      const data = await res.json();
      if (data.fechas?.length) {
        const existing = formData.festivos || [];
        const newSet = [...new Set([...existing, ...data.fechas])];
        newSet.sort();
        onChange({ ...formData, festivos: newSet });
        setFestivosImportados(data.fechas.length);
        setShowAgradecimiento(true);
      }
    } catch {
      alert('No se pudieron obtener los días festivos.');
    } finally {
      setLoadingFestivos(false);
    }
  };

  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="lg" backdropClass="bg-slate-900/60 backdrop-blur-md" cardClass="rounded-4xl">

        {/* Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
            {editing ? 'Editar Centro' : 'Añadir Nuevo Centro'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45 h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)] flex-1">
          <div>
            <label className={labelClass}>Nombre del Centro<span className="text-red-500 ml-0.5">*</span></label>
            <input
              className={`${inputClass} ${errors.nombre ? inputErrCls : ''}`}
              value={formData.nombre || ''}
              onChange={update('nombre')}
              onBlur={() => onBlur('nombre', formData.nombre)}
            />
            {errors.nombre && <p className={errMsgCls}>{errors.nombre}</p>}
          </div>
          <div>
            <label className={labelClass}>Código de Centro</label>
            <input
              className={inputClass}
              value={formData.codigoCentro || ''}
              onChange={update('codigoCentro')}
              placeholder="Ej: 12345678"
            />
          </div>
          <div ref={ciudadRef}>
            <label className={labelClass}>Ciudad<span className="text-red-500 ml-0.5">*</span></label>
            <div className="relative">
              <input
                className={`${inputClass} ${errors.ciudad ? inputErrCls : ''}`}
                value={formData.ciudad || ''}
                onChange={handleCiudadChange}
                onFocus={() => setCiudadFocused(true)}
                onBlur={() => {
                  blurTimerRef.current = setTimeout(() => setCiudadFocused(false), 200);
                }}
                onKeyDown={handleKeyDown}
              />
              {showDropdown && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filtered.map((m, i) => (
                    <button
                      key={m.slug}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectMunicipio(m.name, m.slug); }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-50 last:border-0 ${
                        i === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Teléfono<span className="text-red-500 ml-0.5">*</span></label>
              <input
                className={`${inputClass} ${errors.telefono ? inputErrCls : ''}`}
                value={formData.telefono || ''}
                onChange={update('telefono')}
                onBlur={() => onBlur('telefono', formData.telefono)}
              />
              {errors.telefono && <p className={errMsgCls}>{errors.telefono}</p>}
            </div>
            <div>
              <label className={labelClass}>Email<span className="text-red-500 ml-0.5">*</span></label>
              <input
                className={`${inputClass} ${errors.email ? inputErrCls : ''}`}
                value={formData.email || ''}
                onChange={update('email')}
                onBlur={() => onBlur('email', formData.email)}
              />
              {errors.email && <p className={errMsgCls}>{errors.email}</p>}
            </div>
          </div>

          {/* Festivos */}
          <DateList
            label="Días Festivos"
            count={formData.festivos?.length || 0}
            dates={formData.festivos || []}
            newDate={newFestivo}
            onNewDateChange={setNewFestivo}
            onAdd={onAddFestivo}
            onRemove={onRemoveFestivo}
            emptyText="No se han añadido días festivos todavía."
            headerExtra={selectedSlug ? (
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
            Guardar Centro Educativo
          </button>
        </form>

        {/* Agradecimiento API */}
        <Modal open={showAgradecimiento} onClose={() => setShowAgradecimiento(false)} maxWidth="sm" zIndex={60} backdropClass="bg-slate-900/60 backdrop-blur-md" cardClass="rounded-4xl p-8">
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
            </Modal>
      </Modal>
  );
}
