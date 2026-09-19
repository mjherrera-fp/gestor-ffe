import {useEffect, useMemo, useState} from 'react';
import {
  ComunicacionDATEstadoLabels,
  ConvenioEstadoLabels,
  PanelResumenRow,
  PlanFormativoEstadoLabels,
  RelacionEstadoLabels,
  SeguimientoEstadoLabels,
  SeguridadSocialData,
  ValoracionEstadoLabels
} from '../../../types/index.ts';
import {formatDate} from '../../../lib/dateUtils.ts';

export type ColumnId =
  | 'alumno' | 'fechaInicio' | 'fechaFin' | 'empresa'
  | 'numConvenio' | 'numRelacion'
  | 'estadoConvenio' | 'estadoRelacion' | 'estadoPlanFormativo'
    | 'estadoSeguimiento' | 'estadoValoracion'
    | 'fechaEnvioDAT' | 'estadoDAT';

export type SortDir = 'asc' | 'desc';

export interface SortConfig {
  column: ColumnId;
  dir: SortDir;
}

export type FilterType = 'text' | 'date' | 'status';

export interface ColumnFilter {
  type: FilterType;
  text?: string;
  from?: string;
  to?: string;
  selected?: string[];
}

export type FilterState = Partial<Record<ColumnId, ColumnFilter>>;

export interface ColumnMeta {
  id: ColumnId;
  label: string;
  type: FilterType;
  statusLabels?: Record<string, string>;
  getValue: (r: PanelResumenRow) => string | null | undefined;
}

export const COLUMNS: ColumnMeta[] = [
  { id: 'alumno', label: 'Alumno', type: 'text', getValue: r => `${r.apellidos}, ${r.nombre}` },
  { id: 'fechaInicio', label: 'Inicio', type: 'date', getValue: r => r.fechaInicio },
  { id: 'fechaFin', label: 'Fin', type: 'date', getValue: r => r.fechaFin },
  { id: 'empresa', label: 'Empresa', type: 'text', getValue: r => r.empresaNombre },
  { id: 'numConvenio', label: 'Nº Convenio', type: 'text', getValue: r => r.numConvenio },
  { id: 'numRelacion', label: 'Nº Relación', type: 'text', getValue: r => r.numRelacion },
  {id: 'fechaEnvioDAT', label: 'Fecha Envío DAT', type: 'date', getValue: r => r.fechaEnvioDAT},
  { id: 'estadoConvenio', label: 'Estado Convenio', type: 'status', statusLabels: ConvenioEstadoLabels, getValue: r => r.estadoConvenio },
  { id: 'estadoRelacion', label: 'Estado Relación', type: 'status', statusLabels: RelacionEstadoLabels, getValue: r => r.estadoRelacion },
  {
    id: 'estadoDAT',
    label: 'Estado DAT',
    type: 'status',
    statusLabels: ComunicacionDATEstadoLabels,
    getValue: r => r.estadoDAT
  },
  { id: 'estadoPlanFormativo', label: 'Plan Formativo', type: 'status', statusLabels: PlanFormativoEstadoLabels, getValue: r => r.estadoPlanFormativo },
  { id: 'estadoSeguimiento', label: 'Seguimiento', type: 'status', statusLabels: SeguimientoEstadoLabels, getValue: r => r.estadoSeguimiento },
  { id: 'estadoValoracion', label: 'Valoración', type: 'status', statusLabels: ValoracionEstadoLabels, getValue: r => r.estadoValoracion },
];

function compareValues(a: string | null | undefined, b: string | null | undefined, col: ColumnId, dir: SortDir): number {
  const va = a ?? '';
  const vb = b ?? '';
  let cmp = 0;
  if (col === 'fechaInicio' || col === 'fechaFin' || col === 'fechaEnvioDAT') {
    cmp = (a || '').localeCompare(b || '');
  } else {
    cmp = va.localeCompare(vb, 'es', { sensitivity: 'base' });
  }
  return dir === 'asc' ? cmp : -cmp;
}

function applyFilters(rows: PanelResumenRow[], filters: FilterState, columns: ColumnMeta[]): PanelResumenRow[] {
  return rows.filter(r => {
    for (const col of columns) {
      const f = filters[col.id];
      if (!f) continue;
      const val = col.getValue(r);
      const strVal = (val ?? '').toLowerCase();

      if (f.type === 'text' && f.text) {
        if (!strVal.includes(f.text.toLowerCase())) return false;
      }

      if (f.type === 'date') {
        const dateVal = val ? new Date(val) : null;
        if (f.from && dateVal && dateVal < new Date(f.from)) return false;
        if (f.to && dateVal) {
          const toDate = new Date(f.to);
          toDate.setHours(23, 59, 59, 999);
          if (dateVal > toDate) return false;
        }
      }

      if (f.type === 'status' && f.selected && f.selected.length > 0) {
        if (!val || !f.selected.includes(val)) return false;
      }
    }
    return true;
  });
}

