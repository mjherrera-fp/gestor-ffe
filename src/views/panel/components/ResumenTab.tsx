import React from 'react';
import { EstadoResumenTable } from './EstadoResumenTable.tsx';
import type { ColumnId, SortConfig, FilterState, ColumnFilter } from '../hooks/usePanel.ts';

interface Ctx {
  resumen: any[];
  resumenTotal: any[];
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
