import {describe, it, expect} from 'vitest';
import path from 'path';
import {esRutaProtegida, resolverRutaDentro} from '../src/lib/seguridadRutas.ts';

const ORIGEN = 'http://localhost:3000/';
const TOKEN = 'a'.repeat(64);

describe('esRutaProtegida', () => {
  it('exige token a las rutas de la API', () => {
    expect(esRutaProtegida('/api/alumnos', ORIGEN, TOKEN)).toBe(true);
    expect(esRutaProtegida('/api', ORIGEN, TOKEN)).toBe(true);
    expect(esRutaProtegida('/api/documentos/relacion/7/download', ORIGEN, TOKEN)).toBe(true);
  });

  it('exige token a /uploads', () => {
    expect(esRutaProtegida('/uploads/cv.pdf', ORIGEN, TOKEN)).toBe(true);
    expect(esRutaProtegida('/uploads', ORIGEN, TOKEN)).toBe(true);
  });

  it('acepta URLs absolutas del mismo origen', () => {
    expect(esRutaProtegida('http://localhost:3000/api/profesor', ORIGEN, TOKEN)).toBe(true);
  });

  it('NO exige token a los assets del frontend', () => {
    // El BrowserWindow los carga con una navegación normal, sin cabeceras:
    // si exigieran token, la aplicación arrancaría en blanco.
    expect(esRutaProtegida('/', ORIGEN, TOKEN)).toBe(false);
    expect(esRutaProtegida('/index.html', ORIGEN, TOKEN)).toBe(false);
    expect(esRutaProtegida('/assets/index-abc123.js', ORIGEN, TOKEN)).toBe(false);
  });

  it('nunca filtra el token a otro origen', () => {
    // Añadir la cabecera aquí provocaría un preflight CORS que el servidor
    // no contesta, así que la petición se rompería en lugar de protegerse.
    expect(esRutaProtegida('https://api.github.com/repos', ORIGEN, TOKEN)).toBe(false);
    expect(esRutaProtegida('http://otro-local:3000/api/alumnos', ORIGEN, TOKEN)).toBe(false);
    expect(esRutaProtegida('http://localhost:4000/api/alumnos', ORIGEN, TOKEN)).toBe(false);
  });

  it('no confunde un prefijo con una ruta real', () => {
    // "/apipepe" no es "/api": con un startsWith ingenuo se colaría el token
    // a un endpoint que no lo exige y, peor, se perdería en rutas reales.
    expect(esRutaProtegida('/apikeys', ORIGEN, TOKEN)).toBe(false);
    expect(esRutaProtegida('/uploads-backup/x', ORIGEN, TOKEN)).toBe(false);
  });

  it('sin token no marca nada, para no romper el arranque', () => {
    expect(esRutaProtegida('/api/alumnos', ORIGEN, '')).toBe(false);
  });

  it('no revienta con una URL inválida', () => {
    expect(esRutaProtegida('http://', ORIGEN, TOKEN)).toBe(false);
  });
});

describe('resolverRutaDentro', () => {
  const BASE = path.resolve('uploads');

  it('resuelve un nombre normal dentro de la carpeta', () => {
    expect(resolverRutaDentro(BASE, 'cv.pdf')).toBe(path.join(BASE, 'cv.pdf'));
  });

  it('neutraliza el path traversal con separadores', () => {
    // Express decodifica el parámetro DESPUÉS de casar con el patrón de
    // ruta, así que %2F..%2F sí llegaba como '../../'. El traversal se
    // queda en su último segmento: nunca sale de la carpeta.
    for (const intento of [
      '../../secreto.txt',
      '..%2F..%2Fsecreto.txt',
      '../../../Windows/System32/config/SAM',
      'sub/carpeta/fichero.pdf',
      '....//....//etc/passwd',
    ]) {
      const resultado = resolverRutaDentro(BASE, intento);
      expect(resultado).not.toBeNull();
      expect(resultado!.startsWith(BASE + path.sep)).toBe(true);
    }
  });

  it('reduc el traversal al nombre del fichero, sin perderlo', () => {
    // No basta con rechazar: el usuario tiene que poder ver SU documento.
    expect(resolverRutaDentro(BASE, '../../cv.pdf')).toBe(path.join(BASE, 'cv.pdf'));
  });

  it('devuelve null si el nombre queda fuera', () => {
    expect(resolverRutaDentro(BASE, '')).toBeNull();
    // path.basename('..') es '..', que resolvería en la carpeta PADRE:
    // debe rechazarse en vez de aceptarse como si fuera un fichero.
    expect(resolverRutaDentro(BASE, '..')).toBeNull();
  });
});
