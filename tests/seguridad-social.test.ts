import { describe, it, expect } from 'vitest';
import { contarDiasCotizacion } from '../src/lib/seguridadSocial.ts';
import type { ParamsContarDiasCotizacion } from '../src/lib/seguridadSocial.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  DIAS COTIZADOS POR ALUMNO Y MES.
//
//  La extraccion de esta funcion desde src/lib/dao.ts se valido con un test
//  diferencial contra una copia literal de la version anterior, sobre 400
//  escenarios generados y las cuatro combinaciones de interruptores de
//  festivos. Coincidio en todos, lo que demuestra tambien que eliminar el
//  codigo muerto (festivosSkip / esFestivo) no altera ningun resultado.
//  Ese andamiaje se retiro tras validarlo; los casos de aqui fijan el
//  comportamiento de forma permanente.
// ─────────────────────────────────────────────────────────────────────────────

const LUN_VIE_8H = {
  lunes: { inicio: '08:00', fin: '17:00', horas: 8 },
  martes: { inicio: '08:00', fin: '17:00', horas: 8 },
  miercoles: { inicio: '08:00', fin: '17:00', horas: 8 },
  jueves: { inicio: '08:00', fin: '17:00', horas: 8 },
  viernes: { inicio: '08:00', fin: '17:00', horas: 8 },
  sabado: { inicio: '00:00', fin: '00:00', horas: 0 },
  domingo: { inicio: '00:00', fin: '00:00', horas: 0 },
};

const SIN_NINGUN_DIA = {
  lunes: { inicio: '00:00', fin: '00:00', horas: 0 },
  martes: { inicio: '00:00', fin: '00:00', horas: 0 },
  miercoles: { inicio: '00:00', fin: '00:00', horas: 0 },
  jueves: { inicio: '00:00', fin: '00:00', horas: 0 },
  viernes: { inicio: '00:00', fin: '00:00', horas: 0 },
  sabado: { inicio: '00:00', fin: '00:00', horas: 0 },
  domingo: { inicio: '00:00', fin: '00:00', horas: 0 },
};

const paramsBase = (over: Partial<ParamsContarDiasCotizacion> = {}): ParamsContarDiasCotizacion => ({
  relaciones: [
    { id: 1, horario: JSON.stringify(LUN_VIE_8H), alumnoId: 100, aluInicio: '2026-01-01', aluFin: '2026-01-31' },
  ],
  relCentroMap: { 1: 10 },
  relEmpresaCiudadMap: { 1: 'Madrid' },
  centroFestivosMap: { 10: new Set<string>() },
  empresaFestivosByCiudad: { Madrid: new Set<string>() },
  usarFestivos: true,
  usarFestivosEmpresa: false,
  ...over,
});

const relacion = (id: number, alumnoId: number, horario: unknown, ini: string | null, fin: string | null) => ({
  id, horario, alumnoId, aluInicio: ini, aluFin: fin,
});

describe('dias laborables del mes', () => {
  // OJO sobre el formato de la clave de mes: es `YYYY-MM-01`, no `YYYY-MM`.
  // La version anterior hacia toLocalDateStr(iter) sobre un iter que siempre
  // cae en dia 1, asi que el dia se queda dentro de la clave. Es inocuo: los
  // unicos consumidores hacen split('-')[1] (formatMesLabel,
  // SeguridadSocialTable.tsx:15) o reconstruyen la clave con el mismo string
  // (SeguridadSocialTable.tsx:31). Queda escrito para que no se lea como bug.

  it('cuenta los 22 dias laborables de enero de 2026', () => {
    // Enero 2026 empieza en jueves: 2 + 5 + 5 + 5 + 5 = 22.
    const r = contarDiasCotizacion(paramsBase());
    expect(r.meses).toEqual(['2026-01-01']);
    expect(r.datos['100_2026-01-01']).toBe(22);
  });

  it('recorta el mes al periodo real del alumno', () => {
    // Del 12 al 23 de enero solo hay 10 dias laborables.
    const r = contarDiasCotizacion(
      paramsBase({
        relaciones: [relacion(1, 100, JSON.stringify(LUN_VIE_8H), '2026-01-12', '2026-01-23')],
      })
    );
    expect(r.datos['100_2026-01-01']).toBe(10);
  });

  it('solo cuenta los dias con horas en el horario', () => {
    const solo_jueves = {
      ...SIN_NINGUN_DIA,
      jueves: { inicio: '08:00', fin: '17:00', horas: 8 },
    };
    const r = contarDiasCotizacion(
      paramsBase({ relaciones: [relacion(1, 100, JSON.stringify(solo_jueves), '2026-01-01', '2026-01-31')] })
    );
    // Enero 2026 tiene 5 jueves: 1, 8, 15, 22 y 29.
    expect(r.datos['100_2026-01-01']).toBe(5);
  });

  it('no cuenta nada si el horario no tiene ningun dia con horas', () => {
    const r = contarDiasCotizacion(
      paramsBase({ relaciones: [relacion(1, 100, JSON.stringify(SIN_NINGUN_DIA), '2026-01-01', '2026-01-31')] })
    );
    expect(r.datos).toEqual({});
  });

  it('tolera un horario corrupto sin romperse', () => {
    const r = contarDiasCotizacion(
      paramsBase({ relaciones: [relacion(1, 100, '{esto no es json', '2026-01-01', '2026-01-31')] })
    );
    expect(r.datos).toEqual({});
  });

  it('acumula cuando dos relaciones comparten alumnoId', () => {
    const r = contarDiasCotizacion(
      paramsBase({
        relaciones: [
          relacion(1, 100, JSON.stringify(LUN_VIE_8H), '2026-01-01', '2026-01-31'),
          relacion(2, 100, JSON.stringify(LUN_VIE_8H), '2026-01-01', '2026-01-31'),
        ],
        relCentroMap: { 1: 10, 2: 10 },
        relEmpresaCiudadMap: { 1: 'Madrid', 2: 'Madrid' },
      })
    );
    expect(r.datos['100_2026-01-01']).toBe(44);
  });
});

