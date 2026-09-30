import React, { useState, useEffect, useRef } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { CentroEducativo } from '../../../types/index.ts';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Title } from '../../../components/Title.tsx';
import localidades from '../../../data/geo/localidades-madrid.json';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required, email, compose } from '../../../utils/validation.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
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
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/**
 * Alta y edicion de un centro educativo.
 *
 * Los dias festivos no se editan aqui: se abren desde el boton de calendario
 * de la tarjeta del centro, en `CentrosEducativos`. Aqui solo viajan en el
 * `PUT`, sin tocarlos, para que guardar el formulario no los pierda.
 */
export function CentroFormModal({
  open, editing, formData, onChange, onSubmit, onClose,
}: CentroFormModalProps) {
  const [ciudadFocused, setCiudadFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ciudadRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = (field: keyof CentroEducativo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  useEffect(() => {
    return () => { if (blurTimerRef.current) clearTimeout(blurTimerRef.current); };
  }, []);

  const searchTerm = (formData.ciudad || '').toLowerCase();
  const filtered = searchTerm.length > 0
    ? localidades.municipalities.filter(m => m.name.toLowerCase().includes(searchTerm)).slice(0, 20)
    : [];

  const showDropdown = ciudadFocused && filtered.length > 0;

  useEffect(() => { setHighlightedIndex(-1); }, [filtered.length]);

  const selectMunicipio = (name: string) => {
    onChange({ ...formData, ciudad: name });
    setCiudadFocused(false);
  };

  const handleCiudadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...formData, ciudad: e.target.value });
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
      selectMunicipio(m.name);
      } else if (e.key === 'Escape') {
        // Se consume la tecla: sin esto Modal cerraria el formulario entero.
        e.stopPropagation();
        setCiudadFocused(false);
      }
  };

  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="lg" backdropClass="bg-overlay backdrop-blur-md" cardClass="rounded-4xl">

        {/* Header */}
        <div className="px-8 py-6 bg-surface-subtle border-b border-border-base flex items-center justify-between shrink-0">
          <h3 className="font-black text-text-main uppercase tracking-widest text-xs">
            {editing ? 'Editar Centro' : 'Añadir Nuevo Centro'}
          </h3>
          <Title text="Cerrar">
            <button onClick={onClose} className="text-text-muted hover:text-text-main">
              <Plus className="rotate-45 h-6 w-6" />
            </button>
          </Title>
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
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface-card border border-border-base rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filtered.map((m, i) => (
                    <button
                      key={m.slug}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectMunicipio(m.name); }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-border-base last:border-0 ${
                        i === highlightedIndex ? 'bg-primary-light text-primary' : 'text-text-main hover:bg-surface-hover'
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5 text-text-muted shrink-0" />
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

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all mt-6 shadow-xl shadow-primary/20"
          >
            Guardar Centro Educativo
          </button>
        </form>
      </Modal>
    );
}
