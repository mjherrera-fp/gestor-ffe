/**
 * Seleccion de filas para las operaciones masivas (Alumnos y Empresas).
 *
 * Solo se puede tener seleccionado lo que se ve. Al cambiar un filtro, lo que
 * deja de verse sale de la seleccion: una operacion masiva (un correo, un
 * motivo de no realizacion) nunca tiene que alcanzar a filas que el profesor
 * no tiene delante.
 */

export type EstadoSeleccion = 'ninguna' | 'algunas' | 'todas';

/** Quita de la seleccion lo que ya no esta entre los visibles. */
export function podarSeleccion(seleccion: Set<number>, visibles: number[]): Set<number> {
  const vis = new Set(visibles);
  const podada = new Set([...seleccion].filter(id => vis.has(id)));
  // Misma identidad si no cambia nada, para no provocar renders de mas.
  return podada.size === seleccion.size ? seleccion : podada;
}

/** Marca o desmarca un id. */
export function alternarSeleccion(seleccion: Set<number>, id: number): Set<number> {
  const siguiente = new Set(seleccion);
  if (siguiente.has(id)) siguiente.delete(id);
  else siguiente.add(id);
  return siguiente;
}

/** Si estan seleccionados todos los visibles, algunos o ninguno. */
export function estadoSeleccion(seleccion: Set<number>, visibles: number[]): EstadoSeleccion {
  const marcados = visibles.filter(id => seleccion.has(id)).length;
  if (marcados === 0) return 'ninguna';
  return marcados === visibles.length ? 'todas' : 'algunas';
}
