import { useCallback, useEffect, useState } from 'react';
import type { Enlace } from '../lib/enlaces.ts';

const EVENTO = 'ffe:enlaces-cambiados';

/**
 * Avisa de que los enlaces han cambiado. La cabecera los vuelve a pedir, y
 * asi el icono aparece al guardar el primero (o desaparece al borrar el
 * ultimo) sin tener que recargar la aplicacion.
 */
export const avisarEnlacesCambiados = () => window.dispatchEvent(new Event(EVENTO));

/** Los enlaces personalizados, al dia con lo que se guarda en Configuracion. */
export function useEnlaces() {
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/enlaces');
      setEnlaces(res.ok ? await res.json() : []);
    } catch {
      setEnlaces([]);
    }
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO, cargar);
    return () => window.removeEventListener(EVENTO, cargar);
  }, [cargar]);

  return { enlaces, cargar };
}
