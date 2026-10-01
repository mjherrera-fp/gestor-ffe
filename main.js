import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import {
  checkForUpdates,
  startAvailableDownload,
  applyUpdateAndRestart,
} from './src/lib/updater.js';

// 1. APAGAR ACELERACIÓN POR HARDWARE (Crucial para evitar cuelgues en Windows)
app.disableHardwareAcceleration();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

// Puerto del servidor: sobrescribible con PORT. Producción usa 3000 y
// desarrollo 3100 (debe coincidir con la lógica de server.ts).
const serverPort = Number(process.env.PORT) || (app.isPackaged ? 3000 : 3100);

// Puerto al que realmente se abre la ventana. Empieza siendo el de por
// defecto, pero el servidor puede desplazarse si está ocupado (ver
// listenOnFirstFreePort en server.ts) y lo avisa por IPC.
let ventanaUrl = `http://localhost:${serverPort}`;

// Puerto que el servidor ha comunicado por IPC al quedarse escuchando. Se
// espera a conocerlo antes de dar el arranque por bueno: sondear el puerto de
// por defecto solo fallaría cuando ese lo tenga otro programa.
let puertoInformado = null;

// ─────────────────────────────────────────────────────────────────────
// SEGURIDAD: token de sesión
// ─────────────────────────────────────────────────────────────────────
// Lo genera el proceso principal y lo usan tres consumidores:
//   1. El servidor Express, que lo recibe por entorno al hacer fork.
//   2. El preload, que lo expone al renderer como window.ffeSession.token.
//   3. En desarrollo, un fichero git-ignored, porque Electron y el servidor
//      los lanza 'concurrently' como procesos separados y NO comparten
//      process.env (misma idea que resolveSessionToken() en server.ts, que
//      debe mantenerse sincronizada con esta).
//
// Sin esto, cualquier página web abierta en el navegador del profesor
// podría pedir http://127.0.0.1:3000/api/... y leer o modificar todos sus
// datos de FFP, porque el servidor solo escucha en local pero eso no
// impide el acceso desde el navegador.
// ─────────────────────────────────────────────────────────────────────
// En desarrollo el servidor puede arrancar antes que Electron (de hecho
// 'dev:electron:wait' espera a que el puerto 3100 responda), así que el
// servidor crea el fichero con SU token. Si generáramos el nuestro sin más,
// el renderer enviaría un token que el servidor no conoce y toda la API
// devolvería 401: por eso aquí se ADOPTA el que ya haya en el fichero.
let sessionToken = crypto.randomBytes(32).toString('hex');
const TOKEN_FILE = path.join(__dirname, '.ffe-session-token');

if (!app.isPackaged) {
  try {
    const guardado = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (guardado) {
      sessionToken = guardado;
    } else {
      fs.writeFileSync(TOKEN_FILE, sessionToken, {encoding: 'utf8', mode: 0o600});
    }
  } catch {
    try {
      fs.writeFileSync(TOKEN_FILE, sessionToken, {encoding: 'utf8', mode: 0o600});
    } catch { /* sin fichero, el servidor genera el suyo */ }
  }
}

// FUNCIÓN DE REINTENTO INTELIGENTE
const cargarURLConReintentos = (ventanaPrincipal, splashWindow, url, reintentos = 20) => {
  ventanaPrincipal.loadURL(url).then(() => {
    // ¡ÉXITO! Vite ha respondido. 
    // Cerramos la pantalla de carga y mostramos la aplicación de golpe
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    ventanaPrincipal.show(); // Mostramos la ventana grande
  }).catch((err) => {
    if (reintentos > 0) {
      console.log(`Esperando al servidor en ${url}... (Quedan ${reintentos} intentos)`);
      setTimeout(() => cargarURLConReintentos(ventanaPrincipal, splashWindow, url, reintentos - 1), 500);
    } else {
      console.error('El servidor tardó demasiado en responder a la ventana.');
    }
  });
};

