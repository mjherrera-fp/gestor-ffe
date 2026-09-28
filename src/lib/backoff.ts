//  ESPERA PROGRESIVA AL DESBLOQUEAR LA BASE DE DATOS
//
//  El servidor escucha solo en 127.0.0.1, pero eso no impide adivinar la
//  contraseña: cualquier proceso local puede llamar a POST /api/auth/unlock
//  tantas veces como quiera. Lo que se añade aquí no es autenticación, sino
//  coste: tras cada fallo se espera un tiempo creciente antes de volver a
//  comparar la contraseña, de modo que probar miles de combinaciones deja de
//  ser instantáneo.
//
//  Extracción literal, pero pura: toda la aritmética vive en funciones sin
//  estado para poder testearla sin levantar servidor ni base de datos. El
//  servidor solo conserva el contador y delega el cálculo.
//
//  El retardo tiene tope a propósito. La base de datos es local y no hay
//  recuperación de contraseña: si el retardo creciera sin límite, quien
//  olvidase su clave se quedaría sin acceso permanente a sus propios datos y no
//  habría forma de volver. Con el tope, el peor caso son 30 s entre intentos,
//  suficiente para que el adivinado en línea deje de compensar, y siempre se
//  puede reintentar.

/** Espera tras el primer fallo, en milisegundos. */
export const ESPERA_INICIAL_MS = 500;

/** Tope de la espera. Ver la nota de arriba sobre por qué no crece sin límite. */
export const ESPERA_MAXIMA_MS = 30_000;

export type EstadoBackoff = {
  /** Número de intentos fallidos consecutivos. */
  fallos: number;
  /** Marca de tiempo del último fallo, o null si no ha habido ninguno. */
  ultimoFallo: number | null;
};

export const ESTADO_INICIAL: EstadoBackoff = { fallos: 0, ultimoFallo: null };

/**
 * Espera que corresponde a un número de fallos dado.
 * 0 -> 0 ms, 1 -> 500 ms, 2 -> 1 s, 3 -> 2 s, 4 -> 4 s, ... y tope de 30 s.
 */
export function calcularEsperaMs(fallos: number): number {
  if (fallos <= 0) return 0;
  return Math.min(ESPERA_INICIAL_MS * Math.pow(2, fallos - 1), ESPERA_MAXIMA_MS);
}

/**
 * Cuánto queda de espera en el momento `ahora`.
 * Devuelve 0 cuando ya se puede volver a intentarlo, incluido el caso en que
 * la espera se cumple justo en este instante.
 */
export function esperaRestanteMs(estado: EstadoBackoff, ahora: number): number {
  if (estado.fallos <= 0 || estado.ultimoFallo === null) return 0;
  const restante = calcularEsperaMs(estado.fallos) - (ahora - estado.ultimoFallo);
  return restante > 0 ? restante : 0;
}

/** Suma un fallo y anota cuándo ocurrió, para que la espera sea medible. */
export function registrarFallo(estado: EstadoBackoff, ahora: number): EstadoBackoff {
  return { fallos: estado.fallos + 1, ultimoFallo: ahora };
}

/**
 * Reinicia el contador. Solo debe llamarse tras un desbloqueo correcto:
 * si también se llamara al bloquear, un atacante podría alternar
 * /api/auth/lock y /api/auth/unlock para anular la espera en cada intento.
 */
export function registrarExito(): EstadoBackoff {
  return { ...ESTADO_INICIAL };
}
