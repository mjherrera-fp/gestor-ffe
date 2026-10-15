import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
// El mismo motor que usa la aplicacion, para que la base se pueda fabricar con
// el mismo cifrado que encontrara al abrirla.
import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  Ida y vuelta de los dias no lectivos de un alumno.
//
//  El riesgo que se mide aqui no es que el guardado falle, sino que falle en
//  silencio. Los dias no viven en la tabla `alumnos`: viven aparte, y el
//  formulario de edicion reemplaza la lista de alumnos por la que llega del
//  servidor. Si esa lectura no los trae, abrir la relacion y guardarla otra vez
//  los borraria, y el profesor no veria ningun error: solo que sus dias
//  preferencias han desaparecido.
//
//  Por eso el recorrido es crear -> leer -> editar -> guardar -> releer, que es
//  exactamente la secuencia en la que se perderian. Se mide por la API, igual
//  que el usuario, y no mirando la tabla.
//
//  ⚠️ La BBDD es una copia temporal desechable: PORTABLE_EXECUTABLE_DIR apunta
//  a un directorio nuevo, asi que la del usuario no se toca.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = 'c'.repeat(64);

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

// El recorrido necesita una relacion real, asi que se monta el minimo:
// profesor -> curso -> detalle -> centro -> empresa -> convenio -> alumno.
let relacionId = 0;
let alumnoId = 0;

const crear = async (ruta: string, cuerpo: unknown) => {
  const res = await pedir(ruta, conToken, 'POST', cuerpo);
  if (!res.ok) {
    throw new Error(`${ruta} devolvio ${res.status}: ${await res.text()}\nSalida:\n${salida}`);
  }
  return res.json();
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-festivos-'));
  await arrancar();

  // Los NOT NULL se rellenan de forma explicita porque el recorrido solo
  // necesita que esas filas existan: lo que se prueba despues son los dias, no
  // estos datos. El orden importa por las claves foraneas: profesor -> centro
  // y curso -> detalle, empresa -> convenio, y el alumno depende de curso y
  // detalle a la vez.
  const profesor = await crear('/api/profesor', {
    nombre: 'Profe', apellidos: 'De Prueba', nif: '00000000A', email: 'profe@test.local', telefono: '600000000',
  });
  const curso = await crear('/api/cursos', {
    descripcion: 'Curso pruebas', fechaInicio: '2025-09-01', fechaFin: '2026-06-30',
  });
  const centro = await crear('/api/centros', {
    profesorId: profesor.id,
    nombre: 'Centro pruebas',
    ciudad: 'Madrid',
    telefono: '900000000',
    email: 'centro@test.local',
    codigoCentro: 'CP1',
    festivos: ['2025-12-06'],
  });
  const detalle = await crear('/api/detalles-academicos', {
    centroId: centro.id,
    ciclo: 'ADMINISTRACION',
    codigo: 'D1',
    nivel: '2º',
    grado: 'Grado Medio',
    regimen: 'Ordinario',
    codigoGrupo: 'G1',
  });
  const empresa = await crear('/api/empresas', {
    nombre: 'Empresa pruebas',
    direccion: 'Calle Prueba 1',
    ciudad: 'Madrid',
    cif: 'B00000001',
    email: 'empresa@test.local',
    tlfn: '900000001',
  });
  // /api/convenios envuelve el convenio en `{ convenio }`, a diferencia del
  // resto de endpoints de este recorrido.
  const convenio = await crear('/api/convenios', {
    convenio: {
      empresaId: empresa.id,
      centroId: centro.id,
      cursoId: curso.id,
      numConvenio: 'CV-1',
      fechaConvenio: '2025-09-01',
      estado: 'COMPLETADO',
    },
  });
  // La relacion exige un tutor de empresa, que ademas se usa para el snapshot
  // del historico.
  const tutor = await crear('/api/tutores-empresa', {
    empresaId: empresa.id,
    nombre: 'Tutor', apellidos: 'De Prueba', nif: '00000000B',
    email: 'tutor@test.local', tlfn: '900000002',
  });
  const alumno = await crear('/api/alumnos', {
    nombre: 'Alumno',
    apellidos: 'De Prueba',
    dni: '00000000T',
    numSS: '0000000000000000',
    tlfn: '600000002',
    emailEduca: 'alumno@test.local',
    emailPersonal: 'alumno@test.local',
    fechaNacimiento: '2005-01-01',
    totalHorasFFE: 100,
    cursoId: curso.id,
    detalleAcademicoId: detalle.id,
  });
  alumnoId = alumno.id;

  // Festivo heredado del centro + un dia suelto que el alumno no asiste.
  const relacion = await crear('/api/relaciones-alumnos', {
    convenioId: convenio.id,
    tutorEmpresaId: tutor.id,
    numRelacion: 'R-1',
    estado: 'PENDIENTE_ENVIAR_EMPRESA',
    horario: {
      lunes: { inicio: '09:00', fin: '17:00', horas: 8 },
      martes: { inicio: '09:00', fin: '17:00', horas: 8 },
      miercoles: { inicio: '09:00', fin: '17:00', horas: 8 },
      jueves: { inicio: '09:00', fin: '17:00', horas: 8 },
      viernes: { inicio: '09:00', fin: '17:00', horas: 8 },
      sabado: { inicio: '', fin: '', horas: 0 },
      domingo: { inicio: '', fin: '', horas: 0 },
    },
    alumnos: [{
      id: alumno.id,
      totalHorasFFE: 100,
      fechaInicio: '2025-10-01',
      fechaFin: '2025-11-28',
      festivosPersonalizados: [
        { fecha: '2025-12-06', tipo: 'QUITAR' },
        { fecha: '2025-10-13', tipo: 'ANADIR' },
      ],
    }],
  });
  relacionId = relacion.id;
}, 60_000);

