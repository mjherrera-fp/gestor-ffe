import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process'; 

// 1. APAGAR ACELERACIÓN POR HARDWARE (Crucial para evitar cuelgues en Windows)
app.disableHardwareAcceleration();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

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
      nodeIntegration: false, // APAGADO para evitar conflictos con React
      contextIsolation: true  // ENCENDIDO para proteger la ventana
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // 3. INTENTAMOS CARGAR LA RUTA (Y LE PASAMOS EL SPLASH PARA QUE LO CIERRE AL TERMINAR)
  if (app.isPackaged) {
    // En producción cargamos directamente porque el index.html ya existe
    mainWindow.loadFile('dist/index.html').then(() => {
      splash.close();
      mainWindow.show();
    });
  } else {
    // En desarrollo usamos nuestra función paciente
    cargarURLConReintentos(mainWindow, splash, 'http://127.0.0.1:3000');
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  const isDev = !app.isPackaged;
  
  if (isDev) return; 

  const serverPath = path.join(__dirname, 'dist-server', 'server.js');
  
  serverProcess = fork(serverPath, [], {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production' },
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

// NUEVO CICLO DE VIDA (Más estable que app.on('ready'))
app.whenReady().then(async () => {
  startServer();
  
  if (app.isPackaged) {
      // Producción: Esperamos a nuestro propio servidor forkeado
      const serverReady = await waitForServer('http://127.0.0.1:3000');
      if (serverReady) {
          createWindow();
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