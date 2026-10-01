import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';
import { marcadoresAjenos } from '../../templates/emails/emailTemplates.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  La plantilla de correo de Convenios existe y es usable.
//
//  El botón "Enviar correo a la empresa" de la ficha de un convenio carga la
//  plantilla `convenio` por `plantillaId`. Si esa plantilla no está en la base,
//  el botón no abre nada y el profesor ve un botón muerto sin explicación.
//
//  Lo que se mide es que la plantilla llega por las dos vías que usa la
//  pantalla: suelta por `plantillaId` (que es lo que hace el envío) y dentro del
//  listado del ámbito `convenio` (que es lo que hace el filtro de
//  Configuración > Correos). Y que su texto no lleva marcadores que el ámbito no
//  resuelva, porque esos saldrían vacíos en el correo a la empresa.
//
//  La migración `INSERT OR IGNORE` es la que lo pone en las instalaciones que ya
//  tenían la tabla creada, que son las que no pasan por el seed. Y un `UPDATE`
//  aparte es la que le añade el adjunto a quien ya tenía la fila puesta, porque el
//  seed a una base con datos ni se mira. El bloque del final arranca el servidor
//  dos veces para recorrer esa parte; lo del principio solo ve bases nuevas.
//
//  ⚠️ La BBDD es una copia temporal desechable: PORTABLE_EXECUTABLE_DIR apunta
//  a un directorio nuevo, así que la del usuario no se toca.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = 'c'.repeat(64);

let hijo: ChildProcess | null = null;
let dirTemporal = '';
let base = '';
let salida = '';

const conToken = { 'X-FFE-Token': TOKEN };

const pedir = (ruta: string) => fetch(`${base}${ruta}`, { headers: conToken });

/** `PUT` de plantilla, que es por donde se edita desde Configuración. */
const editar = (id: number, cambios: Record<string, unknown>) =>
  fetch(`${base}/api/plantillas/${id}`, {
    method: 'PUT',
    headers: { ...conToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  });

const leerPlantilla = async () =>
  (await (await pedir('/api/plantillas/by-plantilla-id/convenio')).json()) as any;

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

const arrancar = async (): Promise<void> => {
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;

  // Se invoca el CLI de tsx con el propio node en vez de `npx`: en Windows
  // `npx` es `npx.cmd` y spawn sin shell no lo encuentra (ENOENT).
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

  if (!(await esperarArranque(`${base}/`))) {
    throw new Error(`El servidor no arrancó. Salida:\n${salida}`);
  }
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-plantilla-convenio-'));
  await arrancar();
}, 60_000);

afterAll(async () => {
  await detener(hijo);
  if (dirTemporal) {
    try {
      fs.rmSync(dirTemporal, { recursive: true, force: true });
    } catch {
      // Un directorio temporal que no se borra no rompe la suite.
    }
  }
});

