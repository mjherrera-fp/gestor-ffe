import { describe, it, expect } from 'vitest';
import { alternarSeleccion, estadoSeleccion, podarSeleccion } from '../src/lib/seleccion.ts';

describe('podarSeleccion', () => {
  it('quita lo que ha dejado de verse al filtrar', () => {
    expect([...podarSeleccion(new Set([1, 2, 3]), [2, 3, 4])]).toEqual([2, 3]);
  });

  it('si no cambia nada devuelve la misma seleccion, para no repintar', () => {
    const sel = new Set([1, 2]);
    expect(podarSeleccion(sel, [1, 2, 3])).toBe(sel);
  });

  it('con la lista vacia no queda nada seleccionado', () => {
    expect(podarSeleccion(new Set([1]), []).size).toBe(0);
  });
});

describe('alternarSeleccion', () => {
  it('marca y desmarca sin tocar la seleccion original', () => {
    const sel = new Set([1]);
    expect([...alternarSeleccion(sel, 2)].sort()).toEqual([1, 2]);
    expect([...alternarSeleccion(sel, 1)]).toEqual([]);
    expect([...sel]).toEqual([1]);
  });
});

describe('estadoSeleccion', () => {
  it('distingue ninguna, algunas y todas sobre lo visible', () => {
    expect(estadoSeleccion(new Set(), [1, 2])).toBe('ninguna');
    expect(estadoSeleccion(new Set([1]), [1, 2])).toBe('algunas');
    expect(estadoSeleccion(new Set([1, 2]), [1, 2])).toBe('todas');
  });

  it('sin nada visible no hay nada seleccionado', () => {
    expect(estadoSeleccion(new Set([1]), [])).toBe('ninguna');
  });
});
