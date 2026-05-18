import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { StarRating } from '../../../components/StarRating.tsx';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1';

interface RelacionEstadisticaFormModalProps {
  empresaNombre: string;
  curso: string;
  numAlumnos: number;
  contratados: number;
  valoracion: number;
  onContratadosChange: (val: number) => void;
  onValoracionChange: (val: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RelacionEstadisticaFormModal({
  empresaNombre, curso, numAlumnos,
  contratados, valoracion,
  onContratadosChange, onValoracionChange,
  onSubmit, onClose,
}: RelacionEstadisticaFormModalProps) {

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Estadísticas de la Empresa
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-bold text-text-main">{empresaNombre}</p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{curso}</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Alumnos en esta relación</div>
            <div className="text-lg font-black text-text-main">{numAlumnos}</div>
          </div>

          <div>
            <label className={labelCls}>Nº Contratados tras FFE</label>
            <input
              required
              type="number"
              min="0"
              max={numAlumnos}
              className={inputCls}
              value={contratados ?? ''}
              onChange={e => onContratadosChange(Number(e.target.value))}
            />
            {numAlumnos > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-muted">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span>
                  Contratación:{' '}
                  <span className="font-bold text-primary">
                    {Math.round((contratados / numAlumnos) * 1000) / 10}%
                  </span>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Valoración del curso</label>
            <StarRating
              value={valoracion}
              onChange={onValoracionChange}
              size="lg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
