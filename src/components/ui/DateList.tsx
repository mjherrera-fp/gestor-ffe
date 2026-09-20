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
  headerExtra?: React.ReactNode;
}

export function DateList({ label, count, dates, newDate, onNewDateChange, onAdd, onRemove, emptyText, headerExtra }: DateListProps) {
  return (
    <div className="pt-4 border-t border-border-base">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          {label}
          <span className="text-[10px] font-bold text-text-muted tracking-widest ml-1">({count} añadidos)</span>
        </label>
        {headerExtra}
      </div>
      <div className="flex gap-2 mb-4 mt-2">
        <input
          type="date"
          className="flex-1 bg-surface-subtle border border-border-base rounded-lg px-4 py-2 text-sm text-text-main outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          value={newDate}
          onChange={e => onNewDateChange(e.target.value)}
        />
        <button
          type="button"
          onClick={onAdd}
          className="bg-surface-hover text-text-main px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-surface-strong transition-all"
        >
          Añadir
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {dates.map(date => (
          <div
            key={date}
            className="flex items-center gap-2 bg-surface-subtle border border-border-base pl-3 pr-1 py-1 rounded-full text-xs font-medium text-text-main"
          >
            {formatDate(date)}
            <button
              type="button"
              onClick={() => onRemove(date)}
              className="p-1 hover:bg-surface-strong rounded-full text-text-muted hover:text-text-main transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {dates.length === 0 && (
          <p className="text-xs text-text-muted italic py-2">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
