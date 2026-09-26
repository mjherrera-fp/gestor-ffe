import { safeParse } from './json.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  DIAS COTIZADOS POR ALUMNO Y MES
//
//  Extraccion literal del bloque que estaba dentro de
//  PanelDAO.seguridadSocial (src/lib/dao.ts), para que sea testeable sin
//  levantar la base de datos.
//
//  Cambio de comportamiento: ninguno. La version anterior construia un Set
//  `festivosSkip` con los festivos de centro y de empresa y calculaba un
//  `esFestivo` que nunca se usaba; la decision real la tomaban `skipCentro` y
//  `skipEmpresa`, que si respetan los interruptores. Ese codigo muerto se ha
//  eliminado. La equivalencia esta demostrada por
//  tests/seguridad-social.diferencial.test.ts, que compara esta funcion
//  contra una copia literal de la version anterior.
// ─────────────────────────────────────────────────────────────────────────────

export interface RelacionParaCotizacion {
  id: number;
  horario: unknown;
  alumnoId: number;
  aluInicio: string | null;
  aluFin: string | null;
}

export interface ParamsContarDiasCotizacion {
  relaciones: RelacionParaCotizacion[];
  /** relacionId -> centroId */
  relCentroMap: Record<number, number>;
  /** relacionId -> ciudad de la empresa */
  relEmpresaCiudadMap: Record<number, string>;
  /** centroId -> festivos */
  centroFestivosMap: Record<number, Set<string>>;
  /** ciudad -> festivos */
  empresaFestivosByCiudad: Record<string, Set<string>>;
  usarFestivos: boolean;
  usarFestivosEmpresa: boolean;
}

export interface ResultadoContarDiasCotizacion {
  /** Claves de mes tipo 2026-01, desde el mes de inicio al de fin */
  meses: string[];
  /** clave `${alumnoId}_${mesKey}` -> dias cotizados */
  datos: Record<string, number>;
}

const toLocalDate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

const DIA_A_NUMERO: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0,
};

export const contarDiasCotizacion = (
  params: ParamsContarDiasCotizacion
): ResultadoContarDiasCotizacion => {
  const {
    relaciones, relCentroMap, relEmpresaCiudadMap, centroFestivosMap,
    empresaFestivosByCiudad, usarFestivos, usarFestivosEmpresa,
  } = params;

  // Rango global: del inicio mas temprano al fin mas tardio.
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  for (const rel of relaciones) {
    const di = toLocalDate(rel.aluInicio);
    const df = toLocalDate(rel.aluFin);
    if (di && (!minDate || di < minDate)) minDate = di;
    if (df && (!maxDate || df > maxDate)) maxDate = df;
  }

  if (!minDate || !maxDate) return { meses: [], datos: {} };

  const meses: string[] = [];
  const iter = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (iter <= maxDate) {
    meses.push(toLocalDateStr(iter));
    iter.setMonth(iter.getMonth() + 1);
  }

  const datos: Record<string, number> = {};

  for (const rel of relaciones) {
    const horario = safeParse(rel.horario, {});
    const diasSemana: string[] = [];
    for (const dia of DIAS_SEMANA) {
      if (horario[dia]?.horas > 0) diasSemana.push(dia);
    }
    // Sin dias con horas no hay nada que cotizar para esta relacion.
    if (diasSemana.length === 0) continue;

    const diasSet = new Set(diasSemana.map(d => DIA_A_NUMERO[d]));

    const centroId = relCentroMap[rel.id];
    const empCiudad = relEmpresaCiudadMap[rel.id];
    const empFestivosSet = empCiudad ? empresaFestivosByCiudad[empCiudad] : undefined;

    const aluInicio = toLocalDate(rel.aluInicio) || minDate;
    const aluFin = toLocalDate(rel.aluFin) || maxDate;

    for (const mesKey of meses) {
      const [year, month] = mesKey.split('-').map(Number);
      const mesInicio = new Date(year, month - 1, 1);
      const mesFin = new Date(year, month, 0);

      // Recorte del mes al periodo real del alumno.
      const inicio = mesInicio < aluInicio ? aluInicio : mesInicio;
      const fin = mesFin > aluFin ? aluFin : mesFin;

      let dias = 0;
      const d = new Date(inicio);
      while (d <= fin) {
        const fecha = toLocalDateStr(d);
        const skipCentro = usarFestivos && centroFestivosMap[centroId]?.has(fecha);
        const skipEmpresa = usarFestivosEmpresa && empFestivosSet?.has(fecha);
        if (diasSet.has(d.getDay()) && !skipCentro && !skipEmpresa) dias++;
        d.setDate(d.getDate() + 1);
      }

      const key = `${rel.alumnoId}_${mesKey}`;
      datos[key] = (datos[key] || 0) + dias;
    }
  }

  return { meses, datos };
};