function createWindow() {
  // 1. CREAMOS Y MOSTRAMOS LA PANTALLA DE CARGA INMEDIATAMENTE
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    icon: path.join(__dirname, 'assets/favicon.png'),
    transparent: true,
    frame: false, // Sin bordes ni botones de cerrar
    alwaysOnTop: true, // Siempre visible mientras carga
    webPreferences: { nodeIntegration: false }
  });

  splash.loadFile('splash.html'); // Cargamos tu nuevo diseño

  // 2. CREAMOS LA VENTANA PRINCIPAL (PERO INVISIBLE)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "SGE-FFE: Sistema de Gestión",
    icon: path.join(__dirname, 'assets/favicon.ico'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      nativeWindowOpen: true,
      preload: path.join(__dirname, 'preload.cjs'),
      // El preload solo lo alcanza leyendo process.argv, que es el canal
      // oficial de Electron para pasar secretos sin un IPC bloqueante.
      additionalArguments: [`--ffe-session-token=${sessionToken}`],
    }
  });

  const esLocal = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
    } catch {
      return false;
    }
  };

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!esLocal(url) && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!esLocal(url) && (url.startsWith('https://') || url.startsWith('http://'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // 3. INTENTAMOS CARGAR LA RUTA (Y LE PASAMOS EL SPLASH PARA QUE LO CIERRE AL TERMINAR)
  // Usa ventanaUrl, que puede haberse corregido al recibir el puerto real del
  // servidor por IPC.
  cargarURLConReintentos(mainWindow, splash, ventanaUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  const isDev = !app.isPackaged;

  if (isDev) return;

  // --- AÑADIR ESTO: Calcular la ruta del ejecutable ---
  const baseDir = app.isPackaged
    ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath))
    : __dirname;

  const serverPath = path.join(__dirname, 'dist-server', 'server.js');

  serverProcess = fork(serverPath, [], {
    cwd: baseDir,
    // --- AÑADIR ESTO: Pasar la variable al env ---
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORTABLE_EXECUTABLE_DIR: baseDir,
      // El servidor lo exige en todas las rutas /api y /uploads.
      FFE_SESSION_TOKEN: sessionToken,
    },
    stdio: 'pipe'
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });
  }

  // El servidor comunica en qué puerto ha quedado escuchando. Hace falta
  // porque puede no ser el de por defecto: si el 3000 está ocupado, se mueve
  // al siguiente libre (ver listenOnFirstFreePort en server.ts) y este proceso
  // no tiene forma de adivinarlo salvo que se lo digan.
  serverProcess.on('message', (msg) => {
    if (msg && msg.type === 'ffe-server-ready' && msg.port) {
      puertoInformado = msg.port;
      ventanaUrl = `http://127.0.0.1:${msg.port}`;
    }
  });

  serverProcess.on('exit', (code) => {
    console.error(`El servidor terminó inesperadamente (código ${code}).`);
  });
}

