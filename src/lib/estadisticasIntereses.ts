/**
 * Estadisticas del panel que salen de la pantalla de Intereses: cuantos CV ha
 * enviado cada alumno y que alumnos tienen match (han enviado el CV a una
 * empresa y esa misma empresa los ha solicitado).
 */

export interface FilaIntereses {
  nombre: string;
  apellidos: string;
  envios: number;
  tieneMatch: number | boolean;
}

export interface CVPorAlumno {
  alumno: string;
  envios: number;
}

/** Nombre corto para el eje: nombre y primer apellido. */
const nombreCorto = (f: FilaIntereses) => `${f.nombre} ${f.apellidos.split(' ')[0] ?? ''}`.trim();

/** CV enviados por alumno, de mas a menos (a igualdad, por nombre). */
export function cvPorAlumno(filas: FilaIntereses[]): { datos: CVPorAlumno[]; total: number; media: number } {
  const datos = filas
    .map(f => ({ alumno: nombreCorto(f), envios: Number(f.envios) || 0 }))
    .sort((a, b) => b.envios - a.envios || a.alumno.localeCompare(b.alumno, 'es'));
  const total = datos.reduce((s, d) => s + d.envios, 0);
  const media = datos.length ? Math.round((total / datos.length) * 10) / 10 : 0;
  return { datos, total, media };
}

/** Cuantos alumnos tienen match y quienes. */
export function alumnosConMatch(filas: FilaIntereses[]): { conMatch: number; sinMatch: number; nombres: string[] } {
  const con = filas.filter(f => !!Number(f.tieneMatch));
  return {
    conMatch: con.length,
    sinMatch: filas.length - con.length,
    nombres: con
      .map(f => `${f.nombre} ${f.apellidos}`.trim())
      .sort((a, b) => a.localeCompare(b, 'es')),
  };
}
