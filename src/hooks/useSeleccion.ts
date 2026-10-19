import { useCallback, useEffect, useMemo, useState } from 'react';
import { alternarSeleccion, estadoSeleccion, podarSeleccion } from '../lib/seleccion.ts';

/**
 * Seleccion sobre una lista visible (ya filtrada). Ver `src/lib/seleccion.ts`.
 *
 * `visibles` debe ser estable entre renders (un `useMemo`), porque cada lista
 * nueva vuelve a podar la seleccion.
 */
export function useSeleccion<T extends { id?: number }>(visibles: T[]) {
  const [ids, setIds] = useState<Set<number>>(() => new Set());

  const idsVisibles = useMemo(
    () => visibles.map(v => v.id).filter((id): id is number => typeof id === 'number'),
    [visibles]
  );

  useEffect(() => {
    setIds(prev => podarSeleccion(prev, idsVisibles));
  }, [idsVisibles]);

  const alternar = useCallback((id: number) => setIds(prev => alternarSeleccion(prev, id)), []);
  const seleccionarTodas = useCallback(() => setIds(new Set(idsVisibles)), [idsVisibles]);
  const seleccionarNinguna = useCallback(() => setIds(new Set()), []);

  const seleccionadas = useMemo(
    () => visibles.filter(v => v.id !== undefined && ids.has(v.id)),
    [visibles, ids]
  );

  return {
    ids,
    seleccionadas,
    estado: estadoSeleccion(ids, idsVisibles),
    totalVisibles: idsVisibles.length,
    estaSeleccionada: (id?: number) => id !== undefined && ids.has(id),
    alternar,
    seleccionarTodas,
    seleccionarNinguna,
  };
}

export type Seleccion = ReturnType<typeof useSeleccion>;
