import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from './Modal.tsx';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

interface FestivosYearModalProps {
  open: boolean;
  localidad?: string;
  onConfirm: (year: number) => void;
  onClose: () => void;
}

export function FestivosYearModal({ open, localidad, onConfirm, onClose }: FestivosYearModalProps) {
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setYear(String(new Date().getFullYear()));
  }, [open]);

  const handleConfirm = () => {
    const parsed = Number(year);
    if (!Number.isInteger(parsed) || parsed < MIN_YEAR || parsed > MAX_YEAR) {
      setError(`Introduce un año entre ${MIN_YEAR} y ${MAX_YEAR}`);
      return;
    }
    setError(null);
    onConfirm(parsed);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm" zIndex={60} backdropClass="bg-slate-900/60 backdrop-blur-md" cardClass="rounded-4xl">
      <div className="flex items-center justify-between px-8 py-6 bg-slate-50 border-b border-slate-100 shrink-0">
        <div>
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
            Obtener festivos
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {localidad || 'calendariosnacionales.com'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-8 space-y-4">
        <div>
          <label className={labelClass}>Año de los festivos</label>
          <input
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            className={`${inputClass} ${error ? 'border-red-400 ring-2 ring-red-200' : ''}`}
            value={year}
            onChange={e => { setYear(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
            autoFocus
          />
          {error && <p className={errMsgCls}>{error}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Obtener festivos
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default FestivosYearModal;