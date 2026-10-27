import { describe, it, expect } from 'vitest';
import { buscarAlumno, empresasQueCoinciden, normalizarBusqueda } from '../src/lib/interesesBusqueda.ts';

const empresas = [
  { id: 1, nombre: 'Talleres Norte' },
  { id: 2, nombre: 'Software Sur' },
  { id: 3, nombre: 'Construcciones Núñez' },
];
const ana = { id: 10, nombre: 'Ana', apellidos: 'López Gil' };
const luis = { id: 11, nombre: 'Luis', apellidos: 'Pérez' };
const marta = { id: 12, nombre: 'Marta', apellidos: 'Sanz' };
const intereses = [
  { alumnoId: 10, empresaId: 1, interesado: 'alumno' as const },   // Ana envia a Talleres
  { alumnoId: 11, empresaId: 1, interesado: 'empresa' as const },  // Talleres solicita a Luis
  { alumnoId: 12, empresaId: 1, interesado: 'alumno' as const },   // match Marta - Talleres
  { alumnoId: 12, empresaId: 1, interesado: 'empresa' as const },
  { alumnoId: 10, empresaId: 2, interesado: 'alumno' as const },
];

const buscar = (alumno: typeof ana, texto: string) =>
  buscarAlumno(alumno, texto, intereses, empresasQueCoinciden(empresas, texto));

describe('normalizarBusqueda', () => {
  it('ignora mayusculas, tildes y espacios de los lados', () => {
    expect(normalizarBusqueda('  Núñez ')).toBe('nunez');
  });
});

describe('buscarAlumno', () => {
  it('sin texto entran todos', () => {
    expect(buscar(ana, '')).toEqual({ coincide: true, porEmpresas: [] });
  });

  it('por nombre o apellidos del alumno, sin tildes', () => {
    expect(buscar(ana, 'lopez').coincide).toBe(true);
    expect(buscar(ana, 'ana lópez').coincide).toBe(true);
    // Tambien en el orden de las listas, apellidos primero.
    expect(buscar(ana, 'lopez gil ana').coincide).toBe(true);
    expect(buscar(ana, 'gil lopez').coincide).toBe(false);
    expect(buscar(luis, 'ana').coincide).toBe(false);
  });

  it('por empresa salen los envios, las solicitudes y los match', () => {
    expect(buscar(ana, 'talleres')).toEqual({
      coincide: true,
      porEmpresas: [{ empresaId: 1, nombre: 'Talleres Norte', envio: true, solicitud: false }],
    });
    expect(buscar(luis, 'talleres').porEmpresas).toEqual([
      { empresaId: 1, nombre: 'Talleres Norte', envio: false, solicitud: true },
    ]);
    expect(buscar(marta, 'talleres').porEmpresas).toEqual([
      { empresaId: 1, nombre: 'Talleres Norte', envio: true, solicitud: true },
    ]);
  });

  it('un alumno sin relacion con la empresa buscada no sale', () => {
    expect(buscar(luis, 'software').coincide).toBe(false);
  });

  it('si el texto coincide con varias empresas, se dicen todas', () => {
    expect(buscar(ana, 'r').porEmpresas.map(e => e.nombre)).toEqual(['Software Sur', 'Talleres Norte']);
  });

  it('si sale por su propio nombre no se lista ninguna empresa', () => {
    // "ana" esta en el nombre de Ana; no hace falta explicar por que sale.
    expect(buscar(ana, 'ana').porEmpresas).toEqual([]);
  });

  it('la empresa se encuentra sin tildes', () => {
    const conNunez = [{ alumnoId: 11, empresaId: 3, interesado: 'alumno' as const }];
    const r = buscarAlumno(luis, 'nunez', conNunez, empresasQueCoinciden(empresas, 'nunez'));
    expect(r.coincide).toBe(true);
    expect(r.porEmpresas[0].nombre).toBe('Construcciones Núñez');
  });
});
