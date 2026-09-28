import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────
// Ciclo completo de desbloqueo contra una BBDD cifrada.
//
// seguridad-api.test.ts mide el token, el traversal y el JSON malformado con
// la base en claro. Aquí se mide lo que solo se puede ver con la base cifrada:
//
//   cifrar -> la sesión sigue abierta -> bloquear -> la API se cierra ->
//   contraseña incorrecta -> backoff -> contraseña correcta -> la API vuelve
//   -> reiniciar el servidor -> la base sigue cerrada y pide la clave
//
// El reinicio es la parte que más importa y la que no se puede simular: es el
// momento en que el archivo cifrado se abre sin clave, y donde un fallo de
// arranque o un mensaje de error en crudo se leerían en la cara del usuario.
//
// ⚠️ La BBDD es una copia temporal desechable: PORTABLE_EXECUTABLE_DIR apunta
// a un directorio nuevo, así que la del usuario no se toca.
// ─────────────────────────────────────────────────────────────────────

const TOKEN = 'b'.repeat(64);
const CONTRASENA = 'clave-de-prueba-inexistente';
const CABECERA = 'X-FFE-Token';

let hijo: ChildProcess | null = null;
let dirTemporal = '';
let base = '';
let salida = '';

const pedir = (
  ruta: string,
  cabeceras: Record<string, string> = {},
  metodo = 'GET',
  cuerpo?: unknown,
) =>
  fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...cabeceras },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

const estado = async () => (await pedir('/api/auth/status', { [CABECERA]: TOKEN })).json();
const conToken = (extra: Record<string, string> = {}) => ({ [CABECERA]: TOKEN, ...extra });

const puertoLibre = () =>
  new Promise<number>((resolver, rejectar) => {
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

const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));

const detener = async (proceso: ChildProcess | null) => {
  if (!proceso || proceso.killed) return;
  if (process.platform === 'win32') {
    await new Promise<void>(resolver => {
      exec(`taskkill /PID ${proceso.pid} /T /F`, () => resolver());
    });
  } else {
    try {
      process.kill(-proceso.pid!, 'SIGKILL');
    } catch {
      proceso.kill('SIGKILL');
    }
  }
};

/** Levanta el servidor real sobre el directorio temporal y espera a que responda. */
const arrancar = async (): Promise<void> => {
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;

  // Se invoca el CLI de tsx con el propio node en vez de `npx`: en Windows
  // `npx` es `npx.cmd` y spawn sin shell no lo encuentra (ENOENT), y
  // depender del PATH haría el test frágil.
  const raiz = path.resolve(__dirname, '../..');
  const tsxCli = path.join(raiz, 'node_modules/tsx/dist/cli.mjs');

  salida = '';
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

  hijo.stdout?.on('data', d => { salida += d.toString(); });
  hijo.stderr?.on('data', d => { salida += d.toString(); });

  // Si el servidor muere al arrancar, hay que fallar rápido y con su salida,
  // no agotar 45 s de espera sin explicación.
  if (!(await esperarArranque(`${base}/`))) {
    throw new Error(`El servidor no arrancó. Salida:\n${salida}`);
  }
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-ciclo-'));
  await arrancar();
}, 60_000);

afterAll(async () => {
  await detener(hijo);
  if (dirTemporal) {
    fs.rmSync(dirTemporal, { recursive: true, force: true });
  }
});

