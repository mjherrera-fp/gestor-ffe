import { describe, it, expect } from 'vitest';
import { alumnosConMatch, cvPorAlumno } from '../src/lib/estadisticasIntereses.ts';

const filas = [
  { nombre: 'Luis', apellidos: 'Pérez Ruiz', envios: 1, tieneMatch: 0 },
  { nombre: 'Ana', apellidos: 'López Gil', envios: 3, tieneMatch: 1 },
  { nombre: 'Marta', apellidos: 'Sanz Díaz', envios: 0, tieneMatch: 0 },
  { nombre: 'Bea', apellidos: 'Ortiz', envios: 1, tieneMatch: 1 },
];

describe('cvPorAlumno', () => {
  it('de mas a menos envios, y a igualdad por nombre', () => {
    expect(cvPorAlumno(filas).datos).toEqual([
      { alumno: 'Ana López', envios: 3 },
      { alumno: 'Bea Ortiz', envios: 1 },
      { alumno: 'Luis Pérez', envios: 1 },
      { alumno: 'Marta Sanz', envios: 0 },
    ]);
  });

  it('total y media de envios', () => {
    const r = cvPorAlumno(filas);
    expect(r.total).toBe(5);
    expect(r.media).toBe(1.3);
  });

  it('sin alumnos, sin datos y media cero', () => {
    expect(cvPorAlumno([])).toEqual({ datos: [], total: 0, media: 0 });
  });
});

describe('alumnosConMatch', () => {
  it('cuenta con y sin match y lista los que lo tienen', () => {
    expect(alumnosConMatch(filas)).toEqual({
      conMatch: 2,
      sinMatch: 2,
      nombres: ['Ana López Gil', 'Bea Ortiz'],
    });
  });

  it('acepta el match como booleano', () => {
    expect(alumnosConMatch([{ nombre: 'A', apellidos: 'B', envios: 0, tieneMatch: true }]).conMatch).toBe(1);
  });
});