// Se guardan en el orden en que se van a ejecutar, porque cada uno deja la
// relacion en un estado del que parte el siguiente.
const guardarDiasDeTodos = async (personalizados: { fecha: string; tipo: string }[]) => {
  const rel = await leerRelacion();
  const alumnos = rel.alumnos.map((a: any) =>
    a.id === alumnoId ? { ...a, festivosPersonalizados: personalizados } : a
  );
  const res = await pedir(`/api/relaciones-alumnos/${relacionId}`, conToken, 'PUT', { ...rel, alumnos });
  expect(res.status, `Falló el guardado. Salida:\n${salida}`).toBe(200);
  return (await leerRelacion()).alumnos.find((a: any) => a.id === alumnoId);
};

afterAll(async () => {
  await detener(hijo);
  if (dirTemporal) {
    // En Windows el servidor puede soltar el archivo de la base un instante
    // despues de morir, y un rmSync inmediato falla con EPERM. Reintentar
    // unas veces evita que el test pase y aun asi ensucie el temporal.
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

const leerRelacion = async () => {
  const res = await pedir(`/api/relaciones-alumnos/${relacionId}`, conToken);
  expect(res.status, `Falló la lectura. Salida:\n${salida}`).toBe(200);
  return res.json();
};

describe('dias no lectivos de un alumno', () => {
  it('se guardan al crear la relacion', async () => {
    const rel = await leerRelacion();
    const alu = rel.alumnos.find((a: any) => a.id === alumnoId);
    expect(alu.festivosPersonalizados).toEqual([
      { fecha: '2025-10-13', tipo: 'ANADIR' },
      { fecha: '2025-12-06', tipo: 'QUITAR' },
    ]);
  });

  // El caso que motiva el test: abrir y guardar sin tocar los dias no debe
  // borrarlos. El formulario manda la lista de alumnos tal y como la recibio, asi
  // que si la lectura no los trae, el guardado los eliminaria en silencio.
  it('sobreviven a abrir y guardar la relacion sin tocarlos', async () => {
    const rel = await leerRelacion();
    const res = await pedir(`/api/relaciones-alumnos/${relacionId}`, conToken, 'PUT', rel);
    expect(res.status, `Falló el guardado. Salida:\n${salida}`).toBe(200);

    const alu = (await leerRelacion()).alumnos.find((a: any) => a.id === alumnoId);
    expect(alu.festivosPersonalizados).toEqual([
      { fecha: '2025-10-13', tipo: 'ANADIR' },
      { fecha: '2025-12-06', tipo: 'QUITAR' },
    ]);
  });

  // Lo que pinta el calendario de solo lectura del listado: el festivo del
  // centro que el alumno quito no aparece, y el dia que añadio si.
  it('el listado los lee ya aplicados sobre los festivos heredados', async () => {
    const res = await pedir(`/api/relaciones-alumnos/${relacionId}/dias-no-lectivos?alumnoId=${alumnoId}`, conToken);
    expect(res.status, `Falló la lectura. Salida:\n${salida}`).toBe(200);
    expect((await res.json()).festivos).toEqual(['2025-10-13']);
  });

  it('no los da para un alumno que no es de la relacion', async () => {
    const res = await pedir(`/api/relaciones-alumnos/${relacionId}/dias-no-lectivos?alumnoId=999999`, conToken);
    expect(res.status).toBe(404);
  });

  it('se pueden cambiar y se guarda el ultimo estado', async () => {
    const alu = await guardarDiasDeTodos([{ fecha: '2025-10-20', tipo: 'ANADIR' }]);
    expect(alu.festivosPersonalizados).toEqual([{ fecha: '2025-10-20', tipo: 'ANADIR' }]);
  });

  it('se pueden borrar todos', async () => {
    const alu = await guardarDiasDeTodos([]);
    expect(alu.festivosPersonalizados).toEqual([]);
  });

  // Desvincular un alumno es lo mismo que quitarle las fechas: sus dias
  // describen las horas de una relacion que ya no tiene, asi que no pueden
  // sobrevivir a que se le saque de ella. Si sobrevivieran, volverian a aparecer
  // solos la proxima vez que se le vinculara.
  it('se pierden cuando el alumno sale de la relacion', async () => {
    await guardarDiasDeTodos([
      { fecha: '2025-10-13', tipo: 'ANADIR' },
      { fecha: '2025-12-06', tipo: 'QUITAR' },
    ]);

    const rel = await leerRelacion();
    const res = await pedir(`/api/relaciones-alumnos/${relacionId}`, conToken, 'PUT', {
      ...rel, alumnos: [],
    });
    expect(res.status, `Falló el guardado. Salida:\n${salida}`).toBe(200);
    expect((await leerRelacion()).alumnos).toEqual([]);

    // Se vuelve a vincular el mismo alumno, con horas pero sin ningun dia propio,
    // y no debe conservar nada de lo que tenia antes.
    const revinculado = await pedir(`/api/relaciones-alumnos/${relacionId}`, conToken, 'PUT', {
      ...rel,
      alumnos: [{
        id: alumnoId,
        totalHorasFFE: 100,
        fechaInicio: '2025-10-01',
        fechaFin: '2025-11-28',
      }],
    });
    expect(revinculado.status, `Falló la revinculación. Salida:\n${salida}`).toBe(200);

    const alu = (await leerRelacion()).alumnos.find((a: any) => a.id === alumnoId);
    expect(alu.festivosPersonalizados).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Instalacion que ya existia.
//
//  El resto del recorrido arranca contra una base nueva, donde la tabla se crea
//  con el resto del esquema y esta separacion nunca se nota. Falta el caso del
//  otro lado: una instalacion de la que ya usaba el profesor, con su esquema
//  anterior y sin la tabla. Si ahi la migracion fallara, la tabla no existiria y
//  el guardado de dias reventaria al escribir en ella, con un error que solo
//  apareceria a quien actualice.
//
//  La base se fabrica a mano en v2 sin la tabla, que es como estaba antes de este
//  cambio, y se arranca el servidor contra ella. Se mide mirando el archivo:
//  aqui no hay API que leer, lo que se comprueba es que la tabla se creo.
// ─────────────────────────────────────────────────────────────────────────────

describe('comentario de un alumno', () => {
  const leerAlumno = async () => {
    const res = await pedir('/api/alumnos', conToken);
    expect(res.status, `Falló la lectura. Salida:\n${salida}`).toBe(200);
    return (await res.json()).find((a: any) => a.id === alumnoId);
  };
  const guardarComentario = async (comentario: string) => {
    const res = await pedir(`/api/alumnos/${alumnoId}`, conToken, 'PUT', { ...(await leerAlumno()), comentario });
    expect(res.status, `Falló el guardado. Salida:\n${salida}`).toBe(200);
    return leerAlumno();
  };

  it('se guarda y se vuelve a leer', async () => {
    const alumno = await guardarComentario('Necesita adaptacion de horario.\nVer con jefatura.');
    expect(alumno.comentario).toBe('Necesita adaptacion de horario.\nVer con jefatura.');
  });

  it('vaciarlo lo deja sin comentario', async () => {
    const alumno = await guardarComentario('   ');
    expect(alumno.comentario).toBeNull();
  });
});

describe('migracion de una instalacion anterior', () => {
  let hijoMigra: ChildProcess | null = null;
  let dirMigra = '';
  let salidaMigra = '';
  let baseMigra = '';

  const arrancarEn = async (directorio: string): Promise<{ hijo: ChildProcess; salida: string }> => {
    const puerto = await puertoLibre();
    const raiz = path.resolve(__dirname, '../..');
    const tsxCli = path.join(raiz, 'node_modules/tsx/dist/cli.mjs');

    let texto = '';
    const proceso = spawn(process.execPath, [tsxCli, 'server.ts'], {
      cwd: raiz,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(puerto),
        PORTABLE_EXECUTABLE_DIR: directorio,
        FFE_SESSION_TOKEN: TOKEN,
      },
      stdio: 'pipe',
    });
    proceso.stdout?.on('data', d => { texto += d.toString(); });
    proceso.stderr?.on('data', d => { texto += d.toString(); });

    baseMigra = `http://127.0.0.1:${puerto}`;
    if (!(await esperarArranque(`${baseMigra}/`))) {
      throw new Error(`El servidor no arranco. Salida:\n${texto}`);
    }
    return { hijo: proceso, salida: texto };
  };

  it('crea los dias no lectivos de los alumnos que ya estaban', async () => {
    dirMigra = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-migracion-'));

    // Se escribe la base con el esquema de la version anterior: la de un
    // profesor que ya estaba usando la aplicacion. Sin la tabla de dias, que es
    // justo lo que la migracion tiene que aportar.
    const dbVieja = path.join(dirMigra, 'ffe_management.db');
    const db = new Database(dbVieja);
    db.exec(`
      CREATE TABLE alumnos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellidos TEXT NOT NULL
      );
      INSERT INTO alumnos (nombre, apellidos) VALUES ('Alumno', 'Anterior');
      PRAGMA user_version = 2;
    `);
    db.close();

    const arrancado = await arrancarEn(dirMigra);
    hijoMigra = arrancado.hijo;
    salidaMigra = arrancado.salida;

    // Con la tabla ya presente, el recorrido completo funciona: se crea la
    // relacion con sus dias y se vuelven a leer. Si la migracion no hubiera
    // creado la tabla, este guardado fallaria aqui.
    const profesor = await pedir('/api/profesor', conToken, 'POST', {
      nombre: 'Profe', apellidos: 'Migracion', nif: '00000000M', email: 'migracion@test.local', telefono: '600000009',
    });
    expect(profesor.status, `Falló la creación. Salida:\n${salidaMigra}`).toBe(200);

    // Y la version del esquema ha subido, que es lo que impide que la migracion
    // se intente de nuevo en cada arranque.
    const dbFinal = new Database(dbVieja, { readonly: true });
    const tablas = dbFinal
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='alumnos_festivos_personalizados'")
      .get();
    const columnas = (dbFinal.prepare('PRAGMA table_info(alumnos)').all() as Array<{ name: string }>).map(c => c.name);
    const version = Number(dbFinal.pragma('user_version', { simple: true }));
    dbFinal.close();

    expect(tablas, 'La migracion no creo la tabla de dias').toBeTruthy();
    // Las migraciones posteriores tambien se aplican en el mismo arranque.
    expect(columnas, 'La migracion no creo la columna comentario').toContain('comentario');
    expect(version).toBe(4);
  }, 90_000);

  afterAll(async () => {
    await detener(hijoMigra);
    if (dirMigra) {
      for (let intento = 0; intento < 5; intento++) {
        try {
          fs.rmSync(dirMigra, { recursive: true, force: true });
          break;
        } catch {
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
  });
});
