import type { HorarioSemanal } from '../types/index.ts';
import {
  calculateEndDateForHours,
  calculateStartDateFromEnd,
  horarioTieneHoras,
} from '../views/relaciones/utils/relacionesUtils.ts';

// ─────────────────────────────────────────
//  RESOLVEDOR COMPARTIDO DE FECHAS
//
//  calculateEndDateForHours y calculateStartDateFromEnd piden siete
//  argumentos, cuatro de los cuales son siempre los mismos: los festivos del
//  centro, el de usar los festivos del centro, los festivos de la empresa y el
//  de usar los de la empresa. Esa cadena de siete argumentos estaba escrita a
//  mano en cinco sitios de useRelaciones y hadria que repetirla otra vez en
//  useAlumnos para recalcular la fecha fin.
//
//  Este modulo ata esa configuracion a un objeto y devuelve dos funciones.
//  Cada consumidor pide el contexto una vez y llama sin acordarse de la
//  combinacion de toggles.
//
//  La logica de los toggles NO cambia: sigue siendo la de
// calculateEndDateForHours, que es la que tienen los tests de caracterizacion.
//  Aqui solo se decide quien llama y con que.
//
//  Nota de arquitectura: este modulo, aunque vive en src/lib/, importa las
//  funciones puras de src/views/relaciones/utils/. Es una dependencia
//  invertida que el plan asume de forma explicita para no tocar ese fichero.
//  Cuando se pueda, lo correcto seria mover la aritmetica de fechas a
//  src/lib/calcFechas.ts y reexportar desde relacionesUtils, pero eso
//  removeria las rutas de import de los tests existentes y queda fuera de este
//  lote.
// ─────────────────────────────────────────

export type ContextoFechas = {
  /** Festivos del centro educativo del convenio. */
  centroFestivos: string[];
  /** Interruptor de usar los festivos del centro. */
  usarFestivos: boolean;
  /** Festivos de la ciudad de la empresa. */
  empresaFestivos: string[];
  /** Interruptor de usar los festivos de la empresa. */
  usarFestivosEmpresa: boolean;
};

/**
 * Contexto por defecto: sin festivos, con el centro activado (que es lo que
 * hace la aplicacion de origen) y la empresa desactivada.
 */
export const CONTEXTO_VACIO: ContextoFechas = {
  centroFestivos: [],
  usarFestivos: true,
  empresaFestivos: [],
  usarFestivosEmpresa: false,
};

export type ResolutorFechas = {
  /** Fecha fin a partir de las horas, o null si el horario no aporta horas. */
  calcularFechaFin: (fechaInicio: string, totalHoras: number, horario: HorarioSemanal | undefined) => string | null;
  /** Fecha inicio a partir del fin, o null si el horario no aporta horas. */
  calcularFechaInicio: (fechaFin: string, totalHoras: number, horario: HorarioSemanal | undefined) => string | null;
  /** Si el horario tiene al menos un dia con horas. */
  tieneHoras: (horario: HorarioSemanal | undefined) => boolean;
  /** Atajo: las dos fechas de golpe. */
  calcularFechas: (
    referencia: { fechaInicio?: string | null; fechaFin?: string | null },
    totalHoras: number,
    horario: HorarioSemanal | undefined,
  ) => { fechaInicio: string | null; fechaFin: string | null };
};

export const crearResolutorFechas = (contexto: ContextoFechas): ResolutorFechas => {
  const { centroFestivos, usarFestivos, empresaFestivos, usarFestivosEmpresa } = contexto;

  const calcularFechaFin: ResolutorFechas['calcularFechaFin'] = (fechaInicio, totalHoras, horario) =>
    calculateEndDateForHours(fechaInicio, totalHoras, horario, centroFestivos, usarFestivos, empresaFestivos, usarFestivosEmpresa);

  const calcularFechaInicio: ResolutorFechas['calcularFechaInicio'] = (fechaFin, totalHoras, horario) =>
    calculateStartDateFromEnd(fechaFin, totalHoras, horario, centroFestivos, usarFestivos, empresaFestivos, usarFestivosEmpresa);

  const calcularFechas: ResolutorFechas['calcularFechas'] = (referencia, totalHoras, horario) => {
    const inicio = referencia.fechaInicio || null;
    const fin = referencia.fechaFin || null;
    return {
      // Con las dos fechas se respeta lo que haya: si falta la inicio se
      // deduce del fin, y si falta el fin se deduce de las horas.
      fechaInicio: inicio ?? (fin ? calcularFechaInicio(fin, totalHoras, horario) : null),
      fechaFin: fin ?? (inicio ? calcularFechaFin(inicio, totalHoras, horario) : null),
    };
  };

  return { calcularFechaFin, calcularFechaInicio, calcularFechas, tieneHoras: horarioTieneHoras };
};

/** Configuracion de festive tal y como la devuelve /api/profesor/config/festivos. */
export type FestivosConfig = { usar_festivos?: string; usar_festivos_empresa?: string };

/** Traduce la configuracion cruda del servidor a los dos interruptores. */
export const toContextoFechas = (
  config: FestivosConfig | null | undefined,
  empresaFestivos: string[],
): Pick<ContextoFechas, 'usarFestivos' | 'usarFestivosEmpresa'> => ({
  usarFestivos: config?.usar_festivos !== '0',
  usarFestivosEmpresa: config?.usar_festivos_empresa === '1',
});

/**
 * Descarga el contexto completo desde la API. Es el mismo reparto de fuentes
 * que hacia useRelaciones, concentrado en un sitio para que useAlumnos
 * calcule la fecha con los mismos datos que el panel de Relaciones.
 *
 * Ninguna parte es imprescindible para la otra: si el centro no existe o no
 * trae lista de festivos, se sigue calculando con el resto.
 */
export const cargarContextoFechas = async (opciones: {
  centroId?: number | null;
  empresaCiudad?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<ContextoFechas> => {
  const { centroId, empresaCiudad } = opciones;
  const f = opciones.fetchImpl ?? fetch;

  const [configRes, empresaRes, centroRes] = await Promise.all([
    f('/api/profesor/config/festivos').catch(() => null),
    f('/api/empresas/festivos').catch(() => null),
    centroId ? f(`/api/centros/${centroId}`).catch(() => null) : Promise.resolve(null),
  ]);

  const config = configRes && configRes.ok ? await configRes.json().catch(() => null) : null;
  const empresaMap = empresaRes && empresaRes.ok ? await empresaRes.json().catch(() => ({})) : {};
  const empresaFestivos = empresaCiudad ? empresaMap?.[empresaCiudad] ?? [] : [];
  const centro = centroRes && centroRes.ok ? await centroRes.json().catch(() => null) : null;

  return {
    ...toContextoFechas(config, empresaFestivos),
    empresaFestivos,
    centroFestivos: centro?.festivos ?? [],
  };
};