// Espera a que NUESTRO servidor esté listo. No basta con que algo conteste en
// el puerto: si otro programa está escuchando en él (el 3000 está ocupado a
// diario), un simple fetch() daría por bueno un servidor ajeno y la ventana
// mostraría su web en lugar de la nuestra. Por eso se exige la marca que solo
// esta app emite en /ffe-identity.
//
// Se sondea el puerto que el servidor ha dicho por IPC, no el de por defecto:
// si el 3000 lo tiene otro, nuestro servidor escucha en otro sitio y sondear
// solo el 3000 no encontraría nunca nada.
async function waitForServer(timeout = 30000) {
  const inicio = Date.now();

  while (Date.now() - inicio < timeout) {
    // Primero esperamos a que el servidor nos diga dónde escucha.
    if (!puertoInformado) {
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    const url = `http://127.0.0.1:${puertoInformado}`;
    try {
      const res = await fetch(`${url}/ffe-identity`);
      if (res.ok) {
        const info = await res.json();
        if (info && info.app === 'gestor-ffe') {
          ventanaUrl = `http://127.0.0.1:${info.port || puertoInformado}`;
          return true;
        }
      }
    } catch {
      // Ha dicho el puerto pero aún no acepta conexiones: se reintenta.
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return false;
}

// Envía el estado del actualizador a la ventana principal
function sendUpdateStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-status', status);
  }
}

// Instancia única: abrir el .exe dos veces dejaba DOS procesos forkeando
// servidor y queriendo escribir en la misma BBDD SQLCipher, con el
// "database is locked" como síntoma. El segundo proceso se cierra y le
// cede el sitio al primero.
const tieneLock = app.requestSingleInstanceLock();

if (!tieneLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // NUEVO CICLO DE VIDA (Más estable que app.on('ready'))
  app.whenReady().then(async () => {
    startServer();

    if (app.isPackaged) {
      // Producción: Esperamos a nuestro propio servidor forkeado
      const serverReady = await waitForServer();
      if (serverReady) {
        createWindow();
        // La comprobación de actualizaciones la dispara el renderer al montar
        // (UpdaterProvider -> updater-check), no un timer del proceso principal.
      } else {
        // waitForServer solo devuelve true si quien contesta es NUESTRO
        // servidor. Si el puerto está tomado por otro programa, la identidad
        // no cuadra y aquí se avisa en vez de abrir una ventana con la web
        // ajena de fondo.
        console.error(
          'No se pudo confirmar el arranque del servidor en el puerto ' +
            `${serverPort}. Puede que otro programa lo este usando.`
        );
        app.quit();
      }
    } else {
      // Desarrollo: Creamos la ventana y dejamos que use sus propios reintentos
      // mientras Vite termina de compilar
      createWindow();
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', function () {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

  // IPC del actualizador
  ipcMain.on('updater-check', () => {
    checkForUpdates({ send: sendUpdateStatus });
  });

  ipcMain.on('updater-download', () => {
    startAvailableDownload({ send: sendUpdateStatus });
  });

  ipcMain.on('updater-apply', () => {
    if (applyUpdateAndRestart()) {
      app.quit();
    }
  });

  // Genera un archivo .ics y lo abre con el calendario por defecto del sistema
  ipcMain.handle('calendar-save-ics', async (_event, { content, filename }) => {
    try {
      const safeName = (filename || 'cita.ics').replace(/[^a-zA-Z0-9._-]/g, '_');
      const dir = path.join(app.getPath('userData'), 'eventos-ics');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, safeName);
      fs.writeFileSync(filePath, content, 'utf8');
      const err = await shell.openPath(filePath);
      if (err) return { ok: false, error: err };
      return { ok: true, path: filePath };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // ── Desbloqueo biométrico (Windows Hello) ─────────────────────────────
  // Guarda la contraseña maestra cifrada con safeStorage (DPAPI en Windows)
  // y la entrega únicamente tras una verificación biométrica satisfactoria
  // en el renderer (WebAuthn). El fichero vive en userData.
  const vaultPath = () => path.join(app.getPath('userData'), 'ffe-biometric-vault.json');

  const readVault = () => {
    try {
      if (!fs.existsSync(vaultPath())) return null;
      return JSON.parse(fs.readFileSync(vaultPath(), 'utf8'));
    } catch {
      return null;
    }
  };

  ipcMain.handle('biometric-status', () => {
    const vault = readVault();
    return {
      available: safeStorage.isEncryptionAvailable(),
      enabled: !!vault,
      credentialId: vault?.credentialId || null,
    };
  });

  ipcMain.handle('biometric-save', (_event, { credentialId, password }) => {
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: 'El almacenamiento seguro del sistema no está disponible.' };
    }
    if (!credentialId || !password) {
      return { ok: false, error: 'Faltan datos para configurar el desbloqueo biométrico.' };
    }
    try {
      const payload = {
        version: 1,
        rpId: new URL(ventanaUrl).hostname,
        credentialId,
        password: safeStorage.encryptString(password).toString('base64'),
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(vaultPath(), JSON.stringify(payload, null, 2), 'utf8');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('biometric-get-password', () => {
    const vault = readVault();
    if (!vault) return { ok: false, error: 'El desbloqueo biométrico no está configurado.' };
    try {
      const password = safeStorage.decryptString(Buffer.from(vault.password, 'base64'));
      return { ok: true, password };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('biometric-delete', () => {
    try {
      if (fs.existsSync(vaultPath())) fs.unlinkSync(vaultPath());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });