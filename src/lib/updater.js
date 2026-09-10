// =====================================================================
// Gestor FFE - Actualizador automático para el target PORTABLE (Windows)
// =====================================================================
// Mecánica:
//   1. Al arrancar la app (solo empaquetada) se consulta el release
//      "latest" de tu repositorio de GitHub.
//   2. Si la etiqueta (tag = v{version}) es mayor que la versión actual,
//      se descarga el .exe portable a %TEMP%\gestor-ffe-update.
//   3. El usuario confirma en la interfaz -> se lanza el exe nuevo como
//      proceso auxiliar (--ffapply-update), que espera al cierre de la
//      app, renombra el exe activo a ".old", se copia a sí mismo en su
//      lugar y relanza la aplicación.
// =====================================================================
import { app, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

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
  Accept: 'application/vnd.github+json',
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
async function getAuthHeaders() {
  const headers = { ...GH_HEADERS_BASE };
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

const portableFilePath = () =>
  process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;

// ─────────────────────────────────────────────────────────────────────
// Utilidades de versión (semver-lite, tolera prereleases: 0.1.0-alpha)
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
// GitHub
// ─────────────────────────────────────────────────────────────────────
export function isUpdateHelper() {
  return process.argv.includes('--ffapply-update');
}

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

// ─────────────────────────────────────────────────────────────────────
// Descarga con progreso
// ─────────────────────────────────────────────────────────────────────
async function downloadUpdate(url, dest, onProgress) {
  const res = await net.fetch(url, { headers: await getAuthHeaders() });
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
function savePending(version, exePath) {
  try {
    fs.writeFileSync(pendingFile(), JSON.stringify({ version, exePath }));
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
// Flujo principal de comprobación (solo app empaquetada)
// ─────────────────────────────────────────────────────────────────────
export async function checkForUpdates({ send } = {}) {
  try {
    // Al arrancar con normalidad: si quedó un ".old" de una actualización
    // aplicada con éxito, lo borramos (rollback ya no necesario).
    cleanupRollback();

    if (!UPDATE_CONFIG.owner || !UPDATE_CONFIG.repo || UPDATE_CONFIG.repo.startsWith('RELLENA')) {
      return;
    }

    send && send({ state: 'checking' });

    const release = await fetchLatestRelease();
    if (!release) return send && send({ state: 'none' });

    const tagVersion = String(release.tag_name || '').replace(/^v/, '');
    if (!tagVersion || compareVersions(tagVersion, app.getVersion()) <= 0) {
      return send && send({ state: 'none' });
    }

    const asset = findPortableAsset(release.assets);
    if (!asset) return send && send({ state: 'none' });

    // Reutilizamos una descarga previa del mismo candidato
    const pending = readPending();
    if (pending && pending.version === tagVersion && fs.existsSync(pending.exePath)) {
      return send && send({ state: 'ready', version: tagVersion });
    }

    const dest = path.join(tmpDir(), `${tagVersion}.exe`);
    send && send({ state: 'downloading', version: tagVersion, received: 0, total: 0 });
    await downloadUpdate(asset.browser_download_url, dest, (received, total) => {
      send && send({ state: 'downloading', version: tagVersion, received, total });
    });

    savePending(tagVersion, dest);
    send && send({ state: 'ready', version: tagVersion });
  } catch (err) {
    console.error('[updater] error en la comprobación', err);
    send && send({ state: 'error', message: String(err && err.message || err) });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Aplicar: lanza el exe nuevo como helper y cierra la app
// ─────────────────────────────────────────────────────────────────────
export function applyUpdateAndRestart() {
  const pending = readPending();
  if (!pending || !fs.existsSync(pending.exePath)) return false;

  const target = portableFilePath();
  const args = [
    '--ffapply-update',
    `--fftarget=${target}`,
    `--ffpid=${process.pid}`,
  ];
  const child = spawn(pending.exePath, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, FF_APPLY_UPDATE: '1' },
  });
  child.unref();
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Modo helper: el EXE NUEVO se ejecuta con --ffapply-update y sustituye
// al viejo. Solo sustituye el archivo .exe portable; la carpeta (con la
// BBDD) queda intacta.
// ─────────────────────────────────────────────────────────────────────
export async function applyUpdateHelper() {
  const args = process.argv;
  const target = args.find((a) => a.startsWith('--fftarget='))?.split('=')[1];
  const pid = Number(args.find((a) => a.startsWith('--ffpid='))?.split('=')[1] || 0);

  if (!target) throw new Error('Falta --fftarget');

  await app.whenReady();

  // 1. Esperamos a que el proceso padre (la app vieja) haya terminado.
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) break;
    await sleep(500);
  }

  // 2. Renombramos el exe activo (con reintentos: Windows puede tardar
  //    en liberar el archivo tras el cierre).
  const old = `${target}.old`;
  await renameWithRetry(target, old);

  // 3. Nos copiamos a nosotros mismos (el exe nuevo) al destino.
  try {
    fs.copyFileSync(process.execPath, target);
  } catch (err) {
    // Rollback: restauramos la versión anterior
    try { if (fs.existsSync(old)) fs.renameSync(old, target); } catch { /* noop */ }
    throw err;
  }

  // 4. El .old sirve de respaldo; se eliminará en el próximo arranque OK.
  clearPending();

  // 5. Relanzamos la app actualizada.
  const child = spawn(target, [], { detached: true, stdio: 'ignore' });
  child.unref();
}

function isProcessAlive(pid) {
  if (!pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err && err.code === 'EPERM';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renameWithRetry(from, to, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(to)) fs.unlinkSync(to);
      fs.renameSync(from, to);
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleep(800);
    }
  }
}

export function cleanupRollback() {
  try {
    const old = `${portableFilePath()}.old`;
    if (fs.existsSync(old)) fs.unlinkSync(old);
  } catch { /* noop */ }
}