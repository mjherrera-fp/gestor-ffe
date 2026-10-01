import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  Las horas que salen en la pestaña Valoración del Panel.
//
//  La columna se titula "Horas FFE" y lo que tiene que decir son las horas del
//  nivel del alumno, con las que le faltan a fecha de evaluación entre
//  paréntesis. Antes ponía las horas realizadas, que es un número distinto: un
//  alumno con 500h de nivel y 380 cumplidas aparecía como "380h", que se lee
//  como si tuviera 380h que hacer en vez de 120.
//
//  El caso que hay que vigilar es 2º. Allí `horasRealizadas` lleva las horas del
//  curso anterior además de las de este nivel, porque son horas que el alumno ya
//  ha hecho. Restar eso de las 500-500 del nivel da siempre cero, que es
//  justo lo contrario de lo que hay que enseñarle al profesor. Por eso el
//  pendiente se mide contra las horas de este nivel.
//
//  ⚠️ La BBDD es una copia temporal desechable: PORTABLE_EXECUTABLE_DIR apunta
//  a un directorio nuevo, así que la del usuario no se toca.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = 'h'.repeat(64);

let hijo: ChildProcess | null = null;
let dirTemporal = '';
let base = '';
let salida = '';

const conToken = { 'X-FFE-Token': TOKEN };

const pedir = (ruta: string, metodo = 'GET', cuerpo?: unknown) =>
  fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...conToken },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

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

const crear = async (ruta: string, cuerpo: unknown) => {
  const res = await pedir(ruta, 'POST', cuerpo);
  if (!res.ok) {
    throw new Error(`${ruta} devolvió ${res.status}: ${await res.text()}\nSalida:\n${salida}`);
  }
  return res.json() as Promise<any>;
};

// Fechas elegidas para que el avance sea justo la mitad: del 1 de enero al 31 de
// diciembre de 2025 hay 364 días, y el 2 de julio es el día 182. Con eso
// `horasDeEsteNivel` sale exacta y el pendiente se puede comprobar sin tolerancias
// ni redondeos que escondan un error.
const INICIO = '2025-01-01';
const FIN = '2025-12-31';
const MITAD = '2025-07-02';

let cursoId = 0;

const crearAlumno = async (
  nombre: string,
  nivel: string,
  totalHorasFFE: number,
  conFechas: boolean,
  clave: number,
) => {
  const detalle = await crear('/api/detalles-academicos', {
    centroId: 1,
    ciclo: 'ADMINISTRACION',
    codigo: `D-${clave}`,
    nivel,
    grado: 'Grado Medio',
    regimen: 'Ordinario',
    codigoGrupo: `G-${clave}`,
    nombreCorto: nombre,
    tutorias: ['2025-10-01'],
  });

  // DNI, teléfono y correos tienen que ser distintos entre alumnos: el endpoint
  // rechaza los que se repiten, y da igual que sean inventados.
  const sufijo = String(clave).padStart(2, '0');

  return crear('/api/alumnos', {
    nombre,
    apellidos: 'Horas',
    dni: `00000${sufijo}A`,
    numSS: `1234567890${sufijo}`,
    tlfn: `6000000${sufijo}`,
    emailEduca: `${nombre.toLowerCase()}@edu.test.local`,
    emailPersonal: `${nombre.toLowerCase()}@personal.test.local`,
    fechaNacimiento: '2005-01-15',
    cursoId,
    detalleAcademicoId: detalle.id,
    totalHorasFFE,
    ...(conFechas ? { fechaInicio: INICIO, fechaFin: FIN } : {}),
  });
};

const informe = async (fechaEvaluacion: string) => {
  const res = await pedir(`/api/ffe/informe?cursoId=${cursoId}&fechaEvaluacion=${fechaEvaluacion}`);
  if (!res.ok) throw new Error(`informe devolvió ${res.status}: ${await res.text()}`);
  return (await res.json()) as any[];
};

const filaDe = (rows: any[], nombre: string) => {
  const fila = rows.find(r => r.nombre === nombre);
  expect(fila, `no salió el alumno ${nombre} en el informe`).toBeDefined();
  return fila!;
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-informe-horas-'));
  await arrancar();

  // El informe se filtra por curso, así que hace falta uno aunque no se use para
  // nada más.
  const curso = await crear('/api/cursos', {
    descripcion: 'Curso de prueba',
    fechaInicio: '2025-01-01',
    fechaFin: '2026-06-30',
  });
  cursoId = curso.id;

  await crear('/api/profesor', {
    nombre: 'Profe', apellidos: 'Horas', nif: '00000000H', email: 'horas@test.local', telefono: '600000001',
  });
  await crear('/api/centros', {
    profesorId: 1,
    nombre: 'Centro horas',
    ciudad: 'Madrid',
    telefono: '900000001',
    email: 'centro-horas@test.local',
    codigoCentro: 'CH1',
  });

  // 1º con las horas del nivel entero, 2º solo con las que le tocan de este
  // curso (de las 500h del ciclo, 300 fueron el año pasado), y uno sin fechas
  // para el caso de que no tenga nada hecho.
  await crearAlumno('Primero', '1º', 500, true, 1);
  await crearAlumno('Segundo', '2º', 200, true, 2);
  await crearAlumno('Tercero', '1º', 500, false, 3);
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

describe('las horas de la pestaña Valoración', () => {
  it('1º: las horas del nivel, con las pendientes a mitad de curso', async () => {
    const fila = filaDe(await informe(MITAD), 'Primero');

    expect(fila.totalHorasFFE).toBe(500);
    expect(fila.horasPendientes).toBe(250);
  });

  it('2º: las pendientes son las de este nivel, no total menos las realizadas', async () => {
    const fila = filaDe(await informe(MITAD), 'Segundo');

    // Las horas del nivel de 2º son 200, y a mitad de curso se han hecho 100.
    expect(fila.totalHorasFFE).toBe(200);
    expect(fila.horasPendientes).toBe(100);

    // Las realizadas son 400 porque llevan las 300h del curso anterior, que ya
    // están hechas pero no son de este nivel. Restar eso de 200 daba 0 siempre,
    // que es el fallo que justifica medirlo aparte.
    expect(fila.horasRealizadas).toBe(400);
    expect(fila.totalHorasFFE - fila.horasRealizadas).toBeLessThan(0);
  });

  it('sin horas cumplidas, lo pendiente es todo el nivel', async () => {
    // Sin fechas no hay nada hecho, así que no queda nada menos que el total.
    // La columna dice las horas del nivel y, entre paréntesis, las que faltan:
    // en un alumno que no empezó, es lo mismo y tiene que verse así.
    const fila = filaDe(await informe(MITAD), 'Tercero');

    expect(fila.totalHorasFFE).toBe(500);
    expect(fila.horasPendientes).toBe(500);
  });

  it('terminado el curso no queda nada pendiente', async () => {
    const fila = filaDe(await informe('2026-01-15'), 'Primero');

    expect(fila.totalHorasFFE).toBe(500);
    // La fecha de evaluación se pasa del final, y las horas no se cuentan más
    // allá de `fechaFin`: el pendiente se queda en 0 en vez de ponerse negativo.
    expect(fila.horasPendientes).toBe(0);
  });

  it('antes de empezar, el pendiente es el nivel entero', async () => {
    const fila = filaDe(await informe('2024-12-01'), 'Primero');

    expect(fila.horasPendientes).toBe(500);
  });
});