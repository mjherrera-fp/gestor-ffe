import { describe, it, expect } from 'vitest';
import {
  calculateEndDateForHours,
  calculateStartDateFromEnd,
  DEFAULT_HORARIO,
} from '../src/views/relaciones/utils/relacionesUtils.ts';
import type { HorarioSemanal, HorarioDia } from '../src/types/index.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  CARACTERIZACION del calculo de fechas por horas.
//
//  Estos tests no describen lo que el codigo DEBERIA hacer: describen lo que
//  HACE. Si alguno falla, no se arregla el test: se documenta el cambio de
//  comportamiento a proposito.
//
//  Anclas de calendario usadas (verificadas):
//    2026-01-01 jueves   2026-01-05 lunes   2026-01-09 viernes
//    2026-01-10 sabado  2026-01-12 lunes   2026-01-16 viernes
// ─────────────────────────────────────────────────────────────────────────────

const LUN_VIE = DEFAULT_HORARIO as HorarioSemanal;

const dia = (horas: number): HorarioDia =>
  horas === 0
    ? { inicio: '00:00', fin: '00:00', horas: 0 }
    : { inicio: '08:00', fin: '17:00', horas };

const horarioDe = (mapa: Partial<Record<keyof HorarioSemanal, number>>): HorarioSemanal => ({
  lunes: dia(mapa.lunes ?? 0),
  martes: dia(mapa.martes ?? 0),
  miercoles: dia(mapa.miercoles ?? 0),
  jueves: dia(mapa.jueves ?? 0),
  viernes: dia(mapa.viernes ?? 0),
  sabado: dia(mapa.sabado ?? 0),
  domingo: dia(mapa.domingo ?? 0),
});

const SIN_HORAS = horarioDe({});

describe('calculateEndDateForHours · casos basicos', () => {
  it('cierra 40 h de lunes a viernes en el mismo viernes', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, [])).toBe('2026-01-09');
  });

  it('cuenta el dia de inicio como día trabajado', () => {
    // 8 h el lunes + 8 h el martes = 16 h.
    expect(calculateEndDateForHours('2026-01-05', 16, LUN_VIE, [])).toBe('2026-01-06');
  });

  it('respeta horarios parciales (solo lunes y miercoles)', () => {
    const lun_mie = horarioDe({ lunes: 8, miercoles: 8 });
    // 8 h el lunes + 8 h el miercoles = 16 h.
    expect(calculateEndDateForHours('2026-01-05', 16, lun_mie, [])).toBe('2026-01-07');
  });

  it('salta sabados y domingos sin horas asignadas', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, [])).toBe('2026-01-09');
  });

  it('arranca en sabado y continúa el lunes siguiente', () => {
    expect(calculateEndDateForHours('2026-01-10', 40, LUN_VIE, [])).toBe('2026-01-16');
  });

  it('cruza la frontera de mes', () => {
    expect(calculateEndDateForHours('2026-01-05', 80, LUN_VIE, [])).toBe('2026-01-16');
    expect(calculateEndDateForHours('2026-01-05', 200, LUN_VIE, [])).toBe('2026-02-06');
  });
});

describe('calculateEndDateForHours · festivos', () => {
  it('un festivo en dia laborable retrasa la fecha fin', () => {
    // Sin festivo: 2026-01-09. Con el miercoles 07 festivo hace falta un
    // sexto dia laborable, que es el lunes 12.
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-07'])).toBe('2026-01-12');
  });

  it('un festivo en fin de semana no altera nada', () => {
    // El sabado y el domingo ya son dias no trabajados.
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-10', '2026-01-11'])).toBe('2026-01-09');
  });

  it('un festivo en la propia fecha de inicio salta ese dia', () => {
    // El lunes 05 no cuenta: 40 h se reparten mar-mie-jue-vie (32 h) + lun 12.
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-05'])).toBe('2026-01-12');
  });

  it('un festivo en el ultimo dia trabajado lo descarta', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-09'])).toBe('2026-01-12');
  });

  it('ignora los festivos si usarFestivos es false', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-07'], false)).toBe('2026-01-09');
  });

  it('un festivo posterior a la fecha fin no tiene efecto', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-17'])).toBe('2026-01-09');
  });
});

// `festivosSet` no esta exportada, asi que los toggles se observan a traves de
// su unico consumidor observable. Es mejor asi: se prueba el efecto real.
describe('festivos de empresa · toggle independiente', () => {
  it('no aplica los festivos de empresa si usarFestivosEmpresa es false', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, [], true, ['2026-01-07'], false)).toBe('2026-01-09');
  });

  it('aplica los festivos de empresa si usarFestivosEmpresa es true', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, [], true, ['2026-01-07'], true)).toBe('2026-01-12');
  });

  it('aplica los de empresa aunque usarFestivos sea false', () => {
    // Comprobacion de que los dos toggles son independientes.
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, [], false, ['2026-01-08'], true)).toBe('2026-01-12');
  });

  it('centro y empresa se suman cuando ambos toggles estan activos', () => {
    // Cada festivo por separado lleva a 01-12; los dos, a 01-13.
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-07'], true, ['2026-01-08'], true)).toBe('2026-01-13');
  });

  it('descarta tambien los festivos de empresa si ambos toggles estan apagados', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, LUN_VIE, ['2026-01-07'], false, ['2026-01-08'], false)).toBe('2026-01-09');
  });
});

