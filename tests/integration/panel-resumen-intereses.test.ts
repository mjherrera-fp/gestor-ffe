import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────
// GF-71: el resumen del panel trae, por alumno, a cuantas empresas se ha
// enviado su CV y si alguna empresa lo ha solicitado (los mismos datos que
// la pantalla de Intereses).
//
// La BBDD es una copia temporal desechable (PORTABLE_EXECUTABLE_DIR).
// ─────────────────────────────────────────────────────────────────────

const TOKEN = 'c7'.repeat(32);

let hijo: ChildProcess;
let dirTemporal: string;
let base: string;
let salida = '';
let cursoId = 0;
const alumnos: Record<string, number> = {};

const pedir = (ruta: string, metodo = 'GET', cuerpo?: unknown) =>
  fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'X-FFE-Token': TOKEN, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

const crear = async (ruta: string, cuerpo: unknown) => {
  const res = await pedir(ruta, 'POST', cuerpo);
  if (!res.ok) throw new Error(`${ruta} devolvio ${res.status}: ${await res.text()}\nSalida:\n${salida}`);
  return res.json().catch(() => ({}));
};

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
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-panel-intereses-'));
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;
  const raiz = path.resolve(__dirname, '../..');
  hijo = spawn(process.execPath, [path.join(raiz, 'node_modules/tsx/dist/cli.mjs'), 'server.ts'], {
    cwd: raiz,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(puerto), PORTABLE_EXECUTABLE_DIR: dirTemporal, FFE_SESSION_TOKEN: TOKEN },
    stdio: 'pipe',
  });
  hijo.stdout?.on('data', d => { salida += d.toString(); });
  hijo.stderr?.on('data', d => { salida += d.toString(); });
  if (!(await esperarArranque(`${base}/`))) throw new Error(`El servidor no arrancó. Salida:\n${salida}`);

  const profesor = await crear('/api/profesor', {
    nombre: 'Profe', apellidos: 'Panel', nif: '00000000P', email: 'profe@test.local', telefono: '600000000',
  });
  const curso = await crear('/api/cursos', { descripcion: 'Curso 2026-2027', fechaInicio: '2026-09-01', fechaFin: '2027-06-30' });
  cursoId = curso.id;
  const centro = await crear('/api/centros', {
    profesorId: profesor.id, nombre: 'Centro', ciudad: 'Madrid', telefono: '910000000', email: 'c@test.local', codigoCentro: '28000000', festivos: [],
  });
  const detalle = await crear('/api/detalles-academicos', {
    centroId: centro.id, ciclo: 'DAM', codigo: 'D1', nivel: '2º', grado: 'Grado Superior', regimen: 'Ordinario', codigoGrupo: 'G1',
  });
  for (const [i, n] of ['Ana', 'Luis', 'Marta'].entries()) {
    const a = await crear('/api/alumnos', {
      nombre: n, apellidos: 'Prueba', dni: `0000000${i}T`, numSS: '280000000000', tlfn: `60000000${i}`,
      emailEduca: `${n.toLowerCase()}@educa.test`, emailPersonal: `${n.toLowerCase()}@personal.test`, fechaNacimiento: '2005-01-01',
      totalHorasFFE: 370, cursoId: curso.id, detalleAcademicoId: detalle.id,
    });
    alumnos[n] = a.id;
  }
  const empresa = async (n: number) => (await crear('/api/empresas', {
    nombre: `Empresa ${n}`, direccion: 'Calle 1', ciudad: 'Madrid', cif: `B0000000${n}`, email: `e${n}@empresa.test`, tlfn: '910000001',
  })).id;
  const e1 = await empresa(1);
  const e2 = await empresa(2);
  const e3 = await empresa(3);

  // Ana: CV a tres empresas, ninguna la ha solicitado.
  for (const e of [e1, e2, e3]) await crear('/api/intereses', { alumnoId: alumnos.Ana, empresaId: e, interesado: 'alumno' });
  // Luis: solicitado por una empresa, sin envios.
  await crear('/api/intereses', { alumnoId: alumnos.Luis, empresaId: e1, interesado: 'empresa' });
  // Marta: nada.
}, 90_000);

afterAll(async () => {
  if (hijo && !hijo.killed) {
    if (process.platform === 'win32') {
      await new Promise<void>((resolver) => exec(`taskkill /PID ${hijo.pid} /T /F`, () => resolver()));
    } else {
      try { process.kill(-hijo.pid!, 'SIGKILL'); } catch { hijo.kill('SIGKILL'); }
    }
  }
  if (dirTemporal) {
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

describe('resumen del panel con los datos de Intereses', () => {
  const fila = async (nombre: string) => {
    const res = await pedir(`/api/panel/resumen?cursoId=${cursoId}`);
    expect(res.status, `Falló el resumen. Salida:\n${salida}`).toBe(200);
    return (await res.json()).find((r: { alumnoId: number }) => r.alumnoId === alumnos[nombre]);
  };

  it('cuenta las empresas a las que se ha enviado el CV', async () => {
    expect((await fila('Ana')).envios).toBe(3);
    expect((await fila('Luis')).envios).toBe(0);
  });

  it('esta seleccionado si alguna empresa lo ha solicitado', async () => {
    expect((await fila('Luis')).estadoSeleccion).toBe('SELECCIONADO');
  });

  it('enviar el CV no basta para estar seleccionado', async () => {
    expect((await fila('Ana')).estadoSeleccion).toBe('PENDIENTE');
  });

  it('sin intereses: cero envios y pendiente', async () => {
    const marta = await fila('Marta');
    expect(marta.envios).toBe(0);
    expect(marta.estadoSeleccion).toBe('PENDIENTE');
  });

  // GF-73: match = envio y solicitud con la MISMA empresa.
  it('enviar CV o ser solicitado por separado no es match', async () => {
    expect((await fila('Ana')).tieneMatch).toBe(0);
    expect((await fila('Luis')).tieneMatch).toBe(0);
  });

  it('enviar el CV a la empresa que lo ha solicitado es match', async () => {
    const empresas = await (await pedir('/api/empresas')).json();
    const e1 = empresas.find((e: { nombre: string }) => e.nombre === 'Empresa 1').id;
    const e2 = empresas.find((e: { nombre: string }) => e.nombre === 'Empresa 2').id;
    // A otra empresa: sigue sin match.
    await crear('/api/intereses', { alumnoId: alumnos.Luis, empresaId: e2, interesado: 'alumno' });
    expect((await fila('Luis')).tieneMatch).toBe(0);
    // A la que lo solicito: match.
    await crear('/api/intereses', { alumnoId: alumnos.Luis, empresaId: e1, interesado: 'alumno' });
    expect((await fila('Luis')).tieneMatch).toBe(1);
  });
});
