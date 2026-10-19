import JSZip from 'jszip';
import { Alumno } from '../types/index.ts';

export interface EntradaCV {
  nombre: string;
  bytes: Uint8Array;
}

/** Los bytes de un CV guardado como data URI (o base64 sin cabecera). */
export function bytesDeCV(cv: string): Uint8Array {
  const coma = cv.startsWith('data:') ? cv.indexOf(',') : -1;
  const binario = atob(coma >= 0 ? cv.slice(coma + 1) : cv);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

const limpiar = (s: string) => s.trim().replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '');

/**
 * Los ficheros del zip de CVs, uno por alumno con CV, y los alumnos que no
 * tienen. El nombre es el mismo que al descargar un CV suelto
 * (Nombre_Apellidos_cv.pdf); si dos alumnos se llaman igual, el segundo lleva
 * su DNI para que no se pisen dentro del zip.
 */
export function entradasCV(alumnos: Alumno[]): { entradas: EntradaCV[]; sinCV: Alumno[] } {
  const entradas: EntradaCV[] = [];
  const sinCV: Alumno[] = [];
  const usados = new Set<string>();
  for (const a of alumnos) {
    if (!a.cvPath) { sinCV.push(a); continue; }
    let nombre = `${limpiar(a.nombre)}_${limpiar(a.apellidos)}_cv.pdf`;
    if (usados.has(nombre.toLowerCase())) {
      nombre = `${limpiar(a.nombre)}_${limpiar(a.apellidos)}_${limpiar(a.dni || String(a.id))}_cv.pdf`;
    }
    usados.add(nombre.toLowerCase());
    entradas.push({ nombre, bytes: bytesDeCV(a.cvPath) });
  }
  return { entradas, sinCV };
}

/**
 * Descarga en un .zip los CV de los alumnos que lo tengan. Devuelve cuantos se
 * han incluido y los alumnos que no tenian CV, para avisar.
 */
export async function descargarCVs(alumnos: Alumno[]): Promise<{ incluidos: number; sinCV: Alumno[] }> {
  const { entradas, sinCV } = entradasCV(alumnos);
  if (entradas.length === 0) return { incluidos: 0, sinCV };

  const zip = new JSZip();
  for (const e of entradas) zip.file(e.nombre, e.bytes);
  const blob = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `CVs_alumnos_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { incluidos: entradas.length, sinCV };
}
