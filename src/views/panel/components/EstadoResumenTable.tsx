import React, {useEffect, useRef, useState} from 'react';
import {
  ComunicacionDATEstadoLabels,
  ConvenioEstadoLabels,
  PanelResumenRow,
  PlanFormativoEstadoLabels,
  RelacionEstadoLabels,
  SeguimientoEstadoLabels,
  ValoracionEstadoLabels
} from '../../../types/index.ts';
import type {ColumnFilter, ColumnId, ColumnMeta, FilterState, SortConfig} from '../hooks/usePanel.ts';
import {ArrowDown, ArrowUp, ArrowUpDown, Filter, X} from 'lucide-react';

interface Props {
  resumen: PanelResumenRow[];
  columns: ColumnMeta[];
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
  if (col.id === 'estadoDAT') return ComunicacionDATEstadoLabels;
  if (col.id === 'estadoPlanFormativo') return PlanFormativoEstadoLabels;
  if (col.id === 'estadoSeguimiento') return SeguimientoEstadoLabels;
  if (col.id === 'estadoValoracion') return ValoracionEstadoLabels;
  return null;
}

function SortIcon({ column, sort }: { column: ColumnId; sort: SortConfig }) {
  if (sort.column !== column) return <ArrowUpDown className="h-3 w-3 text-text-muted group-hover:text-text-main" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />;
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
    <div className="absolute top-full left-0 mt-1 w-64 bg-surface-card rounded-xl border border-border-base shadow-xl z-50 p-4 space-y-3" onClick={e => e.stopPropagation()}>
      {column.type === 'text' && (
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Contiene</label>
          <input
            type="text"
            value={local.text || ''}
            onChange={e => setLocal({ ...local, text: e.target.value })}
            placeholder="Filtrar..."
            className="w-full px-3 py-2 text-sm bg-surface-card border border-border-base rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            autoFocus
          />
        </div>
      )}

      {column.type === 'date' && (
        <>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Desde</label>
            <input
              type="date"
              value={local.from || ''}
              onChange={e => setLocal({ ...local, from: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-surface-card border border-border-base rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Hasta</label>
            <input
              type="date"
              value={local.to || ''}
              onChange={e => setLocal({ ...local, to: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-surface-card border border-border-base rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </>
      )}

      {column.type === 'number' && (
        <>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Mínimo</label>
            <input
              type="number"
              step="any"
              value={local.from || ''}
              onChange={e => setLocal({ ...local, from: e.target.value })}
              placeholder="Ej: 0"
              className="w-full px-3 py-2 text-sm bg-surface-card border border-border-base rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Máximo</label>
            <input
              type="number"
              step="any"
              value={local.to || ''}
              onChange={e => setLocal({ ...local, to: e.target.value })}
              placeholder="Ej: 500"
              className="w-full px-3 py-2 text-sm bg-surface-card border border-border-base rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
              <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={sel.includes(key)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...sel, key]
                      : sel.filter(s => s !== key);
                    setLocal({ ...local, selected: next });
                  }}
                  className="h-4 w-4 rounded border-border-base text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-main">{labels[key]}</span>
              </label>
            ));
          })()}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border-base">
        <button onClick={clear} className="flex-1 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-subtle rounded-lg transition-colors">
          Limpiar
        </button>
        <button onClick={apply} className="flex-1 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors">
          Aplicar
        </button>
      </div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  'PENDIENTE_ENVIAR': 'bg-warning-soft text-warning-strong border-warning/20',
  'PENDIENTE_FIRMA_EMPRESA': 'bg-warning-soft text-warning-strong border-warning/20',
  'PENDIENTE_ENVIAR_DIRECTOR': 'bg-primary-light text-primary border-primary-light',
  'PENDIENTE_FIRMA_DIRECTOR': 'bg-primary-light text-primary border-primary-light',
  'COMPLETADO': 'bg-success-soft text-success-strong border-success/20',
  'PENDIENTE_ENVIAR_EMPRESA': 'bg-warning-soft text-warning-strong border-warning/20',
  'PENDIENTE_ENVIAR_ESTUDIANTE': 'bg-warning-soft text-warning-strong border-warning/20',
  'PENDIENTE_FIRMAR_ESTUDIANTE': 'bg-warning-soft text-warning-strong border-warning/20',
  'PENDIENTE_FIRMA_TUTOR': 'bg-primary-light text-primary border-primary-light',
  'PENDIENTE': 'bg-surface-subtle text-text-muted border-border-base',
  'ENVIADO_A_EMPRESA': 'bg-primary-light text-primary border-primary-light',
  'RECIBIDO': 'bg-success-soft text-success-strong border-success/20',
};

function StatusBadge({ estado, labels }: { estado: string; labels: Record<string, string> }) {
  const color = badgeColors[estado] || 'bg-surface-subtle text-text-muted border-border-base';
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
    if (!val || !labels) return <span className="text-text-muted">—</span>;
    return <StatusBadge estado={val} labels={labels} />;
  }

  if (col.id === 'fechaInicio' || col.id === 'fechaFin' || col.id === 'fechaEnvioDAT') {
    return <span className="text-text-muted text-xs whitespace-nowrap">{formatDate(val)}</span>;
  }

  if (col.type === 'number') {
    return <span className="text-text-main font-semibold whitespace-nowrap text-right">{val === '' || val == null ? '—' : val}</span>;
  }

  const display = val || '—';
  return <span className={`text-text-muted whitespace-nowrap ${col.type === 'text' ? 'font-semibold text-text-main' : ''} ${col.id === 'numConvenio' || col.id === 'numRelacion' ? 'text-xs font-mono' : ''}`}>{display}</span>;
}

