import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  crearResolutorFechas,
  toContextoFechas,
  cargarContextoFechas,
  CONTEXTO_VACIO,
} from '../src/lib/calculoFechas.ts';
import { DEFAULT_HORARIO } from '../src/views/relaciones/utils/relacionesUtils.ts';

// ─────────────────────────────────────────
//  Resolvedor compartido de fechas.
//
//  Aqui no se testea el calculo de fechas: eso ya lo cubren los tests de
//  caracterizacion de relacionesUtils. Lo que se testea es que el resolvedor
//  encadena bien el contexto (centro, empresa y los dos interruptores) y que
//  la carga desde la API lee exactamente las mismas fuentes que useRelaciones.
//
//  Las expectativas estan trazadas a mano sobre el bucle de
//  calculateEndDateForHours. 2026-01-05 es lunes, asi que:
//
//    16 h con lunes y martes de 8 h
//      sin festivos          -> lunes 5 (8 h) + martes 6 (8 h) -> 2026-01-06
//      con el martes festivo -> se salta el 6, y como el resto de dias de la
//                               semana no tienen horas, el segundo lunes
//                               completo las 16 h            -> 2026-01-12
// ─────────────────────────────────────────

const DIA_8H = { inicio: '09:00', fin: '17:00', horas: 8 };
const DIA_0H = { inicio: '', fin: '', horas: 0 };

const LUNES_Y_MARTES = {
  lunes: DIA_8H,
  martes: DIA_8H,
  miercoles: DIA_0H,
  jueves: DIA_0H,
  viernes: DIA_0H,
  sabado: DIA_0H,
  domingo: DIA_0H,
};

const SIN_HORAS = {
  lunes: DIA_0H,
  martes: DIA_0H,
  miercoles: DIA_0H,
  jueves: DIA_0H,
  viernes: DIA_0H,
  sabado: DIA_0H,
  domingo: DIA_0H,
};

