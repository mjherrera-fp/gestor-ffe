/**
 * Enlaces personalizados del profesor (Configuracion → Enlaces): se listan
 * en la cabecera y se abren en el navegador por defecto.
 */

export interface Enlace {
  id?: number;
  nombre: string;
  url: string;
  orden?: number;
}

/**
 * La URL lista para guardar, o null si no vale.
 *
 * Solo se admiten http y https: el enlace se abre fuera de la app, y un
 * `javascript:`, `file:` o similar no tiene nada que hacer ahi. Si no lleva
 * esquema ("raices.madrid.org/..."), se le pone https, que es lo que la
 * gente escribe esperando que funcione.
 */
export function normalizarUrl(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;
  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname || !url.hostname.includes('.') && url.hostname !== 'localhost') return null;
  return url.toString();
}

/** Valida un enlace entero; devuelve el error a mostrar, o null si es valido. */
export function errorEnlace(nombre: string, url: string): string | null {
  if (!nombre.trim()) return 'El nombre es obligatorio.';
  if (!url.trim()) return 'La URL es obligatoria.';
  if (!normalizarUrl(url)) return 'La URL no es válida. Debe ser una dirección web (http o https).';
  return null;
}