describe('la plantilla de correo de Convenios', () => {
  it('existe y se puede cargar por su plantillaId, que es como la pide el envío', async () => {
    const res = await pedir('/api/plantillas/by-plantilla-id/convenio');
    expect(res.status, `Salida:\n${salida}`).toBe(200);

    const cfg = await res.json();
    expect(cfg.plantillaId).toBe('convenio');
    expect(cfg.subject).not.toBe('');
    expect(cfg.body).not.toBe('');
  });

  it('aparece en el listado del ámbito convenio, que es lo que filtra la configuración', async () => {
    const res = await pedir('/api/plantillas?place=convenio');
    expect(res.ok).toBe(true);

    const plantillas = await res.json();
    const ids = plantillas.map((p: any) => p.plantillaId);
    expect(ids).toContain('convenio');
  });

  it('está marcada como sistema y de registro individual', async () => {
    // `registro-individual` es lo que la sitúa junto a los botones de un
    // registro concreto. Sin él, el filtro de Configuración la esconde en
    // "varios registros" y no aparece donde el profesor la busca.
    const cfg = await (await pedir('/api/plantillas/by-plantilla-id/convenio')).json();
    expect(cfg.tipo).toBe('sistema');
    expect(cfg.place).toBe('convenio');
    expect(cfg.grupo).toBe('registro-individual');
    expect(cfg.recipientTarget).toBe('empresa');
  });

  it('su texto solo usa marcadores que el ámbito de convenio resuelve', async () => {
    // Si el texto de fábrica lleva un marcador ajeno, el correo sale con un
    // hueco en medio y el profesor no tiene dónde mirar: el aviso sale antes,
    // al abrir, pero el envío sigue adelante. Es la regla que sostiene todo el
    // catálogo, aplicada al texto que se crea sin que nadie lo escriba.
    const cfg = await (await pedir('/api/plantillas/by-plantilla-id/convenio')).json();

    expect(marcadoresAjenos(cfg.body, 'convenio')).toEqual([]);
    expect(marcadoresAjenos(cfg.subject, 'convenio')).toEqual([]);
  });

  it('pide el documento del convenio, que es lo que se adjunta al correo', async () => {
    const cfg = await (await pedir('/api/plantillas/by-plantilla-id/convenio')).json();

    // `documents` es lo que recorre `useConvenios` al abrir el correo. Con la
    // lista vacía el correo sale sin adjunto aunque el profesor tenga el
    // convenio subido a su gestor documental.
    expect(JSON.parse(cfg.documents)).toEqual(['convenio']);
  });

  it('no anuncia un adjunto en el texto, porque puede no haberlo', async () => {
    // El documento sale solo si hay una versión subida. Un texto que dijera
    // "adjuntamos" pondría en el correo algo que no está cuando el gestor está
    // vacío, así que la plantilla se limita a comunicar los datos.
    const cfg = await (await pedir('/api/plantillas/by-plantilla-id/convenio')).json();
    expect(cfg.body.toLowerCase()).not.toContain('adjuntamos');
  });
});

/**
 * La instalación que ya tenía la plantilla puesta, que es la de quien usa la
 * aplicación a diario.
 *
 * El seed solo corre cuando la tabla de plantillas está vacía, así que a la base
 * que ya tiene la fila del convenio no la toca: por eso el adjunto llega con un
 * `UPDATE` aparte. Y sin ese `UPDATE` el correo saldría sin documento aunque el
 * profesor lo tenga subido, sin ningún aviso de por qué.
 *
 * Se arranca el servidor dos veces porque las migraciones se ejecutan al
 * importar la base de datos, que es justo lo que pasa al abrir la aplicación.
 */
describe('la migración que pone el adjunto a quien ya tenía la plantilla', () => {
  it('rellena la lista vacía y respeta la que ya esté puesta', async () => {
    const { id } = await leerPlantilla();
    expect(id).toBeGreaterThan(0);

    // Se deja la base como estaba antes de este cambio: la plantilla existe,
    // pero sin adjuntos. Es lo que tiene cualquiera que ya la hubiera usado.
    const vaciado = await editar(id, { documents: [] });
    expect(vaciado.ok, `Salida:\n${salida}`).toBe(true);
    expect(JSON.parse((await leerPlantilla()).documents)).toEqual([]);

    await detener(hijo);
    await arrancar();
    expect(JSON.parse((await leerPlantilla()).documents)).toEqual(['convenio']);

    // Y al revés: si la lista ya no está vacía es porque alguien la configuró,
    // y esa gana. Poner `convenio` a quien ya lo tiene puesto no es un problema,
    // pero pisar una configuración ajena sí.
    const configurada = await editar(id, { documents: ['convenio', 'seguimiento'] });
    expect(configurada.ok).toBe(true);

    await detener(hijo);
    await arrancar();
    expect(JSON.parse((await leerPlantilla()).documents)).toEqual(['convenio', 'seguimiento']);
  }, 120_000);
});