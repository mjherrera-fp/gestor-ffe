import { useState, useEffect } from 'react';
import { Alumno, Empresa, InteresAlumnoEmpresa } from '../../../types/index.ts';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

export type Interesado = 'alumno' | 'empresa';

export interface MatchResult {
  iA: boolean;
  iE: boolean;
  fullyMatched: boolean;
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
  const [searchAlumno,   setSearchAlumno]   = useState('');
  const [searchEmpresa,  setSearchEmpresa]  = useState('');

  // ─────────────────────────────────────────
  //  FETCH
  // ─────────────────────────────────────────

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, [cursoId, detalleAcademicoId]);

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

  const filteredAlumnos = alumnos.filter(al =>
    al.nombre.toLowerCase().includes(searchAlumno.toLowerCase()) ||
    al.apellidos.toLowerCase().includes(searchAlumno.toLowerCase())
  );

  const filteredEmpresas = empresas.filter(em =>
    em.nombre.toLowerCase().includes(searchEmpresa.toLowerCase()) ||
    em.ciudad.toLowerCase().includes(searchEmpresa.toLowerCase())
  );

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Datos derivados
    filteredAlumnos, filteredEmpresas,
    // UI
    selectedAlumno, setSelectedAlumno,
    searchAlumno, setSearchAlumno,
    searchEmpresa, setSearchEmpresa,
    // Helpers
    toggleInteres, isMatched, getAlumnoStats,
  };
}
