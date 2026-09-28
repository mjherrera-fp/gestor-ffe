import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────
// Test de integración del ciclo de seguridad (token de sesión).
//
// Levanta el servidor REAL por un proceso hijo, con una BBDD temporal
// aislada, y comprueba el enforcement sobre el HTTP de verdad. Los tests
// unitarios de tests/seguridad-rutas.test.ts cubren las funciones puras,
// pero no que el middleware se aplique: por eso aquí se prueba el efecto.
//
// ⚠️ La BBDD de este test es una copia temporal desechable. Nunca se toca
// la del usuario: PORTABLE_EXECUTABLE_DIR apunta a un directorio nuevo.
// ─────────────────────────────────────────────────────────────────────

const TOKEN = 'a'.repeat(64);
const CABECERA = 'X-FFE-Token';

let hijo: ChildProcess;
let dirTemporal: string;
let base: string;

const pedir = (ruta: string, cabeceras: Record<string, string> = {}, metodo = 'GET', cuerpo?: string) =>
  fetch(`${base}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo });

// Puerto libre real: si se eligiera uno fijo, otro proceso (o el servidor de
// desarrollo) lo tendría ocupado y el test fallaría sin motivo aparente.
const puertoLibre = () => new Promise<number>((resolver, rejectar) => {
  const s = net.createServer();
  s.once('error', rejectar);
  s.listen(0, '127.0.0.1', () => {
    const p = (s.address() as net.AddressInfo).port;
    s.close(() => resolver(p));
  });
});

const esperarArranque = async (url: string, ms = 45_000) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    try {
      await fetch(url);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return false;
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-integracion-'));
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;

  // Se invoca el CLI de tsx con el propio node en vez de `npx`: en Windows
  // `npx` es `npx.cmd` y spawn sin shell no lo encuentra (ENOENT), y
  // depender del PATH haría el test frágil.
  const raiz = path.resolve(__dirname, '../..');
  const tsxCli = path.join(raiz, 'node_modules/tsx/dist/cli.mjs');

  hijo = spawn(process.execPath, [tsxCli, 'server.ts'], {
    cwd: raiz,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(puerto),
      PORTABLE_EXECUTABLE_DIR: dirTemporal,
      FFE_SESSION_TOKEN: TOKEN,
    },
    stdio: 'pipe',
  });

  // Si el servidor muere al arrancar, hay que fallar rápido y con su salida,
  // no agotar 45 s de espera sin explicación.
  let salida = '';
  hijo.stdout?.on('data', d => { salida += d.toString(); });
  hijo.stderr?.on('data', d => { salida += d.toString(); });

  const listo = await esperarArranque(`${base}/`);
  if (!listo) {
    throw new Error(`El servidor no arrancó. Salida:\n${salida}`);
  }
});

afterAll(async () => {
  if (hijo && !hijo.killed) {
    // El hijo es `npx tsx`, que a su vez lanza el proceso de node. Matar solo
    // el wrapper dejaría un servidor huérfano ocupando el puerto. En Windows
    // los grupos de procesos no funcionan con process.kill(-pid), así que se
    // recurre a taskkill /T, que mata el árbol entero.
    if (process.platform === 'win32') {
      await new Promise<void>((resolver) => {
        exec(`taskkill /PID ${hijo.pid} /T /F`, () => resolver());
      });
    } else {
      try { process.kill(-hijo.pid!, 'SIGKILL'); } catch { hijo.kill('SIGKILL'); }
    }
  }
  if (dirTemporal) {
    // El fichero .ffe-session-token queda dentro de dirTemporal, asi que al
    // borrar el directorio desaparece el secreto de la prueba.
    fs.rmSync(dirTemporal, { recursive: true, force: true });
  }
});

describe('el token de sesión protege la API', () => {
  it('rechaza una petición sin token', async () => {
    const res = await pedir('/api/alumnos');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('rechaza un token incorrecto', async () => {
    const res = await pedir('/api/alumnos', { [CABECERA]: 'token-incorrecto' });
    expect(res.status).toBe(401);
  });

  it('rechaza un token con la longitud correcta pero distinto', async () => {
    // Evita que un `startsWith` o un comparison sloppy dejaría pasar.
    const parecido = 'a'.repeat(63) + 'b';
    const res = await pedir('/api/alumnos', { [CABECERA]: parecido });
    expect(res.status).toBe(401);
  });

  it('acepta el token correcto y devuelve datos', async () => {
    const res = await pedir('/api/alumnos', { [CABECERA]: TOKEN });
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('acepta la cabecera sin distinguir mayusculas', async () => {
    // Las cabeceras HTTP no distinguen mayusculas y el navegador las normaliza.
    const res = await pedir('/api/alumnos', { 'x-ffe-token': TOKEN });
    expect(res.status).toBe(200);
  });
});

describe('el frontend no se protege, o la app arranca en blanco', () => {
  it('no rechaza con 401 una ruta que no es /api ni /uploads', async () => {
    // Aquí no se comprueba que sea 200, sino lo que de verdad importa: que el
    // token NO bloquee la carga del frontend. En este arranque sale 404 porque
    // distPath es path.join(__dirname, '..', 'dist'), calculado para el layout
    // de producción (dist-server/server.js -> dist/); al ejecutar server.ts
    // desde la raíz sube un nivel de más y no encuentra el directorio. En
    // desarrollo real el frontend lo sirve Vite, no express.static.
    //
    // Si esto devolviera 401, la aplicación arrancaría en blanco.
    const res = await pedir('/');
    expect(res.status).not.toBe(401);
    expect(await res.text()).not.toContain('unauthorized');
  });
});

describe('el middleware se aplica antes de parsear el cuerpo', () => {
  it('devuelve 401 y no un error de JSON malformado', async () => {
    // Si express.json() se ejecutara antes, un cuerpo inválido produciría un
    // 400 de parseo. Que salga 401 demuestra que el token se comprueba primero,
    // que es lo que evita que un atacante malicioso consuma memoria con cuerpos
    // de hasta 50 MB.
    const res = await pedir('/api/alumnos', {}, 'POST', '{esto no es json');
    expect(res.status).toBe(401);
  });
});

describe('uploads queda contenido en su carpeta', () => {
  it('no sirve ficheros de fuera de uploads aunque lleve el token', async () => {
    // El fichero existe de verdad, pero está en el directorio padre.
    const fuera = path.join(dirTemporal, 'ffe_management.db');
    expect(fs.existsSync(fuera)).toBe(true);

    const traversal = `/uploads/${encodeURIComponent('../ffe_management.db')}`;
    const res = await pedir(traversal, { [CABECERA]: TOKEN });

    // Lo que importa es que NO devuelva el contenido de la BBDD. Con el
    // traversal corregido la petición se resuelve dentro de uploads/, donde
    // ese fichero no existe, así que falla (404/500) en vez de servirlo.
    const cuerpo = await res.text();
    expect(res.status).not.toBe(200);
    expect(cuerpo).not.toContain('SQLite format 3');
  });

  it('rechaza /uploads sin token', async () => {
    const res = await pedir('/uploads/cualquiera.pdf');
    expect(res.status).toBe(401);
  });
});
