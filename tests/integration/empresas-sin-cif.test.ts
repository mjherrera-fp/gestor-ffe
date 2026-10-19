import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────
// El CIF de una empresa no es obligatorio: se dan de alta empresas que se
// han contactado y de las que aun no se tiene. Se prueba contra el servidor
// real porque el bloqueo estaba en la comprobacion de duplicados de la API,
// que tomaba dos CIF vacios por el mismo CIF.
//
// La BBDD es una copia temporal desechable (PORTABLE_EXECUTABLE_DIR).
// ─────────────────────────────────────────────────────────────────────

const TOKEN = 'b'.repeat(64);

let hijo: ChildProcess;
let dirTemporal: string;
let base: string;
let salida = '';

const pedir = (ruta: string, metodo = 'GET', cuerpo?: unknown) =>
  fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'X-FFE-Token': TOKEN, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

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

const empresa = (nombre: string, cif?: string) => ({
  nombre,
  direccion: 'Calle Prueba 1',
  ciudad: 'Madrid',
  ...(cif === undefined ? {} : { cif }),
  email: `${nombre.toLowerCase().replace(/\s+/g, '')}@test.local`,
  tlfn: '900000000',
});

const leerEmpresa = async (id: number) => {
  const res = await pedir('/api/empresas');
  expect(res.status, `Falló la lectura. Salida:\n${salida}`).toBe(200);
  return (await res.json()).find((e: any) => e.id === id);
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-empresas-'));
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;

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
  hijo.stdout?.on('data', d => { salida += d.toString(); });
  hijo.stderr?.on('data', d => { salida += d.toString(); });

  if (!(await esperarArranque(`${base}/`))) {
    throw new Error(`El servidor no arrancó. Salida:\n${salida}`);
  }
}, 60_000);

afterAll(async () => {
  if (hijo && !hijo.killed) {
    if (process.platform === 'win32') {
      await new Promise<void>((resolver) => {
        exec(`taskkill /PID ${hijo.pid} /T /F`, () => resolver());
      });
    } else {
      try { process.kill(-hijo.pid!, 'SIGKILL'); } catch { hijo.kill('SIGKILL'); }
    }
  }
  if (dirTemporal) {
    // En Windows el servidor puede soltar la base un instante despues de morir.
    for (let intento = 0; intento < 5; intento++) {
      try {
        fs.rmSync(dirTemporal, { recursive: true, force: true });
        break;
      } catch {
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }
});

describe('empresas sin CIF', () => {
  let primeraSinCif: number;

  it('se pueden dar de alta varias, con el CIF vacio o sin mandarlo', async () => {
    const vacio = await pedir('/api/empresas', 'POST', empresa('Contactada Uno', ''));
    expect(vacio.status, `Salida:\n${salida}`).toBe(200);
    primeraSinCif = (await vacio.json()).id;

    const otraVacia = await pedir('/api/empresas', 'POST', empresa('Contactada Dos', '   '));
    expect(otraVacia.status, `Salida:\n${salida}`).toBe(200);

    const sinCampo = await pedir('/api/empresas', 'POST', empresa('Contactada Tres'));
    expect(sinCampo.status, `Salida:\n${salida}`).toBe(200);
    const guardada = await leerEmpresa((await sinCampo.json()).id);
    expect(guardada.cif).toBe('');
  });

  it('se pueden editar aunque haya otras sin CIF', async () => {
    const res = await pedir(`/api/empresas/${primeraSinCif}`, 'PUT', { ...empresa('Contactada Uno'), cif: '', ciudad: 'Getafe' });
    expect(res.status, `Salida:\n${salida}`).toBe(200);
    expect((await leerEmpresa(primeraSinCif)).ciudad).toBe('Getafe');
  });

  it('el CIF sigue sin poder repetirse cuando se indica', async () => {
    const primera = await pedir('/api/empresas', 'POST', empresa('Con CIF', 'B12345678'));
    expect(primera.status, `Salida:\n${salida}`).toBe(200);

    const repetida = await pedir('/api/empresas', 'POST', empresa('Con CIF repetido', ' b12345678 '));
    expect(repetida.status).toBe(409);

    // Ponerle a una sin CIF el de otra tampoco se permite.
    const alEditar = await pedir(`/api/empresas/${primeraSinCif}`, 'PUT', { ...empresa('Contactada Uno'), cif: 'B12345678' });
    expect(alEditar.status).toBe(409);
  });
});
