import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
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
  cargarURLConReintentos(mainWindow, splash, `http://127.0.0.1:${serverPort}`);

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
      PORTABLE_EXECUTABLE_DIR: baseDir
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
}

// Usamos el fetch nativo mágico de Node (ya no hace falta importarlo)
async function waitForServer(url, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await fetch(url);
      return true;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return false;
}

// Envía el estado del actualizador a la ventana principal
function sendUpdateStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-status', status);
  }
}

// NUEVO CICLO DE VIDA (Más estable que app.on('ready'))
app.whenReady().then(async () => {
  startServer();

  if (app.isPackaged) {
    // Producción: Esperamos a nuestro propio servidor forkeado
    const serverReady = await waitForServer(`http://127.0.0.1:${serverPort}`);
    if (serverReady) {
      createWindow();
      // La comprobación de actualizaciones la dispara el renderer al montar
      // (UpdaterProvider -> updater-check), no un timer del proceso principal.
    } else {
      console.error("El servidor tardó demasiado en iniciar.");
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