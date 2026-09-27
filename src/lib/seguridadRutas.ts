import path from 'path';

/**
 * Rutas del servidor que exigen el token de sesión.
 *
 * Solo /api y /uploads. Los assets del frontend (index.html, bundles) los
 * carga el BrowserWindow con una navegación normal, que no puede añadir
 * cabeceras, así que exigirlos el token dejaría la app en blanco.
 */
export function esRutaProtegida(url: string, origen: string, token: string): boolean {
  if (!token) return false;
  try {
    const destino = new URL(url, origen);
    // Nunca añadir la cabecera fuera de nuestro origen: el navegador
    // exigiría un preflight CORS que el servidor no contesta y la petición
    // se rompería en lugar de protegerse.
    if (destino.origin !== new URL(origen).origin) return false;
    return esPrefijo(destino.pathname, '/api') || esPrefijo(destino.pathname, '/uploads');
  } catch {
    return false;
  }
}

function esPrefijo(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(base + '/');
}

/**
 * Resuelve un nombre de fichero pedido por URL contra una carpeta base,
 * garantizando que el resultado no puede salir de ella.
 *
 * Sin esto, `path.resolve(base, '../../secretos.txt')` sale de la carpeta:
 * Express decodifica los parámetros de ruta DESPUÉS de casar con el patrón,
 * así que un %2F..%2FColado en el nombre atravesaba la defensa.
 *
 * Devuelve null si el nombre no es válido.
 */
export function resolverRutaDentro(baseDir: string, nombreArchivo: string): string | null {
  if (!nombreArchivo) return null;
  const base = path.resolve(baseDir);
  // basename elimina cualquier componente de directorio; la comparación
  // posterior es la segunda barrera, por si basename devolviera '..'.
  const destino = path.resolve(base, path.basename(nombreArchivo));
  if (!destino.startsWith(base + path.sep)) return null;
  return destino;
}