describe('crearResolutorFechas', () => {

  it('sin festivos, 16 h caen en el segundo dia con horas', () => {
    const r = crearResolutorFechas(CONTEXTO_VACIO);
    expect(r.calcularFechaFin('2026-01-05', 16, LUNES_Y_MARTES)).toBe('2026-01-06');
  });

  it('respeta el interruptor de centro: encendido salta el festivo', () => {
    const r = crearResolutorFechas({
      centroFestivos: ['2026-01-06'],
      usarFestivos: true,
      empresaFestivos: [],
      usarFestivosEmpresa: false,
    });
    expect(r.calcularFechaFin('2026-01-05', 16, LUNES_Y_MARTES)).toBe('2026-01-12');
  });

  it('respeta el interruptor de centro: apagado ignora sus festivos', () => {
    const r = crearResolutorFechas({
      centroFestivos: ['2026-01-06'],
      usarFestivos: false,
      empresaFestivos: [],
      usarFestivosEmpresa: false,
    });
    expect(r.calcularFechaFin('2026-01-05', 16, LUNES_Y_MARTES)).toBe('2026-01-06');
  });

  it('respeta el interruptor de empresa: encendido salta el festivo', () => {
    const r = crearResolutorFechas({
      centroFestivos: [],
      usarFestivos: true,
      empresaFestivos: ['2026-01-06'],
      usarFestivosEmpresa: true,
    });
    expect(r.calcularFechaFin('2026-01-05', 16, LUNES_Y_MARTES)).toBe('2026-01-12');
  });

  it('respeta el interruptor de empresa: apagado ignora sus festivos', () => {
    const r = crearResolutorFechas({
      centroFestivos: [],
      usarFestivos: true,
      empresaFestivos: ['2026-01-06'],
      usarFestivosEmpresa: false,
    });
    expect(r.calcularFechaFin('2026-01-05', 16, LUNES_Y_MARTES)).toBe('2026-01-06');
  });

  it('aplica los dos conjuntos de festivos a la vez', () => {
    const r = crearResolutorFechas({
      centroFestivos: ['2026-01-05'],
      usarFestivos: true,
      empresaFestivos: ['2026-01-06'],
      usarFestivosEmpresa: true,
    });
    // Saltados el lunes 5 y el martes 6, hacen falta dos dias con horas: el
    // lunes 12 y el martes 13.
    expect(r.calcularFechaFin('2026-01-05', 16, LUNES_Y_MARTES)).toBe('2026-01-13');
  });

  it('devuelve null si el horario no aporta horas', () => {
    const r = crearResolutorFechas(CONTEXTO_VACIO);
    expect(r.tieneHoras(SIN_HORAS)).toBe(false);
    expect(r.calcularFechaFin('2026-01-05', 100, SIN_HORAS)).toBeNull();
  });

  it('devuelve null si falta el horario, la fecha o las horas', () => {
    const r = crearResolutorFechas(CONTEXTO_VACIO);
    expect(r.calcularFechaFin('2026-01-05', 16, undefined)).toBeNull();
    expect(r.calcularFechaFin('', 16, LUNES_Y_MARTES)).toBeNull();
    expect(r.calcularFechaFin('2026-01-05', 0, LUNES_Y_MARTES)).toBeNull();
  });

  it('tieneHoras distingue horario vacio, undefined y horario real', () => {
    const r = crearResolutorFechas(CONTEXTO_VACIO);
    expect(r.tieneHoras(undefined)).toBe(false);
    expect(r.tieneHoras(SIN_HORAS)).toBe(false);
    expect(r.tieneHoras(LUNES_Y_MARTES)).toBe(true);
    expect(r.tieneHoras(DEFAULT_HORARIO)).toBe(true);
  });

  describe('calcularFechas', () => {
    const r = crearResolutorFechas(CONTEXTO_VACIO);

    it('calcula el fin a partir de la inicio cuando no hay fin', () => {
      expect(r.calcularFechas({ fechaInicio: '2026-01-05' }, 16, LUNES_Y_MARTES))
        .toEqual({ fechaInicio: '2026-01-05', fechaFin: '2026-01-06' });
    });

    it('calcula la inicio a partir del fin cuando no hay inicio', () => {
      expect(r.calcularFechas({ fechaFin: '2026-01-06' }, 16, LUNES_Y_MARTES))
        .toEqual({ fechaInicio: '2026-01-05', fechaFin: '2026-01-06' });
    });

    it('no toca las fechas si ya estan las dos', () => {
      expect(r.calcularFechas({ fechaInicio: '2026-03-02', fechaFin: '2026-06-30' }, 999, LUNES_Y_MARTES))
        .toEqual({ fechaInicio: '2026-03-02', fechaFin: '2026-06-30' });
    });

    it('devuelve nulls si no hay ninguna referencia', () => {
      expect(r.calcularFechas({}, 16, LUNES_Y_MARTES))
        .toEqual({ fechaInicio: null, fechaFin: null });
    });

    it('conserva la inicio y deja el fin a null si el horario no aporta horas', () => {
      expect(r.calcularFechas({ fechaInicio: '2026-01-05' }, 100, SIN_HORAS))
        .toEqual({ fechaInicio: '2026-01-05', fechaFin: null });
    });

    it('no propaga holidays a las fechas ya fijadas', () => {
      const conFestivos = crearResolutorFechas({
        centroFestivos: ['2026-06-30'],
        usarFestivos: true,
        empresaFestivos: [],
        usarFestivosEmpresa: false,
      });
      expect(conFestivos.calcularFechas({ fechaInicio: '2026-03-02', fechaFin: '2026-06-30' }, 999, LUNES_Y_MARTES))
        .toEqual({ fechaInicio: '2026-03-02', fechaFin: '2026-06-30' });
    });
  });
});

