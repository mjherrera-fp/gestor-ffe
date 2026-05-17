import React, { useState, useRef, useEffect } from 'react';
import {
  PanelResumenRow,
  ConvenioEstadoLabels, RelacionEstadoLabels,
  PlanFormativoEstadoLabels, SeguimientoEstadoLabels, ValoracionEstadoLabels
} from '../../../types/index.ts';
import type { ColumnId, SortConfig, ColumnFilter, FilterState, ColumnMeta } from '../hooks/usePanel.ts';
import { COLUMNS } from '../hooks/usePanel.ts';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ChevronDown } from 'lucide-react';

interface Props {
  resumen: PanelResumenRow[];
  sort: SortConfig;
  toggleSort: (c: ColumnId) => void;
  filters: FilterState;
  setFilter: (c: ColumnId, f: ColumnFilter | undefined) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  formatDate: (iso: string | null | undefined) => string;
}

function getStatusLabels(col: ColumnMeta): Record<string, string> | null {
  if (col.id === 'estadoConvenio') return ConvenioEstadoLabels;
  if (col.id === 'estadoRelacion') return RelacionEstadoLabels;
  if (col.id === 'estadoPlanFormativo') return PlanFormativoEstadoLabels;
  if (col.id === 'estadoSeguimiento') return SeguimientoEstadoLabels;
  if (col.id === 'estadoValoracion') return ValoracionEstadoLabels;
  return null;
}

function SortIcon({ column, sort }: { column: ColumnId; sort: SortConfig }) {
  if (sort.column !== column) return <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-blue-600" />
    : <ArrowDown className="h-3 w-3 text-blue-600" />;
}

function FilterDropdown({
  column,
  filter,
  onFilter,
  onClose,
}: {
  column: ColumnMeta;
  filter: ColumnFilter | undefined;
  onFilter: (f: ColumnFilter | undefined) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<ColumnFilter>(filter || { type: column.type });

  useEffect(() => { setLocal(filter || { type: column.type }); }, [filter, column.id]);

  const apply = () => {
    const isEmpty = !local.text && !local.from && !local.to && (!local.selected || local.selected.length === 0);
    onFilter(isEmpty ? undefined : local);
    onClose();
  };

  const clear = () => {
    onFilter(undefined);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-50 p-4 space-y-3" onClick={e => e.stopPropagation()}>
      {column.type === 'text' && (
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Contiene</label>
          <input
            type="text"
            value={local.text || ''}
            onChange={e => setLocal({ ...local, text: e.target.value })}
            placeholder="Filtrar..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            autoFocus
          />
        </div>
      )}

      {column.type === 'date' && (
        <>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Desde</label>
            <input
              type="date"
              value={local.from || ''}
              onChange={e => setLocal({ ...local, from: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Hasta</label>
            <input
              type="date"
              value={local.to || ''}
              onChange={e => setLocal({ ...local, to: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </>
      )}

      {column.type === 'status' && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {(() => {
            const labels = getStatusLabels(column);
            if (!labels) return null;
            const allKeys = Object.keys(labels);
            const sel = local.selected || [];
            return allKeys.map(key => (
              <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sel.includes(key)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...sel, key]
                      : sel.filter(s => s !== key);
                    setLocal({ ...local, selected: next });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{labels[key]}</span>
              </label>
            ));
          })()}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button onClick={clear} className="flex-1 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
          Limpiar
        </button>
        <button onClick={apply} className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
          Aplicar
        </button>
      </div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  'PENDIENTE_ENVIAR': 'bg-amber-50 text-amber-700 border-amber-200',
  'PENDIENTE_FIRMA_EMPRESA': 'bg-orange-50 text-orange-700 border-orange-200',
  'PENDIENTE_ENVIAR_DIRECTOR': 'bg-blue-50 text-blue-700 border-blue-200',
  'PENDIENTE_FIRMA_DIRECTOR': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'COMPLETADO': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'PENDIENTE_ENVIAR_EMPRESA': 'bg-amber-50 text-amber-700 border-amber-200',
  'PENDIENTE_ENVIAR_ESTUDIANTE': 'bg-amber-50 text-amber-700 border-amber-200',
  'PENDIENTE_FIRMAR_ESTUDIANTE': 'bg-orange-50 text-orange-700 border-orange-200',
  'PENDIENTE_FIRMA_TUTOR': 'bg-purple-50 text-purple-700 border-purple-200',
  'PENDIENTE': 'bg-slate-100 text-slate-600 border-slate-200',
  'ENVIADO_A_EMPRESA': 'bg-blue-50 text-blue-700 border-blue-200',
  'RECIBIDO': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function StatusBadge({ estado, labels }: { estado: string; labels: Record<string, string> }) {
  const color = badgeColors[estado] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {labels[estado] || estado}
    </span>
  );
}

function CellContent({ row, col, formatDate }: { row: PanelResumenRow; col: ColumnMeta; formatDate: (iso: string | null | undefined) => string }) {
  const val = col.getValue(row);

  if (col.type === 'status') {
    const labels = getStatusLabels(col);
    if (!val || !labels) return <span className="text-slate-300">—</span>;
    return <StatusBadge estado={val} labels={labels} />;
  }

  if (col.id === 'fechaInicio' || col.id === 'fechaFin') {
    return <span className="text-slate-600 text-xs whitespace-nowrap">{formatDate(val)}</span>;
  }

  const display = val || '—';
  return <span className={`text-slate-600 whitespace-nowrap ${col.type === 'text' ? 'font-semibold text-slate-900' : ''} ${col.id === 'numConvenio' || col.id === 'numRelacion' ? 'text-xs font-mono' : ''}`}>{display}</span>;
}

export function EstadoResumenTable({ resumen, sort, toggleSort, filters, setFilter, clearFilters, activeFiltersCount, formatDate }: Props) {
  const [openFilter, setOpenFilter] = useState<ColumnId | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" style={{ maxHeight: '75vh' }}>
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <h3 className="text-lg font-bold text-slate-900">Resumen de alumnos</h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1 rounded-full transition-colors"
          >
            <X className="h-3 w-3" />
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="overflow-auto flex-1" ref={filterRef}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50">
              {COLUMNS.map(col => {
                const hasFilter = !!filters[col.id];
                return (
                  <th key={col.id} className="px-4 py-3 text-left whitespace-nowrap relative">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleSort(col.id)}
                        className="group flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors"
                      >
                        {col.label}
                        <SortIcon column={col.id} sort={sort} />
                      </button>
                      <button
                        onClick={() => setOpenFilter(openFilter === col.id ? null : col.id)}
                        className={`p-0.5 rounded transition-colors ${hasFilter ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {openFilter === col.id && (
                      <FilterDropdown
                        column={col}
                        filter={filters[col.id]}
                        onFilter={f => setFilter(col.id, f)}
                        onClose={() => setOpenFilter(null)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                  No hay alumnos que coincidan con los filtros
                </td>
              </tr>
            ) : (
              resumen.map(row => (
                <tr
                  key={row.alumnoId}
                  onClick={() => setSelectedRowId(selectedRowId === row.alumnoId ? null : row.alumnoId)}
                  className={`cursor-pointer transition-colors ${
                    selectedRowId === row.alumnoId
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  {COLUMNS.map(col => (
                    <td key={col.id} className="px-4 py-3">
                      <CellContent row={row} col={col} formatDate={formatDate} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 font-medium shrink-0">
        {resumen.length} alumno{resumen.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
