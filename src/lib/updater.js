// =====================================================================
// Gestor FFE - Actualizador automático para el target PORTABLE (Windows)
// =====================================================================
// Mecánica:
//   1. Al arrancar la app (solo empaquetada) el renderer pide la
//      comprobación (updater-check) y se consulta el release "latest"
//      de tu repositorio de GitHub.
//   2. Si la etiqueta (tag = v{version}) es mayor que la versión actual,
//      se avisa del nueva versión disponible (SIN descargar nada).
//   3. El usuario confirma -> se descarga el .exe portable a
//      %TEMP%\gestor-ffe-update como fichero aparte (nunca se sobrescribe
//      el exe actual mientras está en ejecución).
//   4. "Reiniciar y actualizar" escribe un script .cmd independiente que
//      espera el cierre de la app, aparta el exe antiguo, mueve el nuevo a
//      la carpeta portable y relanza la app (ver updaterScript.js).
//   5. Al arrancar se lee el resultado que dejó el script y se avisa de si
//      la actualización se completó o por qué falló (GF-77).
// =====================================================================
import { app, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { compareVersions, interpretarResultado, scriptAplicar } from './updaterScript.js';

export { compareVersions };

// ─────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN: rellena owner/repo antes de empaquetar
// ─────────────────────────────────────────────────────────────────────
export const UPDATE_CONFIG = {
  owner: 'mjherrera-fp',
  repo: 'gestor-ffe',
};

const GH_LATEST_URL = () =>
  `https://api.github.com/repos/${UPDATE_CONFIG.owner}/${UPDATE_CONFIG.repo}/releases/latest`;

const GH_HEADERS_BASE = {
  'User-Agent': 'gestor-ffe-updater/0.1.0',
};

// ─────────────────────────────────────────────────────────────────────
// Autenticación para repos PRIVADOS.
// El token NUNCA se guarda en el repositorio de Git: se lee (en este
// orden) de:
//   1. Variables de entorno GH_TOKEN / GITHUB_TOKEN.
//   2. El fichero local src/lib/update-secret.js (git-ignored), que es
//      el que electron-builder incluye dentro del .exe al empaquetar.
// Si no existe token (repo público), la petición es anónima.
// ⚠️ El token viaja DENTRO del binario distribuido (extraíble): usa un
//    Fine-grained PAT de SOLO LECTURA y acotado únicamente a este repo.
// ─────────────────────────────────────────────────────────────────────
async function getAuthHeaders({ download = false } = {}) {
  const headers = {
    ...GH_HEADERS_BASE,
    // La API de GitHub exige este Accept salvo para recuperar el binario
    // de un asset del release (entonces se usa application/octet-stream).
    Accept: download ? 'application/octet-stream' : 'application/vnd.github+json',
  };
  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  if (!token) {
    try {
      const secret = await import('./update-secret.js');
      if (secret && secret.UPDATE_TOKEN) token = secret.UPDATE_TOKEN;
    } catch {
      // Archivo opcional: sin él (repo público) se usa anónimo.
    }
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const UPDATE_SUBDIR = 'gestor-ffe-update';

const tmpDir = () => path.join(app.getPath('temp'), UPDATE_SUBDIR);
const pendingFile = () => path.join(app.getPath('userData'), 'update-pending.json');
const resultFile = () => path.join(app.getPath('userData'), 'update-result.json');

const portableFilePath = () =>
  process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;

// ─────────────────────────────────────────────────────────────────────
// GitHub
// ─────────────────────────────────────────────────────────────────────
async function fetchLatestRelease() {
  const res = await net.fetch(GH_LATEST_URL(), { headers: await getAuthHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
  return res.json();
}

function findPortableAsset(assets = []) {
  return assets.find((a) =>
    a.name &&
    a.name.toLowerCase().includes('gestor') && // producto
    a.name.endsWith('.exe') &&
    !/setup/i.test(a.name) // descarta el instalador NSIS si algún día existe
  );
}

// En repos privados, asset.browser_download_url devuelve 404 incluso con
// token; el camino fiable es el endpoint de la API, que responde 302 hacia
// una URL firmada (release-assets.githubusercontent.com) sin necesidad de
// autenticación en el destino final.
function assetApiUrl(asset) {
  return `https://api.github.com/repos/${UPDATE_CONFIG.owner}/${UPDATE_CONFIG.repo}/releases/assets/${asset.id}`;
}

// ─────────────────────────────────────────────────────────────────────
// Descarga con progreso
// ─────────────────────────────────────────────────────────────────────
async function downloadUpdate(url, dest, onProgress) {
  const res = await net.fetch(url, { headers: await getAuthHeaders({ download: true }) });
  if (!res.ok) throw new Error(`Descarga falló (HTTP ${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const ws = fs.createWriteStream(part);
  const reader = res.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    ws.write(Buffer.from(value));
    onProgress(received, total);
  }
  await new Promise((resolve, reject) => {
    ws.on('error', reject);
    ws.end(resolve);
  });
  fs.renameSync(part, dest);
}

// ─────────────────────────────────────────────────────────────────────
// Marca de actualización pendiente (sobrevive a reinicios guardados)
// ─────────────────────────────────────────────────────────────────────
function savePending(version, exePath, fileName) {
  try {
    fs.writeFileSync(pendingFile(), JSON.stringify({ version, exePath, fileName }));
  } catch (err) {
    console.error('[updater] no se pudo guardar la marca pendiente', err);
  }
}

function readPending() {
  try {
    return JSON.parse(fs.readFileSync(pendingFile(), 'utf8'));
  } catch {
    return null;
  }
}

function clearPending() {
  try { fs.unlinkSync(pendingFile()); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────
// Candidato a actualización (se resuelve una vez y se reutiliza)
// ─────────────────────────────────────────────────────────────────────
let latestCandidate = null;

async function resolveLatestCandidate() {
  if (latestCandidate) return latestCandidate;
  const release = await fetchLatestRelease();
  if (!release) return null;
  const tagVersion = String(release.tag_name || '').replace(/^v/, '');
  const asset = findPortableAsset(release.assets);
  if (tagVersion && compareVersions(tagVersion, app.getVersion()) > 0 && asset) {
    latestCandidate = {
      version: tagVersion,
      url: assetApiUrl(asset),
      fileName: path.basename(asset.name),
      releaseUrl: release.html_url,
    };
  }
  return latestCandidate;
}

// ─────────────────────────────────────────────────────────────────────
// Comprobación al arrancar: SOLO avisa (no descarga nada)
// ─────────────────────────────────────────────────────────────────────
export async function checkForUpdates({ send } = {}) {
  try {
    // Al arrancar con normalidad: si quedó un ".old" de una actualización
    // aplicada con éxito, lo borramos (rollback ya no necesario).
    cleanupRollback();

    // Si se acaba de aplicar una actualización, se dice cómo ha ido. Con el
    // aviso en pantalla no se sigue comprobando: si falló, la descarga sigue
    // pendiente y el propio aviso permite reintentar.
    const resultado = leerResultadoArranque();
    if (resultado) {
      resultadoArranque = null; // solo se enseña una vez
      return send && send(resultado);
    }

    if (!UPDATE_CONFIG.owner || !UPDATE_CONFIG.repo || UPDATE_CONFIG.repo.startsWith('RELLENA')) {
      return;
    }

    send && send({ state: 'checking' });

    const candidate = await resolveLatestCandidate();
    if (!candidate) return send && send({ state: 'none' });

    // Reutilizamos una descarga previa del mismo candidato
    const pending = readPending();
    if (pending && pending.version === candidate.version && fs.existsSync(pending.exePath)) {
      return send && send({ state: 'ready', version: candidate.version, releaseUrl: candidate.releaseUrl });
    }

    // Hay una versión nueva: avisamos y esperamos a que el usuario apruebe
    send && send({ state: 'available', version: candidate.version, releaseUrl: candidate.releaseUrl });
  } catch (err) {
    console.error('[updater] error en la comprobación', err);
    send && send({ state: 'error', message: String((err && err.message) || err) });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Descarga (solo cuando el usuario lo confirma desde el aviso)
// ─────────────────────────────────────────────────────────────────────
export async function startAvailableDownload({ send } = {}) {
  try {
    const candidate = await resolveLatestCandidate();
    if (!candidate) return send && send({ state: 'none' });

    const pending = readPending();
    if (pending && pending.version === candidate.version && fs.existsSync(pending.exePath)) {
      return send && send({ state: 'ready', version: candidate.version, releaseUrl: candidate.releaseUrl });
    }

    const fileName = candidate.fileName || `${candidate.version}.exe`;
    const dest = path.join(tmpDir(), fileName);
    send && send({ state: 'downloading', version: candidate.version, releaseUrl: candidate.releaseUrl, received: 0, total: 0 });
    await downloadUpdate(candidate.url, dest, (received, total) => {
      send && send({ state: 'downloading', version: candidate.version, releaseUrl: candidate.releaseUrl, received, total });
    });

    savePending(candidate.version, dest, fileName);
    latestCandidate = null;
    send && send({ state: 'ready', version: candidate.version, releaseUrl: candidate.releaseUrl });
  } catch (err) {
    console.error('[updater] error en la descarga', err);
    send && send({ state: 'error', message: String((err && err.message) || err) });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Aplicar actualización (portable): proceso .cmd independiente
// ─────────────────────────────────────────────────────────────────────
// El exe nuevo YA está descargado como fichero aparte y nunca se escribe
// sobre el actual mientras está en uso. El script (updaterScript.js) espera
// al cierre, aparta el exe antiguo reintentando hasta que el lanzador lo
// suelte, mueve el nuevo, comprueba que se ha movido y deja el resultado en
// update-result.json para el siguiente arranque. La BBDD vive en
// PORTABLE_EXECUTABLE_DIR (la carpeta del exe), no depende de su nombre.
function writeApplyScript() {
  const pending = readPending();
  if (!pending || !fs.existsSync(pending.exePath)) return null;

  const target = portableFilePath();
  const fileName = pending.fileName || `${pending.version}.exe`;
  const script = scriptAplicar({
    app: target,
    final: path.join(path.dirname(target), fileName),
    nuevo: pending.exePath,
    resultado: resultFile(),
    version: pending.version,
    pid: process.pid,
  });

  try { fs.unlinkSync(resultFile()); } catch { /* noop */ }
  const bat = path.join(app.getPath('userData'), 'update-apply.cmd');
  fs.writeFileSync(bat, script, 'utf8');
  return bat;
}

// ─────────────────────────────────────────────────────────────────────
// Resultado de la última actualización aplicada (GF-77)
// ─────────────────────────────────────────────────────────────────────
// Se lee una sola vez por arranque: el fichero se borra al leerlo y el
// estado se guarda para enviarlo cuando el renderer pida la comprobación.
let resultadoLeido = false;
let resultadoArranque = null;

function leerResultadoArranque() {
  if (resultadoLeido) return resultadoArranque;
  resultadoLeido = true;
  let contenido = null;
  try { contenido = fs.readFileSync(resultFile(), 'utf8'); } catch { return null; }
  try { fs.unlinkSync(resultFile()); } catch { /* noop */ }
  resultadoArranque = interpretarResultado(contenido, app.getVersion());
  if (resultadoArranque?.state === 'updated') clearPending();
  return resultadoArranque;
}

export function applyUpdateAndRestart() {
  const bat = writeApplyScript();
  if (!bat) return false;
  const child = spawn('cmd.exe', ['/c', bat], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return true;
}

export function cleanupRollback() {
  try {
    const old = `${portableFilePath()}.old`;
    if (fs.existsSync(old)) fs.unlinkSync(old);
  } catch { /* noop */ }
}