export function EstadoResumenTable({ resumen, columns, sort, toggleSort, filters, setFilter, clearFilters, activeFiltersCount, formatDate }: Props) {
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
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm flex flex-col" style={{ maxHeight: '75vh' }}>
      <div className="p-4 border-b border-border-base flex items-center gap-3 shrink-0">
        <h3 className="text-lg font-bold text-text-main">Resumen de alumnos</h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-[11px] font-bold text-danger hover:text-danger bg-danger-soft px-2.5 py-1 rounded-full transition-colors"
          >
            <X className="h-3 w-3" />
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="overflow-auto flex-1" ref={filterRef}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-surface-subtle">
              {columns.map(col => {
                const hasFilter = !!filters[col.id];
                return (
                  <th
                    key={col.id}
                    className={`px-4 py-3 text-left whitespace-nowrap ${
                      col.id === 'alumno'
                        ? 'sticky left-0 z-30 bg-surface-subtle border-r border-border-base min-w-40'
                        : 'relative'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleSort(col.id)}
                        className="group flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider hover:text-text-main transition-colors"
                      >
                        {col.label}
                        <SortIcon column={col.id} sort={sort} />
                      </button>
                      <button
                        onClick={() => setOpenFilter(openFilter === col.id ? null : col.id)}
                        className={`p-0.5 rounded transition-colors ${hasFilter ? 'text-primary bg-primary-light' : 'text-text-muted hover:text-text-main'}`}
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
          <tbody className="divide-y divide-border-base">
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-text-muted font-medium">
                  No hay alumnos que coincidan con los filtros
                </td>
              </tr>
            ) : (
              resumen.map(row => (
                <tr
                  key={row.alumnoId}
                  onClick={() => setSelectedRowId(selectedRowId === row.alumnoId ? null : row.alumnoId)}
                  className={`group cursor-pointer transition-colors ${
                    selectedRowId === row.alumnoId
                      ? 'bg-primary-light hover:bg-primary-light'
                      : 'hover:bg-surface-subtle/50'
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.id}
                      className={`px-4 py-3 ${
                        col.id === 'alumno'
                          ? `sticky left-0 z-10 border-r border-border-base transition-colors ${
                              selectedRowId === row.alumnoId
                                ? 'bg-primary-light hover:bg-primary-light'
                                : 'bg-surface-card group-hover:bg-surface-subtle/50'
                            }`
                          : ''
                      }`}
                    >
                      <CellContent row={row} col={col} formatDate={formatDate} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-border-base text-xs text-text-muted font-medium shrink-0">
        {resumen.length} alumno{resumen.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
