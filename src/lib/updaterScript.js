// =====================================================================
// Gestor FFE - Partes del actualizador sin dependencias de Electron
// =====================================================================
// Aquí está lo que se puede probar sin arrancar Electron: la comparación
// de versiones, el script .cmd que sustituye el exe portable y la lectura
// del resultado que ese script deja para el siguiente arranque (GF-77).
//
// OJO: este fichero va dentro del .exe (package.json -> build.files).
// =====================================================================

// ─────────────────────────────────────────────────────────────────────
// Versiones (semver-lite, tolera prereleases: 0.1.0-alpha)
// ─────────────────────────────────────────────────────────────────────
function parseVersion(v) {
  const m = String(v ?? '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] || '' };
}

function comparePrerelease(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1; // release > prerelease
  if (!b) return -1;
  const pa = a.split('.');
  const pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) return Number(x) - Number(y);
    if (xNum) return -1; // numérico < alfanumérico
    if (yNum) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

// >0 si a > b, 0 si igual, <0 si a < b
export function compareVersions(a, b) {
  const pa = parseVersion(a) || { nums: [0, 0, 0], pre: '' };
  const pb = parseVersion(b) || { nums: [0, 0, 0], pre: '' };
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i];
  }
  return comparePrerelease(pa.pre, pb.pre);
}

// ─────────────────────────────────────────────────────────────────────
// Script que aplica la actualización
// ─────────────────────────────────────────────────────────────────────
// El exe portable es un lanzador: descomprime la app en %TEMP% y espera a
// que se cierre para borrar esa carpeta. Mientras tanto el exe sigue
// abierto y NO se puede borrar ni sobrescribir, aunque la app ya se haya
// cerrado. Antes el script lo intentaba una sola vez: el borrado fallaba
// en silencio, el "move" tambien, y como en la carpeta seguía habiendo un
// GestorFFE.exe (el antiguo) daba la sustitución por buena y relanzaba la
// versión vieja, sin avisar de nada.
//
// Ahora:
//   1. Espera al cierre de la app (PID).
//   2. Aparta el exe antiguo a "<exe>.old", reintentando hasta que el
//      lanzador lo suelte (rename falla mientras esté abierto).
//   3. Mueve el nuevo y COMPRUEBA que se ha movido (el temporal ya no
//      está y el destino sí). Si no, devuelve el antiguo a su sitio.
//   4. Deja el resultado en un JSON que la app lee al arrancar para decir
//      si la actualización se completó o por qué falló.
//   5. Relanza el exe que haya quedado (el nuevo o, si falló, el antiguo).
// El "<exe>.old" lo borra la app al arrancar (cleanupRollback).

export const MOTIVOS_FALLO = {
  bloqueado: 'No se pudo sustituir el ejecutable porque seguía en uso. Vuelve a intentarlo; si se repite, cierra la aplicación, espera unos segundos y actualiza de nuevo.',
  mover: 'No se pudo copiar la versión nueva en la carpeta de la aplicación. Se ha mantenido la versión anterior.',
  'sin-descarga': 'No se encontró la versión descargada. Vuelve a descargarla.',
};

/** Escapado mínimo para un valor dentro de un .cmd: '%' -> '%%', '&' -> '^&'. */
// "timeout" falla sin consola (el script se lanza oculto y sin stdin:
// "No se admite la redirección de entrada") y no espera nada; con él los
// reintentos se agotaban en un instante. ping espera ~1 s por paquete.
const ESPERA_1S = 'ping -n 2 127.0.0.1 >nul';

const esc = (s) => String(s).replace(/%/g, '%%').replace(/&/g, '^&');

/**
 * @param {object} p
 * @param {string} p.app      exe portable en uso (el lanzador)
 * @param {string} p.final    dónde debe quedar el exe nuevo
 * @param {string} p.nuevo    exe nuevo descargado
 * @param {string} p.resultado JSON con el resultado para el siguiente arranque
 * @param {string} p.version  versión que se instala
 * @param {number} p.pid      PID de la app que hay que esperar
 * @param {number} [p.intentos=90] segundos reintentando apartar el exe antiguo
 * @param {boolean} [p.relanzar=true] abrir la app al terminar (false en tests)
 */
