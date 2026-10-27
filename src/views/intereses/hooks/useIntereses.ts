import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alumno, Empresa, InteresAlumnoEmpresa } from '../../../types/index.ts';
import { buscarAlumno, empresasQueCoinciden, type CoincidenciaEmpresa } from '../../../lib/interesesBusqueda.ts';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

export type Interesado = 'alumno' | 'empresa';

export interface MatchResult {
  iA: boolean;
  iE: boolean;
  fullyMatched: boolean;
}

export interface CVAttachment {
  filename: string;
  path: string;
  size: number;
}

export type SortField = 'nombre' | 'apellidos';
export type SortOrder = 'asc' | 'desc';
export type FilterMatchStatus = 'all' | 'con_match_y_relacion' | 'con_match_sin_relacion' | 'sin_match';

export interface EmailCVData {
  empresa: Empresa;
  alumnoIds: number[];
  attachments: CVAttachment[];
}

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useIntereses(cursoId: number, detalleAcademicoId?: number) {

  // ── Datos ──
  const [alumnos,   setAlumnos]   = useState<Alumno[]>([]);
  const [empresas,  setEmpresas]  = useState<Empresa[]>([]);
  const [intereses, setIntereses] = useState<InteresAlumnoEmpresa[]>([]);

  // ── UI ──
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [selectedAlumnoIds, setSelectedAlumnoIds] = useState<number[]>([]);
  const [searchAlumno,   setSearchAlumno]   = useState('');
  const [searchEmpresa,  setSearchEmpresa]  = useState('');
  const [sortBy, setSortBy] = useState<SortField>('apellidos');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterMinCVEnvios, setFilterMinCVEnvios] = useState<number>(0);
  const [filterEmpresasInteresadas, setFilterEmpresasInteresadas] = useState<'all' | 'con' | 'sin'>('all');
  const [filterMatchStatus, setFilterMatchStatus] = useState<FilterMatchStatus>('all');

  // ─────────────────────────────────────────
  //  FETCH
  // ─────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ cursoId: String(cursoId) });
    if (detalleAcademicoId) params.set('detalleAcademicoId', String(detalleAcademicoId));
    const intParams = new URLSearchParams();
    if (detalleAcademicoId) intParams.set('detalleAcademicoId', String(detalleAcademicoId));
    const [alRes, emRes, intRes] = await Promise.all([
      fetch(`/api/alumnos?${params}`),
      fetch('/api/empresas'),
      fetch(`/api/intereses?${intParams}`),
    ]);
    setAlumnos(await alRes.json());
    setEmpresas(await emRes.json());
    setIntereses(await intRes.json());
  }, [cursoId, detalleAcademicoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─────────────────────────────────────────
  //  SELECTION
  // ─────────────────────────────────────────

  const toggleSelection = (alumnoId: number) => {
    setSelectedAlumnoIds(prev => {
      const exists = prev.includes(alumnoId);
      if (exists) return prev.filter(id => id !== alumnoId);
      return [...prev, alumnoId];
    });
  };

  const clearSelection = () => setSelectedAlumnoIds([]);

  const selectOnly = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setSelectedAlumnoIds([]);
  };

  // ─────────────────────────────────────────
  //  HANDLERS
  // ─────────────────────────────────────────

  const toggleInteres = async (alumnoId: number, empresaId: number, interesado: Interesado) => {
    const exists = intereses.find(
      i => i.alumnoId === alumnoId && i.empresaId === empresaId && i.interesado === interesado
    );
    await fetch('/api/intereses', {
      method:  exists ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ alumnoId, empresaId, interesado }),
    });
    fetchData();
  };

  // ─────────────────────────────────────────
  //  DATOS DERIVADOS
  // ─────────────────────────────────────────

  const isMatched = (alId: number, emId: number): MatchResult => {
    const iA = intereses.some(i => i.alumnoId === alId && i.empresaId === emId && i.interesado === 'alumno');
    const iE = intereses.some(i => i.alumnoId === alId && i.empresaId === emId && i.interesado === 'empresa');
    return { iA, iE, fullyMatched: iA && iE };
  };

  const getAlumnoStats = (alumnoId: number) => ({
    envios:      intereses.filter(i => i.alumnoId === alumnoId && i.interesado === 'alumno').length,
    solicitudes: intereses.filter(i => i.alumnoId === alumnoId && i.interesado === 'empresa').length,
  });

  // La busqueda es por alumno o por empresa: con una empresa salen los alumnos
  // que le han enviado el CV, los que ha solicitado y los match. Ver
  // src/lib/interesesBusqueda.ts.
  const empresasBuscadas = useMemo(
    () => empresasQueCoinciden(empresas, searchAlumno),
    [empresas, searchAlumno]
  );

  // Por que empresas sale cada alumno (solo cuando no sale por su nombre).
  const coincidenciasPorAlumno = useMemo(() => {
    const mapa = new Map<number, CoincidenciaEmpresa[]>();
    for (const al of alumnos) {
      const r = buscarAlumno(al, searchAlumno, intereses, empresasBuscadas);
      if (r.coincide) mapa.set(al.id!, r.porEmpresas);
    }
    return mapa;
  }, [alumnos, searchAlumno, intereses, empresasBuscadas]);

  const filteredAlumnos = useMemo(() => {
    const filtered = alumnos.filter(al => {
      if (!coincidenciasPorAlumno.has(al.id!)) return false;

      const envios = intereses.filter(i => i.alumnoId === al.id && i.interesado === 'alumno').length;
      if (filterMinCVEnvios > 0 && envios < filterMinCVEnvios) return false;

      const solicitudes = intereses.filter(i => i.alumnoId === al.id && i.interesado === 'empresa').length;
      if (filterEmpresasInteresadas === 'con' && solicitudes === 0) return false;
      if (filterEmpresasInteresadas === 'sin' && solicitudes > 0) return false;

      const empresasConAlumno = new Set(intereses.filter(i => i.alumnoId === al.id && i.interesado === 'alumno').map(i => i.empresaId));
      const empresasConEmpresa = new Set(intereses.filter(i => i.alumnoId === al.id && i.interesado === 'empresa').map(i => i.empresaId));
      const tieneMatch = [...empresasConAlumno].some(eId => empresasConEmpresa.has(eId));
      const isAssigned = al.relacionId !== null;
      const matchStatus = !tieneMatch ? 'sin_match' : isAssigned ? 'con_match_y_relacion' : 'con_match_sin_relacion';
      if (filterMatchStatus !== 'all' && matchStatus !== filterMatchStatus) return false;

      return true;
    });
    filtered.sort((a, b) => {
      const aVal = sortBy === 'nombre' ? a.nombre : a.apellidos;
      const bVal = sortBy === 'nombre' ? b.nombre : b.apellidos;
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [alumnos, coincidenciasPorAlumno, filterMinCVEnvios, filterEmpresasInteresadas, filterMatchStatus, sortBy, sortOrder, intereses]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const filteredEmpresas = empresas.filter(em =>
    em.nombre.toLowerCase().includes(searchEmpresa.toLowerCase()) ||
    em.ciudad.toLowerCase().includes(searchEmpresa.toLowerCase())
  );

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Datos derivados
    filteredAlumnos, filteredEmpresas, empresas,
    coincidenciasPorAlumno,
    // UI
    selectedAlumno, setSelectedAlumno,
    selectedAlumnoIds, toggleSelection, clearSelection, selectOnly,
    searchAlumno, setSearchAlumno,
    searchEmpresa, setSearchEmpresa,
    sortBy, sortOrder, toggleSort,
    filterMinCVEnvios, setFilterMinCVEnvios,
    filterEmpresasInteresadas, setFilterEmpresasInteresadas,
    filterMatchStatus, setFilterMatchStatus,
    // Helpers
    toggleInteres, isMatched, getAlumnoStats, fetchData,
  };
}
