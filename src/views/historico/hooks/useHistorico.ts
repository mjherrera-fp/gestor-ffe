import { useState, useEffect, useCallback } from 'react';

interface PaginacionResultado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FiltrosComunicaciones {
  destinatario: string;
  fechaDesde: string;
  fechaHasta: string;
  correo: string;
  tieneAdjuntos: string;
}

interface FiltrosOperaciones {
  tipoOperacion: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface FiltrosCambiosEstado {
  tipoProceso: string;
  fechaDesde: string;
  fechaHasta: string;
}

const FILTROS_INICIALES_COMUNICACIONES: FiltrosComunicaciones = {
  destinatario: '', fechaDesde: '', fechaHasta: '', correo: '', tieneAdjuntos: '',
};

const FILTROS_INICIALES_OPERACIONES: FiltrosOperaciones = {
  tipoOperacion: '', fechaDesde: '', fechaHasta: '',
};

const FILTROS_INICIALES_ESTADOS: FiltrosCambiosEstado = {
  tipoProceso: '', fechaDesde: '', fechaHasta: '',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useTab<T>(endpoint: string, filtrosIniciales: any) {
  const [filtros, setFiltros] = useState<any>(filtrosIniciales);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [resultado, setResultado] = useState<PaginacionResultado<T> | null>(null);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    for (const [k, v] of Object.entries(filtros) as [string, string][]) {
      if (v) params.set(k, v);
    }
    try {
      const res = await fetch(`/api/historico/${endpoint}?${params}`);
      const json = await res.json();
      setResultado(json);
    } catch (e) {
      console.error(`Error fetching ${endpoint}:`, e);
    }
  }, [filtros, page, limit, endpoint]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const actualizarFiltro = (clave: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [clave]: valor }));
    setPage(1);
  };

  const limpiarFiltros = () => {
    setFiltros(filtrosIniciales);
    setPage(1);
  };

  return {
    filtros, actualizarFiltro, limpiarFiltros,
    page, setPage, limit, setLimit,
    resultado, refetch: fetchData,
  };
}

export function useHistoricoComunicaciones() {
  return useTab<any>('comunicaciones', FILTROS_INICIALES_COMUNICACIONES);
}

export function useHistoricoConvenios() {
  return useTab<any>('convenios', FILTROS_INICIALES_OPERACIONES);
}

export function useHistoricoRelaciones() {
  return useTab<any>('relaciones', FILTROS_INICIALES_OPERACIONES);
}

export function useHistoricoEstados() {
  return useTab<any>('estados', FILTROS_INICIALES_ESTADOS);
}