export function scriptAplicar({ app, final, nuevo, resultado, version, pid, intentos = 90, relanzar = true }) {
  const json = (ok, motivo) =>
    `> "%RESULT%" echo {"ok":${ok},"version":"%VER%"${motivo ? `,"motivo":"${motivo}"` : ''}}`;
  const lanzar = (variable) => (relanzar ? `start "" "%${variable}%"` : 'rem sin relanzar');

  return [
    '@echo off',
    'setlocal',
    `set "APP=${esc(app)}"`,
    `set "OLD=${esc(app)}.old"`,
    `set "FINAL=${esc(final)}"`,
    `set "NEW=${esc(nuevo)}"`,
    `set "RESULT=${esc(resultado)}"`,
    `set "VER=${esc(version)}"`,
    `set "PID=${Number(pid) || 0}"`,
    '',
    // Entorno limpio para que el SFX recalcule sus propias variables (con
    // las heredadas fallaba: "Invalid file descriptor to ICU data received").
    'set "PORTABLE_EXECUTABLE_FILE="',
    'set "PORTABLE_EXECUTABLE_DIR="',
    'set "PORTABLE_EXECUTABLE_APP_FILENAME="',
    '',
    // 1) Espera al cierre de la app. Tope ~60 s; después, cierre forzoso.
    'set /a w=0',
    ':wait',
    'powershell -NoProfile -Command "if (Get-Process -Id %PID% -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"',
    'if not errorlevel 1 goto apartar',
    'set /a w+=1',
    'if %w% GEQ 60 goto force',
    ESPERA_1S,
    'goto wait',
    ':force',
    'powershell -NoProfile -Command "Stop-Process -Id %PID% -Force -ErrorAction SilentlyContinue"',
    'ping -n 4 127.0.0.1 >nul',
    '',
    // 2) Apartar el exe antiguo hasta que el lanzador lo suelte.
    ':apartar',
    'if exist "%NEW%" goto apartar_previo',
    json(false, 'sin-descarga'),
    'goto relanzar_antiguo',
    ':apartar_previo',
    'if exist "%OLD%" del /f /q "%OLD%" >nul 2>&1',
    'set /a r=0',
    ':apartar_bucle',
    'if not exist "%APP%" goto mover',
    'move /y "%APP%" "%OLD%" >nul 2>&1',
    'if not exist "%APP%" goto mover',
    'set /a r+=1',
    `if %r% GEQ ${Number(intentos) || 90} goto bloqueado`,
    ESPERA_1S,
    'goto apartar_bucle',
    '',
    // 3) Mover el nuevo y comprobar que de verdad se ha movido.
    ':mover',
    'move /y "%NEW%" "%FINAL%" >nul 2>&1',
    'if exist "%NEW%" goto no_movido',
    'if not exist "%FINAL%" goto no_movido',
    json(true),
    lanzar('FINAL'),
    'goto end',
    '',
    ':no_movido',
    // Se devuelve el antiguo a su sitio para no dejar la carpeta sin app.
    'if not exist "%APP%" if exist "%OLD%" move /y "%OLD%" "%APP%" >nul 2>&1',
    json(false, 'mover'),
    'goto relanzar_antiguo',
    '',
    ':bloqueado',
    json(false, 'bloqueado'),
    '',
    ':relanzar_antiguo',
    `if exist "%APP%" ${lanzar('APP')}`,
    '',
    ':end',
    'endlocal',
    // Al final de todo: el script se borra a sí mismo.
    '(goto) 2>nul & del /f /q "%~f0"',
  ].join('\r\n');
}

// ─────────────────────────────────────────────────────────────────────
// Resultado para el siguiente arranque
// ─────────────────────────────────────────────────────────────────────
/**
 * Convierte lo que dejó el script en el estado que se enseña al arrancar.
 * Devuelve null si no hay nada que contar.
 *
 * @param {string|null} contenido   texto del JSON (o null si no existe)
 * @param {string} versionActual    app.getVersion()
 */
export function interpretarResultado(contenido, versionActual) {
  if (!contenido) return null;
  let r;
  try {
    r = JSON.parse(String(contenido).replace(/^﻿/, '').trim());
  } catch {
    return null;
  }
  if (!r || typeof r !== 'object') return null;
  const version = String(r.version || '');

  if (r.ok) {
    // El script dice que lo ha sustituido: se confirma con la versión que
    // de verdad está corriendo.
    if (version && compareVersions(versionActual, version) >= 0) {
      return { state: 'updated', version: versionActual };
    }
    return {
      state: 'apply-error',
      version,
      message: `La aplicación se ha reiniciado, pero sigue en la versión ${versionActual}.`,
    };
  }
  return {
    state: 'apply-error',
    version,
    message: MOTIVOS_FALLO[r.motivo] || 'La actualización no se pudo completar.',
  };
}
