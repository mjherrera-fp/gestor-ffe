import { useEffect, useSyncExternalStore } from 'react';
import type { EstadoEnvioEmail } from '../lib/envioEmail.ts';

/**
 * Si se pueden enviar correos (GF-76), compartido por toda la aplicacion.
 *
 * Se pide una vez al servidor y se guarda aqui; Configuracion -> Correo
 * llama a `recargarEnvioEmail()` al cambiar el interruptor o los datos SMTP y
 * todas las vistas se actualizan sin recargar. Mientras no se sabe, se toma
 * como deshabilitado: es lo que hay por defecto y asi no aparecen botones de
 * correo que luego se esconden.
 */

const DESHABILITADO: EstadoEnvioEmail = { activo: false, configurado: false, habilitado: false };

let estado: EstadoEnvioEmail = DESHABILITADO;
let pedido = false;
const oyentes = new Set<() => void>();

const fijar = (nuevo: EstadoEnvioEmail) => {
  estado = nuevo;
  oyentes.forEach(o => o());
};

export async function recargarEnvioEmail(): Promise<EstadoEnvioEmail> {
  pedido = true;
  try {
    const res = await fetch('/api/email/estado');
    if (!res.ok) pedido = false; // se reintenta en el siguiente montaje
    fijar(res.ok ? await res.json() : DESHABILITADO);
  } catch {
    pedido = false;
    fijar(DESHABILITADO);
  }
  return estado;
}

/** Activa o desactiva el envio. La configuracion SMTP no se toca. */
export async function cambiarEnvioEmail(activo: boolean): Promise<EstadoEnvioEmail> {
  const res = await fetch('/api/email/estado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) throw new Error('No se pudo guardar');
  fijar(await res.json());
  return estado;
}

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
};

export function useEnvioEmail(): EstadoEnvioEmail {
  const actual = useSyncExternalStore(suscribir, () => estado);
  useEffect(() => { if (!pedido) recargarEnvioEmail(); }, []);
  return actual;
}

/** Atajo: true si se muestran las opciones de envio de correo. */
export const useEmailHabilitado = () => useEnvioEmail().habilitado;
