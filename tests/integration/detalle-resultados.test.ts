import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  Guardado de los resultados de aprendizaje de un ciclo.
//
//  Los RA se han movido a su propia pantalla, y con ellos su propio endpoint. El
//  motivo de que sea endpoint y no un guardado mas del formulario del ciclo es
//  justo lo que mide este test: la pantalla de RA no conoce el nombre del ciclo,
//  ni su codigo, ni sus tutorias, y el guardado completo (`DetalleAcademicoDAO
//  .update`) reescribe todas las columnas. Si se usara ese, cada vez que el
//  profesor tocara un RA se le vaciaria el resto del ciclo sin que saltara
//  ningun error.
//
//  El recorrido es crear el ciclo -> guardar RA -> releer, comprobando que los
//  RA son los nuevos y que el resto de la fila esta intacta.
//
//  ⚠️ La BBDD es una copia temporal desechable: PORTABLE_EXECUTABLE_DIR apunta
//  a un directorio nuevo, asi que la del usuario no se toca.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = 'd'.repeat(64);

let hijo: ChildProcess | null = null;
let dirTemporal = '';
let base = '';
let salida = '';
let centroId = 0;
let detalleId = 0;

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

const conToken = { 'X-FFE-Token': TOKEN };

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
    throw new Error(`El servidor no arranco. Salida:\n${salida}`);
  }
};

const crear = async (ruta: string, cuerpo: unknown) => {
  const res = await pedir(ruta, conToken, 'POST', cuerpo);
  if (!res.ok) {
    throw new Error(`${ruta} devolvio ${res.status}: ${await res.text()}\nSalida:\n${salida}`);
  }
  return res.json();
};

const leerDetalle = async () => {
  const res = await pedir(`/api/centros/${centroId}/detalles`, conToken);
  expect(res.status, `Falló la lectura. Salida:\n${salida}`).toBe(200);
  return (await res.json()).find((d: any) => d.id === detalleId);
};

const guardarRA = async (resultadosAprendizaje: unknown) => {
  const res = await pedir(
    `/api/detalles-academicos/${detalleId}/resultados`,
    conToken,
    'PUT',
    { resultadosAprendizaje },
  );
  return res;
};

const RA = {
  id: 'ra-1',
  modulo: 'Lenguaje y Practica Musical',
  codigo: 'LPM',
  ra: '1',
  nombre: 'Analizar obra musical de forma critica',
  impartidoEmpresa: true,
  actividadFormativa: 'Analisis de casos',
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-resultados-'));
  await arrancar();

  // Solo se necesita que existan el profesor, el centro y el ciclo: lo que se
  // prueba despues son los RA y que el resto de la fila no se mueve.
  const profesor = await crear('/api/profesor', {
    nombre: 'Profe', apellidos: 'De Prueba', nif: '00000000A', email: 'profe@test.local', telefono: '600000000',
  });
  const centro = await crear('/api/centros', {
    profesorId: profesor.id,
    nombre: 'Centro pruebas',
    ciudad: 'Madrid',
    telefono: '900000000',
    email: 'centro@test.local',
    codigoCentro: 'CP1',
  });
  centroId = centro.id;

  const detalle = await crear('/api/detalles-academicos', {
    centroId: centro.id,
    ciclo: 'ADMINISTRACION',
    codigo: 'D1',
    nivel: '2º',
    grado: 'Grado Medio',
    regimen: 'Ordinario',
    codigoGrupo: 'G1',
    nombreCorto: 'Admin',
    tutorias: ['2025-10-01', '2025-10-08'],
  });
  detalleId = detalle.id;
}, 60_000);

afterAll(async () => {
  await detener(hijo);
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

describe('resultados de aprendizaje de un ciclo', () => {
  it('un ciclo nuevo arranca sin RA', async () => {
    const detalle = await leerDetalle();
    expect(detalle.resultadosAprendizaje).toEqual([]);
  });

  it('se guardan y se releen tal cual', async () => {
    const res = await guardarRA([RA]);
    expect(res.status, `Falló el guardado. Salida:\n${salida}`).toBe(200);

    const detalle = await leerDetalle();
    expect(detalle.resultadosAprendizaje).toEqual([RA]);
  });

  // El motivo de que esta pantalla tenga su propio endpoint. Se manda solo la
  // lista de RA, asi que las demas columnas no se tocan: si el guardado fuera el
  // del ciclo entero, aqui se quedarian vacias.
  it('el resto del ciclo sobrevive al guardado de los RA', async () => {
    const detalle = await leerDetalle();
    expect(detalle.ciclo).toBe('ADMINISTRACION');
    expect(detalle.codigo).toBe('D1');
    expect(detalle.nivel).toBe('2º');
    expect(detalle.grado).toBe('Grado Medio');
    expect(detalle.regimen).toBe('Ordinario');
    expect(detalle.codigoGrupo).toBe('G1');
    expect(detalle.nombreCorto).toBe('Admin');
    expect(detalle.tutorias).toEqual(['2025-10-01', '2025-10-08']);
  });

  it('se pueden editar y borrar, y queda el ultimo estado', async () => {
    const editado = { ...RA, nombre: 'Analizar obra musical de forma critica y escrita' };
    const segundo = { ...RA, id: 'ra-2', ra: '2', nombre: 'Interpretar obra musical' };

    expect((await guardarRA([editado, segundo])).status).toBe(200);
    expect((await leerDetalle()).resultadosAprendizaje).toEqual([editado, segundo]);

    // Bajar a uno solo tiene que dejar el que queda, no acumular ninguno.
    expect((await guardarRA([editado])).status).toBe(200);
    expect((await leerDetalle()).resultadosAprendizaje).toEqual([editado]);
  });

  it('se pueden borrar todos', async () => {
    expect((await guardarRA([])).status).toBe(200);
    expect((await leerDetalle()).resultadosAprendizaje).toEqual([]);
  });
});

describe('el endpoint de RA rechaza lo que no es una lista', () => {
  it('un ciclo que no existe da 404', async () => {
    const res = await pedir('/api/detalles-academicos/999999/resultados', conToken, 'PUT', {
      resultadosAprendizaje: [RA],
    });
    expect(res.status).toBe(404);
  });

  it('una lista que no es un array da 400 y no toca nada', async () => {
    expect((await guardarRA([RA])).status).toBe(200);

    const res = await guardarRA({ module: 'esto es un objeto' });
    expect(res.status).toBe(400);

    // Rechazar el guardado no puede haber dejado los RA a medias: o se
    // escriben todos o no se escribe nada.
    expect((await leerDetalle()).resultadosAprendizaje).toEqual([RA]);
  });
});