export function usePanel(cursoId: number, detalleAcademicoId?: number, datNecesario = true) {
  const [resumen, setResumen] = useState<PanelResumenRow[]>([]);
  const [ssData, setSsData] = useState<SeguridadSocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<SortConfig>({ column: 'alumno', dir: 'asc' });
  const [filters, setFilters] = useState<FilterState>({});

  const columns = useMemo(() => {
    if (datNecesario) return COLUMNS;
    return COLUMNS.filter(c => c.id !== 'fechaEnvioDAT' && c.id !== 'estadoDAT');
  }, [datNecesario]);

  const fetchResumen = async () => {
    const params = new URLSearchParams({ cursoId: String(cursoId) });
    if (detalleAcademicoId) params.set('detalleAcademicoId', String(detalleAcademicoId));
    const res = await fetch(`/api/panel/resumen?${params}`);
    if (!res.ok) throw new Error('Error al obtener datos del panel');
    return await res.json() as PanelResumenRow[];
  };

  const fetchSeguridadSocial = async () => {
    const params = new URLSearchParams({ cursoId: String(cursoId) });
    if (detalleAcademicoId) params.set('detalleAcademicoId', String(detalleAcademicoId));
    const res = await fetch(`/api/panel/seguridad-social?${params}`);
    if (!res.ok) throw new Error('Error al obtener datos de seguridad social');
    return await res.json() as SeguridadSocialData;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchResumen();
      setResumen(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(false);
      return;
    }
    try {
      const ss = await fetchSeguridadSocial();
      setSsData(ss);
    } catch {
      // seguridad social no bloquea el panel
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [cursoId, detalleAcademicoId]);

  const toggleSort = (column: ColumnId) => {
    setSort(prev => ({
      column,
      dir: prev.column === column && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const setFilter = (column: ColumnId, filter: ColumnFilter | undefined) => {
    setFilters(prev => {
      const next = { ...prev };
      if (filter) next[column] = filter;
      else delete next[column];
      return next;
    });
  };

  const clearFilters = () => setFilters({});

  const processedResumen = useMemo(() => {
    let rows = applyFilters(resumen, filters, columns);
    const col = columns.find(c => c.id === sort.column);
    if (col) {
      rows = [...rows].sort((a, b) => compareValues(col.getValue(a), col.getValue(b), sort.column, sort.dir));
    }
    return rows;
  }, [resumen, filters, sort, columns]);

  const empresasConAlumnos = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of resumen) {
      if (r.empresaNombre && r.relacionId) {
        map.set(r.empresaNombre, (map.get(r.empresaNombre) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([nombre, alumnos]) => ({ nombre, alumnos }))
      .sort((a, b) => b.alumnos - a.alumnos)
      .slice(0, 15);
  }, [resumen]);

  const statsFFE = useMemo(() => {
    const conFFE = resumen.filter(r => r.relacionId !== null).length;
    const sinFFE = resumen.filter(r => r.relacionId === null).length;
    return { conFFE, sinFFE };
  }, [resumen]);

  const distribucionConvenio = useMemo(() => {
    const map = new Map<string, number>();
    let sinFFE = 0;
    for (const r of resumen) {
      if (r.estadoConvenio) {
        const label = ConvenioEstadoLabels[r.estadoConvenio];
        map.set(label, (map.get(label) || 0) + 1);
      } else {
        sinFFE++;
      }
    }
    const result = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    if (sinFFE > 0) result.push({ name: 'Sin FFE', value: sinFFE });
    return result;
  }, [resumen]);

  const distribucionRelacion = useMemo(() => {
    const map = new Map<string, number>();
    let sinFFE = 0;
    for (const r of resumen) {
      if (r.estadoRelacion) {
        const label = RelacionEstadoLabels[r.estadoRelacion];
        map.set(label, (map.get(label) || 0) + 1);
      } else {
        sinFFE++;
      }
    }
    const result = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    if (sinFFE > 0) result.push({ name: 'Sin FFE', value: sinFFE });
    return result;
  }, [resumen]);

  const distribucionPlanFormativo = useMemo(() => {
    const map = new Map<string, number>();
    let sinFFE = 0;
    for (const r of resumen) {
      if (r.relacionId) {
        const label = PlanFormativoEstadoLabels[r.estadoPlanFormativo];
        map.set(label, (map.get(label) || 0) + 1);
      } else {
        sinFFE++;
      }
    }
    const result = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    if (sinFFE > 0) result.push({ name: 'Sin FFE', value: sinFFE });
    return result;
  }, [resumen]);

  const distribucionSeguimiento = useMemo(() => {
    const recibido = resumen.filter(r => r.relacionId && r.estadoSeguimiento === 'RECIBIDO').length;
    const noRecibido = resumen.filter(r => r.relacionId && r.estadoSeguimiento !== 'RECIBIDO').length;
    const sinFFE = resumen.filter(r => !r.relacionId).length;
    const result = [
      { name: 'Recibido', value: recibido },
      { name: 'No recibido', value: noRecibido },
    ];
    if (sinFFE > 0) result.push({ name: 'Sin FFE', value: sinFFE });
    return result;
  }, [resumen]);

  const distribucionValoracion = useMemo(() => {
    const recibido = resumen.filter(r => r.relacionId && r.estadoValoracion === 'RECIBIDO').length;
    const noRecibido = resumen.filter(r => r.relacionId && r.estadoValoracion !== 'RECIBIDO').length;
    const sinFFE = resumen.filter(r => !r.relacionId).length;
    const result = [
      { name: 'Recibido', value: recibido },
      { name: 'No recibido', value: noRecibido },
    ];
    if (sinFFE > 0) result.push({ name: 'Sin FFE', value: sinFFE });
    return result;
  }, [resumen]);

  const activeFiltersCount = Object.keys(filters).length;

  return {
    loading,
    error,
    resumen: processedResumen,
    resumenTotal: resumen,
    columns,
    sort,
    toggleSort,
    filters,
    setFilter,
    clearFilters,
    activeFiltersCount,
    empresasConAlumnos,
    statsFFE,
    distribucionConvenio,
    distribucionRelacion,
    distribucionPlanFormativo,
    distribucionSeguimiento,
    distribucionValoracion,
    ssData,
    refresh: fetchData,
    formatDate,
  };
}