describe('toContextoFechas', () => {
  it('trata la ausencia de config como el comportamiento por defecto', () => {
    expect(toContextoFechas(null, [])).toEqual({ usarFestivos: true, usarFestivosEmpresa: false });
    expect(toContextoFechas(undefined, [])).toEqual({ usarFestivos: true, usarFestivosEmpresa: false });
  });

  it('lee los dos interruptores', () => {
    expect(toContextoFechas({ usar_festivos: '0', usar_festivos_empresa: '1' }, []))
      .toEqual({ usarFestivos: false, usarFestivosEmpresa: true });
    expect(toContextoFechas({ usar_festivos: '1', usar_festivos_empresa: '0' }, []))
      .toEqual({ usarFestivos: true, usarFestivosEmpresa: false });
  });

  it('solo el valor exacto "0" desactiva el toggle de centro', () => {
    expect(toContextoFechas({ usar_festivos: '' }, []).usarFestivos).toBe(true);
    expect(toContextoFechas({ usar_festivos: 'false' }, []).usarFestivos).toBe(true);
  });

  it('solo el valor exacto "1" activa el toggle de empresa', () => {
    expect(toContextoFechas({ usar_festivos_empresa: 'true' }, []).usarFestivosEmpresa).toBe(false);
    expect(toContextoFechas({ usar_festivos_empresa: '2' }, []).usarFestivosEmpresa).toBe(false);
  });
});

describe('cargarContextoFechas', () => {
  afterEach(() => vi.restoreAllMocks());

  const responder = (cuerpo: unknown, ok = true) => ({ ok, json: async () => cuerpo });

  const fetchQueResponde = async (url: string) => {
    if (url === '/api/profesor/config/festivos') return responder({ usar_festivos: '0', usar_festivos_empresa: '1' });
    if (url === '/api/empresas/festivos') return responder({ Valencia: ['2026-01-08'], Madrid: ['2026-05-01'] });
    if (url === '/api/centros/7') return responder({ id: 7, nombre: 'Centro', festivos: ['2026-01-06'] });
    throw new Error(`URL inesperada: ${url}`);
  };

  it('reune los festivos de centro, de empresa y los dos interruptores', async () => {
    const f = vi.fn(fetchQueResponde) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ centroId: 7, empresaCiudad: 'Valencia', fetchImpl: f });
    expect(ctx).toEqual({
      usarFestivos: false,
      usarFestivosEmpresa: true,
      empresaFestivos: ['2026-01-08'],
      centroFestivos: ['2026-01-06'],
    });
  });

  it('elige los festivos de la ciudad pedida, no los de otra', async () => {
    const f = vi.fn(fetchQueResponde) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ centroId: 7, empresaCiudad: 'Madrid', fetchImpl: f });
    expect(ctx.empresaFestivos).toEqual(['2026-05-01']);
  });

  it('deja la lista de empresa vacia si la ciudad no esta en el mapa', async () => {
    const f = vi.fn(fetchQueResponde) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ centroId: 7, empresaCiudad: 'Bilbao', fetchImpl: f });
    expect(ctx.empresaFestivos).toEqual([]);
  });

  it('no pide el centro si no se pasa centroId', async () => {
    const pedidas: string[] = [];
    const f = vi.fn(async (url: string) => {
      pedidas.push(url);
      return fetchQueResponde(url);
    }) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ empresaCiudad: null, fetchImpl: f });
    expect(pedidas.some(u => u.startsWith('/api/centros/'))).toBe(false);
    expect(ctx.centroFestivos).toEqual([]);
  });

  it('sobrevive a un centro inexistente y sigue devolviendo el resto', async () => {
    const f = vi.fn(async (url: string) => {
      if (url === '/api/profesor/config/festivos') return responder({ usar_festivos: '1', usar_festivos_empresa: '1' });
      if (url === '/api/empresas/festivos') return responder({ Valencia: ['2026-01-08'] });
      return responder({ error: 'no encontrado' }, false);
    }) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ centroId: 999, empresaCiudad: 'Valencia', fetchImpl: f });
    expect(ctx.centroFestivos).toEqual([]);
    expect(ctx.empresaFestivos).toEqual(['2026-01-08']);
    expect(ctx.usarFestivosEmpresa).toBe(true);
  });

  it('degrada al contexto por defecto si la API no responde', async () => {
    const f = vi.fn(async () => { throw new Error('sin red'); }) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ centroId: 1, empresaCiudad: 'Valencia', fetchImpl: f });
    expect(ctx).toEqual(CONTEXTO_VACIO);
  });

  it('degrada al contexto por defecto si el json no es valido', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => { throw new Error('json roto'); } })) as unknown as typeof fetch;
    const ctx = await cargarContextoFechas({ centroId: 1, empresaCiudad: 'Valencia', fetchImpl: f });
    expect(ctx).toEqual(CONTEXTO_VACIO);
  });
});
