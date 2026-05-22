import React from 'react';
import { X } from 'lucide-react';
import { formatDate } from '../../lib/dateUtils.ts';

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

export function DateList({ label, count, dates, newDate, onNewDateChange, onAdd, onRemove, emptyText }: DateListProps) {
  return (
    <div className="pt-4 border-t border-slate-100">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
            {formatDate(date)}
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
