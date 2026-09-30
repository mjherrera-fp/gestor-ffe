import { describe, it, expect } from 'vitest';
import {
  aplicarPersonalizados, conjuntoSaltar, deltaPersonalizados, festivosHeredados,
} from '../src/lib/festivosAlumno.ts';
import type { FestivoPersonalizado } from '../src/types/index.ts';

const quitar = (fecha: string): FestivoPersonalizado => ({ fecha, tipo: 'QUITAR' });
const anadir = (fecha: string): FestivoPersonalizado => ({ fecha, tipo: 'ANADIR' });

describe('festivosHeredados', () => {
  it('une centro y empresa y ordena', () => {
    expect(festivosHeredados({
      centro: ['2025-12-06', '2025-01-01'],
      usarCentro: true,
      empresa: ['2025-08-15'],
      usarEmpresa: true,
    })).toEqual(['2025-01-01', '2025-08-15', '2025-12-06']);
  });

  it('respeta cada interruptor por separado', () => {
    const base = { centro: ['2025-01-01'], empresa: ['2025-08-15'] };
    expect(festivosHeredados({ ...base, usarCentro: true, usarEmpresa: false })).toEqual(['2025-01-01']);
    expect(festivosHeredados({ ...base, usarCentro: false, usarEmpresa: true })).toEqual(['2025-08-15']);
    expect(festivosHeredados({ ...base, usarCentro: false, usarEmpresa: false })).toEqual([]);
  });

  it('elimina duplicados entre los dos orígenes', () => {
    expect(festivosHeredados({
      centro: ['2025-01-01'], usarCentro: true,
      empresa: ['2025-01-01'], usarEmpresa: true,
    })).toEqual(['2025-01-01']);
  });

  it('tolera listas indefinidas', () => {
    expect(festivosHeredados({ centro: [], usarCentro: true, empresa: [], usarEmpresa: false })).toEqual([]);
  });
});

describe('aplicarPersonalizados', () => {
  const heredados = ['2025-01-01', '2025-08-15'];

  it('devuelve los heredados sin cambios si el alumno no tiene preferencias', () => {
    expect(aplicarPersonalizados(heredados)).toEqual(heredados);
    expect(aplicarPersonalizados(heredados, [])).toEqual(heredados);
  });

  // Un QUITAR significa que el alumno SI asiste: el dia deja de descontarse.
  it('quita un festivo heredado que el alumno si asiste', () => {
    expect(aplicarPersonalizados(heredados, [quitar('2025-01-01')])).toEqual(['2025-08-15']);
  });

  // Un ANADIR significa que el alumno NO asiste: el dia se descuenta.
  it('añade un dia en el que no asiste aunque no sea festivo', () => {
    expect(aplicarPersonalizados(heredados, [anadir('2025-10-12')]))
      .toEqual(['2025-01-01', '2025-08-15', '2025-10-12']);
  });

  it('aplica las dosDirections a la vez', () => {
    expect(aplicarPersonalizados(heredados, [quitar('2025-01-01'), anadir('2025-10-12')]))
      .toEqual(['2025-08-15', '2025-10-12']);
  });

  it('deja el ANADIR ganar si el dia era ya un festivo heredado', () => {
    // Marcar dos veces el mismo dia no puede ser contradictorio: si el alumno
    // dice que no asiste, no asiste, estea o no festivo oficial.
    expect(aplicarPersonalizados(heredados, [anadir('2025-01-01')])).toEqual(['2025-01-01', '2025-08-15']);
  });

  it('ordena el resultado', () => {
    expect(aplicarPersonalizados(['2025-08-15'], [anadir('2025-01-01'), anadir('2025-10-12')]))
      .toEqual(['2025-01-01', '2025-08-15', '2025-10-12']);
  });
});

describe('deltaPersonalizados', () => {
  const heredados = ['2025-01-01', '2025-08-15'];

  it('devuelve un desvio vacio si la lista efectiva no cambia', () => {
    expect(deltaPersonalizados(heredados, heredados)).toEqual([]);
  });

  it('registra como QUITAR lo que desaparece de la lista efectiva', () => {
    expect(deltaPersonalizados(heredados, ['2025-08-15'])).toEqual([quitar('2025-01-01')]);
  });

  it('registra como ANADIR lo que aparece en la lista efectiva', () => {
    expect(deltaPersonalizados(heredados, [...heredados, '2025-10-12'])).toEqual([anadir('2025-10-12')]);
  });

  it('guarda primero los QUITAR y despues los ANADIR', () => {
    expect(deltaPersonalizados(heredados, ['2025-10-12'])).toEqual([quitar('2025-01-01'), quitar('2025-08-15'), anadir('2025-10-12')]);
  });

  // Esta es la propiedad que hace que el guardado no pierda informacion: lo que
  // sale del editor se vuelve a convertir en filas y al reaplicar sale lo mismo.
  it('es la inversa de aplicarPersonalizados', () => {
    const efectivos = ['2025-08-15', '2025-10-12', '2025-11-03'];
    const desvio = deltaPersonalizados(heredados, efectivos);
    expect(aplicarPersonalizados(heredados, desvio)).toEqual(efectivos);
  });

  it('aguanta la edicion completa: quedarse sin dias', () => {
    expect(deltaPersonalizados(heredados, []))
      .toEqual([quitar('2025-01-01'), quitar('2025-08-15')]);
  });
});

describe('conjuntoSaltar', () => {
  const base = new Set(['2025-01-01', '2025-08-15']);

  it('devuelve la MISMA instancia cuando el alumno no tiene preferencias', () => {
    // El conjunto heredado se cachea por convenio y lo comparten todos sus
    // alumnos. Devolver una copia haria que reservasemos un Set por alumno.
    expect(conjuntoSaltar(base)).toBe(base);
    expect(conjuntoSaltar(base, [])).toBe(base);
  });

  it('devuelve un conjunto nuevo cuando hay que descartar un dia', () => {
    const r = conjuntoSaltar(base, [quitar('2025-01-01')]);
    expect(r).not.toBe(base);
    expect([...r].sort()).toEqual(['2025-08-15']);
    // El conjunto original queda intacto: lo comparten los demas alumnos.
    expect([...base].sort()).toEqual(['2025-01-01', '2025-08-15']);
  });

  it('anade dias que el alumno no asiste', () => {
    expect([...conjuntoSaltar(base, [anadir('2025-10-12')])].sort())
      .toEqual(['2025-01-01', '2025-08-15', '2025-10-12']);
  });

  it('coincide con aplicarPersonalizados', () => {
    const desvio = [quitar('2025-01-01'), anadir('2025-10-12')];
    expect([...conjuntoSaltar(base, desvio)].sort())
      .toEqual(aplicarPersonalizados([...base], desvio));
  });
});
