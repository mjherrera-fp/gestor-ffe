import React from 'react';
import { EstadoResumenTable } from './EstadoResumenTable.tsx';
import type { ColumnId, SortConfig, FilterState, ColumnFilter, ColumnMeta } from '../hooks/usePanel.ts';

interface Ctx {
  resumen: any[];
  resumenTotal: any[];
  columns: ColumnMeta[];
  sort: SortConfig;
  toggleSort: (c: ColumnId) => void;
  filters: FilterState;
  setFilter: (c: ColumnId, f: ColumnFilter | undefined) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  formatDate: (iso: string | null | undefined) => string;
}

export function ResumenTab({ ctx }: { ctx: Ctx }) {
  return (
    <EstadoResumenTable
      resumen={ctx.resumen}
      columns={ctx.columns}
      sort={ctx.sort}
      toggleSort={ctx.toggleSort}
      filters={ctx.filters}
      setFilter={ctx.setFilter}
      clearFilters={ctx.clearFilters}
      activeFiltersCount={ctx.activeFiltersCount}
      formatDate={ctx.formatDate}
    />
  );
}