describe('una base nueva', () => {
  it('arranca sin cifrar y sin bloquear', async () => {
    // Punto de partida del recorrido. Si esto ya viniera cifrado, el resto de
    // las pruebas no estarían midiendo lo que dicen medir.
    expect(await estado()).toEqual({ locked: false, encrypted: false });
  });

  it('sirve datos sin pedir nada', async () => {
    const res = await pedir('/api/alumnos', conToken());
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe('al cifrar la base', () => {
  it('queda marcada como cifrada', async () => {
    const res = await pedir('/api/auth/encrypt', conToken(), 'POST', { password: CONTRASENA });
    expect(res.status, `Falló el cifrado. Salida:\n${salida}`).toBe(200);

    const s = await estado();
    expect(s.encrypted).toBe(true);
  });

  it('pero la sesión sigue abierta: cifrar no es bloquear', async () => {
    // El rekey se aplica sobre la conexión viva, así que la base continúa
    // legible. Si esto devolviera 401 habría que revisar si el perfil está
    // dejando al usuario sin acceso a sus datos justo después de cifrar.
    const s = await estado();
    expect(s.locked).toBe(false);

    const res = await pedir('/api/alumnos', conToken());
    expect(res.status).toBe(200);
  });

  it('el archivo en disco ya no es un SQLite legible', async () => {
    // El estado en memoria podría mentir; esto lee los primeros bytes del
    // fichero y comprueba que la cabecera "SQLite format 3" desapareció.
    const archivo = path.join(dirTemporal, 'ffe_management.db');
    expect(fs.existsSync(archivo)).toBe(true);

    const cabecera = fs.readFileSync(archivo).subarray(0, 16).toString('latin1');
    expect(cabecera).not.toContain('SQLite format 3');
  });
});

describe('al bloquear la base', () => {
  it('el estado pasa a bloqueada', async () => {
    const res = await pedir('/api/auth/lock', conToken(), 'POST', {});
    expect(res.status).toBe(200);
    expect((await estado()).locked).toBe(true);
  });

  it('la API de datos se cierra aunque el token sea correcto', async () => {
    // El token autoriza a hablar con el servidor, no a leer la base. Con la
    // base bloqueada no hay conexión, así que responder 401 en vez de
    // reventar con un TypeError sobre db === null es lo que evita que el
    // cliente reciba una página de error en crudo.
    const res = await pedir('/api/alumnos', conToken());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'locked' });
  });

  it('las rutas de auth siguen abiertas para poder desbloquear', async () => {
    const res = await pedir('/api/auth/status', conToken());
    expect(res.status).toBe(200);
  });

  it('desbloquear sin token ni siquiera se intenta', async () => {
    const res = await pedir('/api/auth/unlock', {}, 'POST', { password: CONTRASENA });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
});

describe('el backoff frena los intentos fallidos', () => {
  it('una contraseña incorrecta da 401 sin revelar nada más', async () => {
    const res = await pedir('/api/auth/unlock', conToken(), 'POST', {
      password: 'no-es-la-clave',
    });
    expect(res.status).toBe(401);

    const cuerpo = await res.json();
    expect(cuerpo.error).toBe('Contraseña incorrecta');
    // Ni una pista sobre si la clave está cerca ni cuál es la correcta.
    expect(JSON.stringify(cuerpo)).not.toContain('inexistente');
  });

  it('el reintento inmediato recibe 429 en vez de volver a comparar', async () => {
    // Este es el corazón del backoff: si el servidor respondiera 401 otra vez
    // estaría comparando la contraseña sin parar, y la espera solo sería
    // cosmética. El 429 demuestra que el trabajo no se ha hecho.
    const res = await pedir('/api/auth/unlock', conToken(), 'POST', {
      password: 'no-es-la-clave',
    });
    expect(res.status).toBe(429);

    const cuerpo = await res.json();
    expect(typeof cuerpo.esperaSegundos).toBe('number');
    expect(cuerpo.esperaSegundos).toBeGreaterThan(0);
    // El 429 no puede confundirse con "contraseña incorrecta" en el cliente.
    expect(cuerpo.error).not.toBe('Contraseña incorrecta');
  });

  it('el 429 indica cuánto esperar con Retry-After', async () => {
    const res = await pedir('/api/auth/unlock', conToken(), 'POST', {
      password: 'no-es-la-clave',
    });
    expect(res.status).toBe(429);

    const espera = res.headers.get('retry-after');
    expect(espera).not.toBeNull();
    expect(Number(espera)).toBeGreaterThan(0);
  });

  it('la espera no se acorta por insistir', async () => {
    // Tras varios fallos la espera ha crecido, así que este intento debe
    // rechazarse sin llegar a comparar. Si el backoff no creciera, o si un
    // reintento lo reiniciara, esta petición sería un 401 y no un 429.
    const res = await pedir('/api/auth/unlock', conToken(), 'POST', {
      password: 'no-es-la-clave',
    });
    expect(res.status).toBe(429);
  });
});

describe('la contraseña correcta', () => {
  it('desbloquea y borra el historial de fallos', async () => {
    // Se espera a que expire la espera acumulada: el backoff tiene tope de 30 s
    // pero aquí solo llegan a 3-4 fallos, así que bastan unos segundos.
    let res = await pedir('/api/auth/unlock', conToken(), 'POST', { password: CONTRASENA });

    for (let intento = 0; intento < 10 && res.status === 429; intento++) {
      const espera = Number(res.headers.get('retry-after') ?? 1) * 1000;
      await dormir(Math.min(espera, 2000) + 250);
      res = await pedir('/api/auth/unlock', conToken(), 'POST', { password: CONTRASENA });
    }

    expect(res.status, `El desbloqueo nunca llegó a aceptarse. Salida:\n${salida}`).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('la API de datos vuelve a responder', async () => {
    const res = await pedir('/api/alumnos', conToken());
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('la base sigue cifrada: desbloquear no descifra', async () => {
    const s = await estado();
    expect(s.locked).toBe(false);
    expect(s.encrypted).toBe(true);
  });

  it('el acierto reinicia el contador de fallos', async () => {
    // Antes del acierto había un fallo pendiente, así que la espera era de
    // 500 ms. Si el acierto no borrara el historial, el siguiente fallo sumaría
    // uno más y pediría 1 s entera.
    //
    // Un 401 no distingue nada: ambos casos lo devuelven. Y tampoco vale
    // comparar `esperaSegundos`, porque ceil() redondea 500 ms y 1 s al mismo
    // segundo. Lo que sí separa los dos mundos es el tiempo real: se espera
    // 700 ms y se prueba la clave buena. Si el contador se reinició, la espera
    // ya venció y entra; si no, todavía queda medio segundo y sale un 429.
    const fallo = await pedir('/api/auth/unlock', conToken(), 'POST', { password: 'otra-clave-mala' });
    expect(fallo.status).toBe(401);

    await dormir(700);
    const entrada = await pedir('/api/auth/unlock', conToken(), 'POST', { password: CONTRASENA });
    expect(entrada.status, 'La espera no se reinició tras el desbloqueo correcto').toBe(200);
  });
});

describe('tras reiniciar con la base cifrada', () => {
  it('el servidor arranca y la base aparece cerrada', async () => {
    // El recorrido real del usuario: cerrar la aplicación y volver a abrirla.
    // Aquí el archivo cifrado se abre sin clave, y si algo fallara el servidor
    // no levantaría o pediría la clave de una forma inservible.
    await detener(hijo);
    await arrancar();

    const s = await estado();
    expect(s.locked, `Estado inesperado tras reiniciar. Salida:\n${salida}`).toBe(true);
    expect(s.encrypted).toBe(true);
  });

  it('no se sirven datos sin desbloquear', async () => {
    const res = await pedir('/api/alumnos', conToken());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'locked' });
  });

  it('la contraseña correcta abre la base ya en frío', async () => {
    // Sin backoff acumulado de la sesión anterior: esta debe ser la primera
    // petición de desbloqueo y aun así tiene que aceptarse a la primera.
    const res = await pedir('/api/auth/unlock', conToken(), 'POST', { password: CONTRASENA });
    expect(res.status, `No desbloqueó al arrancar. Salida:\n${salida}`).toBe(200);

    const datos = await pedir('/api/alumnos', conToken());
    expect(datos.status).toBe(200);
    expect(Array.isArray(await datos.json())).toBe(true);
  });

  it('una contraseña incorrecta no deja la base a medias', async () => {
    // Primero se bloquea para dejar el servidor como lo encontraría el
    // usuario, luego se prueba el fallo y se comprueba que sigue cerrada.
    await pedir('/api/auth/lock', conToken(), 'POST', {});
    expect((await estado()).locked).toBe(true);

    const res = await pedir('/api/auth/unlock', conToken(), 'POST', { password: 'no-es-la-clave' });
    expect(res.status).toBe(401);
    expect((await estado()).locked).toBe(true);
  });
});
