import React from 'react';
import { X, Plus } from 'lucide-react';
import { Curso } from '../../../types/index.ts';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

// ─────────────────────────────────────────
//  SUBCOMPONENTE: Lista de fechas (festivos / tutorías)
// ─────────────────────────────────────────

interface DateListProps {
  label: string;
  count: number;
  dates: string[];
  newDate: string;
  onNewDateChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (d: string) => void;
  emptyText: string;
}

function DateList({ label, count, dates, newDate, onNewDateChange, onAdd, onRemove, emptyText }: DateListProps) {
  return (
    <div className="pt-4 border-t border-slate-100">
      <label className={labelCls}>
        {label}
        <span className="text-[10px] font-bold text-slate-400 tracking-widest ml-1">({count} añadidos)</span>
      </label>
      <div className="flex gap-2 mb-4 mt-2">
        <input
          type="date"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          value={newDate}
          onChange={e => onNewDateChange(e.target.value)}
        />
        <button
          type="button"
          onClick={onAdd}
          className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all"
        >
          Añadir
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {dates.map(date => (
          <div
            key={date}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-3 pr-1 py-1 rounded-full text-xs font-medium text-slate-600"
          >
            {new Date(date).toLocaleDateString()}
            <button
              type="button"
              onClick={() => onRemove(date)}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {dates.length === 0 && (
          <p className="text-xs text-slate-400 italic py-2">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  MODAL PRINCIPAL
// ─────────────────────────────────────────

interface CursoFormModalProps {
  editing: Curso | null;
  formData: Partial<Curso>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Curso>>>;
  newFestivo: string;
  setNewFestivo: (v: string) => void;
  onAddFestivo: () => void;
  onRemoveFestivo: (d: string) => void;
  newTutoria: string;
  setNewTutoria: (v: string) => void;
  onAddTutoria: () => void;
  onRemoveTutoria: (d: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CursoFormModal({
  editing, formData, setFormData,
  newFestivo, setNewFestivo, onAddFestivo, onRemoveFestivo,
  newTutoria, setNewTutoria, onAddTutoria, onRemoveTutoria,
  onSubmit, onClose,
}: CursoFormModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="text-xl font-bold text-slate-800">
            {editing ? 'Editar Curso' : 'Crear Nuevo Curso'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6 overflow-y-auto">

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <input
              required
              className={inputCls}
              value={formData.descripcion || ''}
              onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Ej: Curso 2025-2026"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input
                required
                type="date"
                className={inputCls}
                value={formData.fechaInicio || ''}
                onChange={e => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input
                required
                type="date"
                className={inputCls}
                value={formData.fechaFin || ''}
                onChange={e => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
              />
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
          />

          {/* Tutorías */}
          <DateList
            label="Días de Tutorías"
            count={formData.tutorias?.length || 0}
            dates={formData.tutorias || []}
            newDate={newTutoria}
            onNewDateChange={setNewTutoria}
            onAdd={onAddTutoria}
            onRemove={onRemoveTutoria}
            emptyText="No se han añadido días de tutoría todavía."
          />

          {/* Botones */}
          <div className="flex gap-3 pt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              {editing ? 'Actualizar' : 'Crear Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
