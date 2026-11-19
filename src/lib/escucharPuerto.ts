import type { EventEmitter } from 'events';

/**
 * Errores por los que un puerto no se puede usar y hay que probar otro:
 *
 *  - EADDRINUSE: lo tiene otro programa.
 *  - EACCES: Windows lo tiene reservado. Hyper-V, WSL y Docker reservan
 *    bloques de unos 100 puertos que cambian al arrancar (se ven con
 *    `netsh interface ipv4 show excludedportrange protocol=tcp`). Cuando el
 *    3000 caia dentro, el servidor terminaba y la app se cerraba sin abrir
 *    ninguna ventana ni dar ningun error (GF-72).
 */
const NO_DISPONIBLE = new Set(['EADDRINUSE', 'EACCES']);

export const puertoNoDisponible = (err: unknown): boolean =>
  NO_DISPONIBLE.has((err as { code?: string } | null)?.code ?? '');

/** Lo minimo que hace falta de un servidor de Node para escuchar. */
export interface ServidorEscuchando extends EventEmitter {
  address(): unknown;
}

export interface OpcionesEscucha {
  /** Puertos a probar en orden. Si ninguno vale, se pide uno al sistema (0). */
  candidatos: number[];
  /** Crea el servidor escuchando en el puerto (p. ej. `p => app.listen(p, host)`). */
  escuchar: (puerto: number) => ServidorEscuchando;
  /** Ya escucha: puerto real (el asignado por el sistema si se pidio el 0). */
  alEscuchar: (puerto: number) => void;
  /** No hay forma de escuchar: error que no es de puerto, o ni el sistema da uno. */
  alFallar: (err: unknown) => void;
  aviso?: (mensaje: string) => void;
  /** Espera entre intentos si el puerto estaba ocupado (no si estaba reservado). */
  esperaMs?: number;
}

/** Escucha en el primer puerto disponible de la lista, o en uno del sistema. */
export function escucharEnPrimerPuertoLibre({
  candidatos, escuchar, alEscuchar, alFallar, aviso = () => {}, esperaMs = 400,
}: OpcionesEscucha): void {
  const intentar = (puerto: number, pendientes: number[]): void => {
    const servidor = escuchar(puerto);
    servidor.once('listening', () => {
      const direccion = servidor.address() as { port?: number } | null;
      alEscuchar(direccion?.port ?? puerto);
    });
    servidor.once('error', (err: unknown) => {
      if (!puertoNoDisponible(err)) {
        alFallar(err);
        return;
      }
      const reservado = (err as { code?: string }).code === 'EACCES';
      const motivo = reservado ? 'reservado por el sistema' : 'ocupado';
      // Un puerto ocupado puede quedar libre en un momento; uno reservado no,
      // asi que con el se pasa al siguiente sin esperar.
      const espera = reservado ? 0 : esperaMs;
      if (pendientes.length > 0) {
        aviso(`Puerto ${puerto} ${motivo}; probando el siguiente...`);
        setTimeout(() => intentar(pendientes[0], pendientes.slice(1)), espera);
      } else if (puerto !== 0) {
        // Ultimo recurso: el sistema asigna uno libre que no este reservado.
        aviso(`Puerto ${puerto} ${motivo} y no quedan candidatos; pidiendo uno al sistema.`);
        setTimeout(() => intentar(0, []), espera);
      } else {
        alFallar(err);
      }
    });
  };

  if (candidatos.length === 0) intentar(0, []);
  else intentar(candidatos[0], candidatos.slice(1));
}