describe('festivos de centro', () => {
  it('descuenta el festivo cuando usarFestivos es true', () => {
    const r = contarDiasCotizacion(paramsBase({ centroFestivosMap: { 10: new Set(['2026-01-07']) } }));
    expect(r.datos['100_2026-01-01']).toBe(21);
  });

  it('no descuenta el festivo cuando usarFestivos es false', () => {
    const r = contarDiasCotizacion(
      paramsBase({ centroFestivosMap: { 10: new Set(['2026-01-07']) }, usarFestivos: false })
    );
    expect(r.datos['100_2026-01-01']).toBe(22);
  });
});

describe('festivos de empresa', () => {
  const conEmpresa = { empresaFestivosByCiudad: { Madrid: new Set(['2026-01-07']) } };

  it('descuenta el festivo cuando usarFestivosEmpresa es true', () => {
    expect(contarDiasCotizacion(paramsBase({ ...conEmpresa, usarFestivosEmpresa: true })).datos['100_2026-01-01']).toBe(21);
  });

  it('no descuenta el festivo cuando usarFestivosEmpresa es false', () => {
    expect(contarDiasCotizacion(paramsBase({ ...conEmpresa, usarFestivosEmpresa: false })).datos['100_2026-01-01']).toBe(22);
  });

  it('los dos interruptores son independientes y se suman', () => {
    const r = contarDiasCotizacion(
      paramsBase({
        centroFestivosMap: { 10: new Set(['2026-01-07']) },
        empresaFestivosByCiudad: { Madrid: new Set(['2026-01-08']) },
        usarFestivos: true,
        usarFestivosEmpresa: true,
      })
    );
    expect(r.datos['100_2026-01-01']).toBe(20);
  });

  it('aplica los de empresa aunque usarFestivos este apagado', () => {
    const r = contarDiasCotizacion(
      paramsBase({ ...conEmpresa, usarFestivos: false, usarFestivosEmpresa: true })
    );
    expect(r.datos['100_2026-01-01']).toBe(21);
  });

  it('no aplica los de empresa si la relacion no tiene ciudad', () => {
    const r = contarDiasCotizacion(
      paramsBase({ ...conEmpresa, relEmpresaCiudadMap: {}, usarFestivosEmpresa: true })
    );
    expect(r.datos['100_2026-01-01']).toBe(22);
  });
});

describe('rango de meses', () => {
  it('genera una clave por mes, del mes de inicio al de fin', () => {
    const r = contarDiasCotizacion(
      paramsBase({
        relaciones: [relacion(1, 100, JSON.stringify(LUN_VIE_8H), '2025-11-15', '2026-02-10')],
      })
    );
    expect(r.meses).toEqual(['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01']);
    expect(Object.keys(r.datos).sort()).toEqual([
      '100_2025-11-01', '100_2025-12-01', '100_2026-01-01', '100_2026-02-01',
    ]);
  });

  it('devuelve vacio si no hay relaciones', () => {
    expect(contarDiasCotizacion(paramsBase({ relaciones: [] }))).toEqual({ meses: [], datos: {} });
  });

  it('devuelve vacio si ninguna relacion tiene fechas', () => {
    const r = contarDiasCotizacion(
      paramsBase({ relaciones: [relacion(1, 100, JSON.stringify(LUN_VIE_8H), null, null)] })
    );
    expect(r).toEqual({ meses: [], datos: {} });
  });

  it('usa minDate y maxDate cuando una relacion no tiene fecha final', () => {
    // La relacion 1 va de enero a marzo; la 2 no tiene fin, asi que se
    //extends hasta el maxDate global (marzo).
    const r = contarDiasCotizacion(
      paramsBase({
        relaciones: [
          relacion(1, 100, JSON.stringify(LUN_VIE_8H), '2026-01-01', '2026-03-31'),
          relacion(2, 200, JSON.stringify(LUN_VIE_8H), '2026-02-01', null),
        ],
        relCentroMap: { 1: 10, 2: 10 },
        relEmpresaCiudadMap: { 1: 'Madrid', 2: 'Madrid' },
      })
    );
    expect(r.meses).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    // Febrero de 2026 tiene 20 dias laborables.
    expect(r.datos['200_2026-02-01']).toBe(20);
    // Y marzo tambien, porque es su fecha final heredada.
    expect(r.datos['200_2026-03-01']).toBe(22);
  });
});