describe('calculateStartDateFromEnd · retroceso', () => {
  it('retrocede 40 h hasta el lunes', () => {
    expect(calculateStartDateFromEnd('2026-01-09', 40, LUN_VIE, [])).toBe('2026-01-05');
  });

  it('cuenta el dia final como día trabajado y salta los intermedios sin horas', () => {
    const lun_mie = horarioDe({ lunes: 8, miercoles: 8 });
    // Desde el miercoles 07: cuenta 8 h, el martes 07 no tiene horas y se
    // salta, y el lunes 05 cierra las 16 h.
    expect(calculateStartDateFromEnd('2026-01-07', 16, lun_mie, [])).toBe('2026-01-05');
  });

  it('respeta los festivos de centro al retroceder', () => {
    // Desde el viernes 09 con el miercoles 07 festivo hacen falta 6 dias
    // laborables hacia atras, asi que cae en el viernes de la semana previa.
    expect(calculateStartDateFromEnd('2026-01-09', 40, LUN_VIE, ['2026-01-07'])).toBe('2026-01-02');
    // Desde el lunes 12 solo hay que retroceder 5, y el festivo no empuja mas.
    expect(calculateStartDateFromEnd('2026-01-12', 40, LUN_VIE, ['2026-01-07'])).toBe('2026-01-05');
  });
});

describe('ida y vuelta', () => {
  it('se cumple cuando el inicio es un dia laborable', () => {
    const fin = calculateEndDateForHours('2026-01-05', 40, LUN_VIE, []);
    expect(fin).not.toBeNull();
    expect(calculateStartDateFromEnd(fin as string, 40, LUN_VIE, [])).toBe('2026-01-05');
  });

  it('se cumple con horario parcial y con festivos', () => {
    const lun_mie = horarioDe({ lunes: 8, miercoles: 8 });
    const fin = calculateEndDateForHours('2026-01-05', 16, lun_mie, []);
    expect(calculateStartDateFromEnd(fin as string, 16, lun_mie, [])).toBe('2026-01-05');
  });

  it('NO se cumple si el inicio es un dia no laborable', () => {
    // Caracterizado, no corregido: al avanzar se ignoran los dias no
    // laborables, pero al retroceder el conteo arranca en el primer dia
    // laborable real, no en el sabado. Documentado para el Lote 4.
    const fin = calculateEndDateForHours('2026-01-10', 40, LUN_VIE, []);
    expect(fin).toBe('2026-01-16');
    expect(calculateStartDateFromEnd(fin as string, 40, LUN_VIE, [])).toBe('2026-01-12');
  });
});

describe('entradas invalidas', () => {
  it('devuelve null con totalHours 0', () => {
    expect(calculateEndDateForHours('2026-01-05', 0, LUN_VIE, [])).toBeNull();
    expect(calculateStartDateFromEnd('2026-01-09', 0, LUN_VIE, [])).toBeNull();
  });

  it('devuelve null con startDate vacio', () => {
    expect(calculateEndDateForHours('', 40, LUN_VIE, [])).toBeNull();
    expect(calculateStartDateFromEnd('', 40, LUN_VIE, [])).toBeNull();
  });

  it('devuelve null si no hay horario', () => {
    expect(calculateEndDateForHours('2026-01-05', 40, undefined, [])).toBeNull();
    expect(calculateStartDateFromEnd('2026-01-09', 40, undefined, [])).toBeNull();
  });
});

describe('limite de iteraciones', () => {
  it('con 0 horas en los 7 dias devuelve la fecha 365 dias despues', () => {
    // Comportamiento actual deducido: el bucle esta acotado a 365 vueltas
    // (iterations < 365) y remainingHoras nunca baja, asi que agota el tope
    // y devuelve una fecha sin relacion con las horas pedidas.
    // Riesgo real: un horario vacio produce una fecha fin de un ano despues
    // sin ningun aviso. Pendiente de decision en el Lote 4.
    const resultado = calculateEndDateForHours('2026-01-05', 40, SIN_HORAS, []);
    expect(resultado).toBe('2027-01-05');
  });

  it('tambien en el retroceso: exactamente 365 dias antes', () => {
    expect(calculateStartDateFromEnd('2026-01-05', 40, SIN_HORAS, [])).toBe('2025-01-05');
  });
});
