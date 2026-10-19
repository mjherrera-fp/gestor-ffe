import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  Qué adjunto se manda por correo cuando hay algo en el gestor documental.
//
//  El orden que se decide aquí es el del envío de correo: primero el gestor
//  documental, y solo si no hay nada subido el documento que genera la
//  aplicación. El motivo es que el documento autogenerado es un borrador de
//  trabajo, mientras que lo que el profesor sube o corrige en el gestor es lo
//  que ha revisado. Mandar el autogenerado por delante no es "enviar un
//  documento", es enviar el equivocado.
//
//  Lo que mide el endpoint `/api/documentos/adjunto` es justo esa consulta de
//  "última versión": que elija la de número más alto, no la primera que se
//  guardó, y que un 404 signifique "no hay nada" y no "error". El cliente usa
//  ese 404 como la señal de que toca generar.
//
//  ⚠️ La BBDD es una copia temporal desechable: PORTABLE_EXECUTABLE_DIR apunta
//  a un directorio nuevo, así que la del usuario no se toca.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = 'e'.repeat(64);

let hijo: ChildProcess | null = null;
let dirTemporal = '';
let base = '';
let salida = '';

let relacionId = 0;
let alumnoId = 0;
let detalleId = 0;
let convenioId = 0;

/**
 * Pide al servidor. Si el cuerpo ya es un `FormData` va tal cual, sin
 * `Content-Type`: es multipart y el servidor pone el boundary, así que
 * forzar `application/json` rompe el archivo.
 */
const pedir = (
  ruta: string,
  cabeceras: Record<string, string> = {},
  metodo = 'GET',
  cuerpo?: unknown,
) => {
  const esForm = typeof FormData !== 'undefined' && cuerpo instanceof FormData;
  return fetch(`${base}${ruta}`, {
    method: metodo,
    headers: esForm ? cabeceras : { 'Content-Type': 'application/json', ...cabeceras },
    body: cuerpo === undefined ? undefined : esForm ? (cuerpo as FormData) : JSON.stringify(cuerpo),
  });
};

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
    throw new Error(`El servidor no arrancó. Salida:\n${salida}`);
  }
};

const crear = async (ruta: string, cuerpo: unknown) => {
  const res = await pedir(ruta, conToken, 'POST', cuerpo);
  if (!res.ok) {
    throw new Error(`${ruta} devolvió ${res.status}: ${await res.text()}\nSalida:\n${salida}`);
  }
  return res.json();
};

/**
 * Sube un documento al gestor documental. Va como `multipart/form-data` porque
 * la ruta es la de `multer`, no la de JSON.
 *
 * El fichero va primero, igual que en `GestorDocumentalModal`. Los campos de
 * texto que van después son los que `multer` llega a poner en `req.body`, y si
 * se cambian de sitio el nombre del fichero sale autogenerado en lugar del
 * enviado, que es justo lo que este test comprueba.
 */
const subirDocumento = async (
  apiPath: string,
  campos: Record<string, string | number>,
  nombre: string,
  contenido = 'contenido de prueba',
) => {
  const form = new FormData();
  form.append('file', new Blob([contenido], { type: 'application/pdf' }), nombre);
  for (const [k, v] of Object.entries(campos)) form.append(k, String(v));
  form.append('nombreFichero', nombre);

  const res = await fetch(`${base}/api/documentos/${apiPath}`, {
    method: 'POST',
    headers: conToken,
    body: form,
  });
  if (!res.ok) {
    throw new Error(`subir ${apiPath} devolvió ${res.status}: ${await res.text()}\nSalida:\n${salida}`);
  }
  return (await res.json()) as { id: number; version: number; nombreFichero: string };
};

const buscarAdjunto = (params: Record<string, string | number>) => {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) query.set(k, String(v));
  return pedir(`/api/documentos/adjunto?${query.toString()}`, conToken);
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-adjuntos-'));
  await arrancar();

  // Cadena mínima para poder colgar documentos: profesor -> centro -> ciclo ->
  // alumno, y empresa -> convenio -> relación.
  const profesor = await crear('/api/profesor', {
    nombre: 'Profe', apellidos: 'Adjuntos', nif: '00000000B', email: 'adjuntos@test.local', telefono: '600000001',
  });
  const centro = await crear('/api/centros', {
    profesorId: profesor.id,
    nombre: 'Centro adjuntos',
    ciudad: 'Madrid',
    telefono: '900000001',
    email: 'centro-aj@test.local',
    codigoCentro: 'CA1',
  });
  const detalle = await crear('/api/detalles-academicos', {
    centroId: centro.id,
    ciclo: 'ADMINISTRACION',
    codigo: 'DA1',
    nivel: '2º',
    grado: 'Grado Medio',
    regimen: 'Ordinario',
    codigoGrupo: 'GA1',
    nombreCorto: 'Admin',
    tutorias: ['2025-10-01'],
  });

  detalleId = detalle.id;

  const alumno = await crear('/api/alumnos', {
    nombre: 'Alumno', apellidos: 'De Prueba', dni: '12345678Z', numSS: '12345678901',
    tlfn: '600000010', emailEduca: 'alumno@edu.test.local', emailPersonal: 'alumno@personal.test.local',
    fechaNacimiento: '2005-01-15', totalHorasFFE: 0, detalleAcademicoId: detalle.id,
  });
  alumnoId = alumno.id;

  const empresa = await crear('/api/empresas', {
    nombre: 'Talleres Adjuntos', email: 'empresa@adjuntos.test.local', tlfn: '900000002',
    personaContacto: 'Luis', direccion: 'Calle Mayor 1', ciudad: 'Madrid', cif: 'B12345678',
  });
  const convenio = await crear('/api/convenios', {
    convenio: {
      empresaId: empresa.id,
      cursoId: null,
      centroId: centro.id,
      numConvenio: 'CV-1',
      fechaConvenio: '2025-09-01',
      estado: 'COMPLETADO',
    },
  });
  convenioId = convenio.id;

  const tutor = await crear('/api/tutores-empresa', {
    empresaId: empresa.id,
    nombre: 'Marta', apellidos: 'Gómez', email: 'tutor@adjuntos.test.local',
    tlfn: '600000020', nif: '00000000C',
  });

  const relacion = await crear('/api/relaciones-alumnos', {
    convenioId: convenio.id,
    tutorEmpresaId: tutor.id,
    numRelacion: 'R-2025-ADJ',
    horario: {},
    estado: 'EN_CURSO',
    alumnos: [{ id: alumno.id, fechaInicio: '2025-10-01', fechaFin: '2026-06-30' }],
  });
  relacionId = relacion.id;
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

describe('la última versión del gestor documental', () => {
  it('sin nada subido responde 404, que es la señal de que toca generar', async () => {
    const res = await buscarAdjunto({ tipo: 'relacion', relacionId });
    expect(res.status, `Salida:\n${salida}`).toBe(404);
  });

  it('devuelve la versión que se acaba de subir', async () => {
    const subido = await subirDocumento('relacion', { relacionId }, 'PRIMERA.pdf', 'primera');
    expect(subido.version).toBe(1);

    const res = await buscarAdjunto({ tipo: 'relacion', relacionId });
    expect(res.status).toBe(200);

    const doc = await res.json();
    expect(doc.id).toBe(subido.id);
    expect(doc.version).toBe(1);
    expect(doc.nombreFichero).toBe('PRIMERA.pdf');
  });

  it('al resubmitir, manda la más nueva y no la primera', async () => {
    const segundo = await subirDocumento('relacion', { relacionId }, 'SEGUNDA.pdf', 'segunda');
    expect(segundo.version).toBe(2);

    const doc = await (await buscarAdjunto({ tipo: 'relacion', relacionId })).json();
    // Este es el motivo de que la consulta lleve `ORDER BY version DESC`: se
    // elige la última, no la que se subió la primera vez.
    expect(doc.version).toBe(2);
    expect(doc.nombreFichero).toBe('SEGUNDA.pdf');
  });

  it('el id que devuelve se puede descargar y trae el contenido de esa versión', async () => {
    const doc = await (await buscarAdjunto({ tipo: 'relacion', relacionId })).json();

    const res = await pedir(`/api/documentos/relacion/${doc.id}/download`, conToken);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('segunda');
  });

  it('los documentos de alumno se buscan por alumno, no por relación', async () => {
    expect((await buscarAdjunto({ tipo: 'plan-formativo', relacionId })).status).toBe(400);

    const subido = await subirDocumento(
      'plan-formativo',
      { relacionId, alumnoId },
      'PLFO.pdf',
      'plan del alumno',
    );

    const res = await buscarAdjunto({ tipo: 'plan-formativo', relacionId, alumnoId });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(subido.id);
  });

  it('un alumno sin documento propio no hereda el de otro', async () => {
    const otro = await crear('/api/alumnos', {
      nombre: 'Otro', apellidos: 'Alumno', dni: '87654321X', numSS: '98765432109',
      tlfn: '600000011', emailEduca: 'otro@edu.test.local', emailPersonal: 'otro@personal.test.local',
      fechaNacimiento: '2004-03-20', totalHorasFFE: 0, detalleAcademicoId: detalleId,
    });

    const res = await buscarAdjunto({ tipo: 'plan-formativo', relacionId, alumnoId: otro.id });
    // Los documentos de alumno son de un alumno, no de la relación entera: si
    // no hay uno suyo, se genera el suyo, no se manda el del compañero.
    expect(res.status).toBe(404);
  });

  it('los tipos que no se archivan dan 404 y no se buscan', async () => {
    // Calendario y carta no tienen tabla: se generan al vuelo y no se suben.
    for (const tipo of ['calendario', 'carta']) {
      const res = await buscarAdjunto({ tipo, relacionId });
      expect(res.status, `${tipo} no debería buscar en el gestor`).toBe(404);
    }
  });

  it('faltan datos da 400, no 404', async () => {
    // No es lo mismo "no hay documento" (se genera) que "no me has dicho de
    // cuál" (es una llamada mal formada y hay que notar la diferencia).
    expect((await buscarAdjunto({ tipo: 'relacion' })).status).toBe(400);
    expect((await buscarAdjunto({ tipo: 'plan-formativo', relacionId })).status).toBe(400);
    expect((await buscarAdjunto({ tipo: 'desconocido', relacionId })).status).toBe(404);
    // El convenio cuelga del convenio, no de la relación: darle solo la
    // `relacionId` no vale, y si se aceptara acabaría buscando en la tabla
    // equivocada en lugar de decir que falta el dato.
    expect((await buscarAdjunto({ tipo: 'convenio' })).status).toBe(400);
    expect((await buscarAdjunto({ tipo: 'convenio', relacionId })).status).toBe(400);
  });
});

/**
 * El documento del convenio va por su propio camino: no cuelga de la relación
 * sino del convenio, y no se autogenera.
 *
 * El correo del convenio manda lo último que el profesor haya subido a su gestor
 * documental, y nada más. Si no ha subido nada, el correo sale sin adjunto en
 * lugar de llevar un documento generado que nadie ha revisado.
 */
describe('el documento del convenio', () => {
  it('sin nada subido responde 404, que aquí significa "sin adjunto"', async () => {
    const res = await buscarAdjunto({ tipo: 'convenio', convenioId });
    expect(res.status, `Salida:\n${salida}`).toBe(404);
  });

  it('manda la última versión subida, no la primera', async () => {
    const primera = await subirDocumento('convenio', { convenioId }, 'CONV_PRIMERA.pdf', 'primera');
    expect(primera.version).toBe(1);
    const segunda = await subirDocumento('convenio', { convenioId }, 'CONV_SEGUNDA.pdf', 'segunda');
    expect(segunda.version).toBe(2);

    const res = await buscarAdjunto({ tipo: 'convenio', convenioId });
    expect(res.status).toBe(200);

    const doc = await res.json();
    expect(doc.id).toBe(segunda.id);
    expect(doc.version).toBe(2);
    expect(doc.nombreFichero).toBe('CONV_SEGUNDA.pdf');
  });

  it('un convenio sin documento no hereda el de otro', async () => {
    const otro = await crear('/api/convenios', {
      convenio: {
        empresaId: 1,
        cursoId: null,
        centroId: 1,
        numConvenio: 'CV-OTRO',
        fechaConvenio: '2025-09-02',
        estado: 'COMPLETADO',
      },
    });

    const res = await buscarAdjunto({ tipo: 'convenio', convenioId: otro.id });
    // Los documentos son de un convenio, no de la empresa: si este no tiene
    // ninguno, no se manda el del convenio de al lado.
    expect(res.status).toBe(404);
  });

  it('el id que devuelve se puede descargar y trae el contenido de esa versión', async () => {
    const doc = await (await buscarAdjunto({ tipo: 'convenio', convenioId })).json();

    const res = await pedir(`/api/documentos/convenio/${doc.id}/download`, conToken);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('segunda');
  });
});

/**
 * La cadena que de verdad recorre el navegador al abrir el modal.
 *
 * Los tests de arriba dan por bueno que el endpoint responde. Este baja un
 * nivel: reproduce los tres pasos de `adjuntoDesdeGestor` uno detrás de otro,
 * con las mismas llamadas y en el mismo orden que hace el cliente. Si aquí
 * algo falla, el correo sale sin adjunto aunque todo lo anterior sea cierto.
 */
describe('la cadena de adjuntos tal y como la recorre el cliente', () => {
  /** `adjuntoDesdeGestor` a mano, para no depender del DOM. */
  const adjuntoComoElCliente = async (tipo: string, destino: Record<string, number>) => {
    // 1. Buscar la última versión. Los parámetros van con nombre, como en
    //    `DestinoDocumento`: el convenio cuelga del convenio y el resto de la
    //    relación, y mandar el identificador equivocado busca en otra tabla.
    const params = new URLSearchParams({ tipo });
    for (const [k, v] of Object.entries(destino)) params.set(k, String(v));
    const encontrado = await pedir(`/api/documentos/adjunto?${params.toString()}`, conToken);
    if (!encontrado.ok) return null;
    const doc = await encontrado.json();

    // 2. Descargarla por su ruta de siempre.
    const descarga = await pedir(`/api/documentos/${tipo}/${doc.id}/download`, conToken);
    if (!descarga.ok) return null;
    const blob = await descarga.blob();
    if (blob.size === 0) return null;

    // 3. Pasarla por el mismo camino que cualquier otro adjunto, que es lo que
    //    lee `/api/send-email`.
    const form = new FormData();
    form.append('file', blob, doc.nombreFichero);
    const subido = await pedir('/api/email/upload-attachment', conToken, 'POST', form);
    if (!subido.ok) return null;
    return { nombre: doc.nombreFichero, ...(await subido.json()) };
  };

  it('deja el adjunto listo para enviar, con el nombre de la versión buena', async () => {
    const att = await adjuntoComoElCliente('relacion', { relacionId });
    expect(att, 'la relación tiene dos versiones subidas; debería elegir una').not.toBeNull();
    //SEGUNDA.pdf es la última: es la que se sube al gestor y la que se manda.
    expect(att!.nombre).toBe('SEGUNDA.pdf');
    expect(att!.size).toBeGreaterThan(0);
    expect(att!.path).toMatch(/SEGUNDA\.pdf$/);
  });

  it('ese adjunto es el que ve el envío, con su ruta en disco', async () => {
    // `/api/send-email` lee `attachments[].path` del disco. Si la ruta que
    // devuelve el modal no apunta a un archivo real, el correo sale sin nada y
    // sin avisar, porque `nodemailer` se traga el error del adjunto.
    const att = await adjuntoComoElCliente('relacion', { relacionId });
    expect(att).not.toBeNull();
    expect(fs.existsSync(att!.path), `no existe el archivo en ${att!.path}`).toBe(true);
    expect(fs.readFileSync(att!.path, 'utf8')).toContain('segunda');
  });

  it('sin nada en el gestor no hay adjunto, para que se genere', async () => {
    // El signal para el cliente: `null` significa "no hay versión subida" y es
    // justo lo que hace caer al documento autogenerado.
    expect(await adjuntoComoElCliente('valoracion', { relacionId, alumnoId })).toBeNull();
  });

  it('el documento del convenio llega al envío con su nombre y su contenido', async () => {
    const att = await adjuntoComoElCliente('convenio', { convenioId });
    expect(att, 'el convenio tiene dos versiones subidas; debería elegir una').not.toBeNull();
    expect(att!.nombre).toBe('CONV_SEGUNDA.pdf');
    expect(fs.existsSync(att!.path), `no existe el archivo en ${att!.path}`).toBe(true);
    expect(fs.readFileSync(att!.path, 'utf8')).toContain('segunda');
  });

  it('un tipo que no es del convenio no busca nada aunque se le pase el convenio', async () => {
    // Los documentos de relación cuelgan de la relación. Con el convenio como
    // destino no sale ningún adjunto: el cliente ni llega a preguntar, y si se
    // preguntara sin `relacionId` el servidor respondería 400. Lo que no puede
    // pasar es que acabe mandando el documento de otra cosa.
    expect(await adjuntoComoElCliente('relacion', { convenioId })).toBeNull();
  });
});

/**
 * El anexo externo en modo "externo" apaga la autogeneración, no la búsqueda.
 *
 * El profesor tiene su propio documento porque su centro lo firma aparte. Eso
 * no significa que no pueda haber subido su versión al gestor documental: si la
 * ha subido, es la que ha revisado y es la que va. La regla es "no generes el
 * nuestro", no "no busques nada".
 *
 * Esta comprobación va sobre `adjuntar`, que es donde vive la decisión, y no
 * sobre el hook de React entero: es la función que decide de dónde sale el
 * adjunto en los seis envíos, así que si esto se cumple, se cumple en todos.
 */
describe('el modo externo del anexo de relación', () => {
  /** La parte de `adjuntar` que decide, sin React ni autogeneración. */
  const adjuntarComoElCliente = async (
    tipo: string,
    relId: number,
    generar: () => Promise<Blob | null>,
  ) => {
    const parametros = new URLSearchParams({ tipo, relacionId: String(relId) });
    const encontrado = await pedir(`/api/documentos/adjunto?${parametros.toString()}`, conToken);
    if (encontrado.ok) {
      const doc = await encontrado.json();
      const descarga = await pedir(`/api/documentos/${tipo}/${doc.id}/download`, conToken);
      if (descarga.ok) {
        const blob = await descarga.blob();
        if (blob.size > 0) return doc.nombreFichero;
      }
    }
    const blob = await generar();
    return blob ? 'autogenerado' : null;
  };

  it('con documento en el gestor lo manda, aunque esté en modo externo', async () => {
    // `generar` devuelve `null` en vez de un blob: es exactamente lo que hace el
    // hook cuando el anexo está en modo externo.
    const nombre = await adjuntarComoElCliente('relacion', relacionId, async () => null);
    expect(nombre).toBe('SEGUNDA.pdf');
  });

  it('sin documento en el gestor no genera nada, porque el modo está en externo', async () => {
    // El resultado es `null`, no 'autogenerado': el correo se abre sin adjunto y
    // el profesor sube el suyo.
    const nombre = await adjuntarComoElCliente('valoracion', relacionId, async () => null);
    expect(nombre).toBeNull();
  });

  it('en modo normal, si no hay en el gestor, genera', async () => {
    const nombre = await adjuntarComoElCliente('valoracion', relacionId, async () =>
      new Blob(['generado'], { type: 'application/pdf' })
    );
    expect(nombre).toBe('autogenerado');
  });
});
/**
 * El CV se guarda como data URI y se adjunta desde Intereses. Lo que llega al
 * destinatario tiene que ser exactamente el PDF que se subio: antes se
 * decodificaba tambien la cabecera `data:application/pdf;base64,`, el adjunto
 * salia con bytes de mas delante de `%PDF` y el correo lo marcaba como
 * sospechoso ("esperado pdf y encontrado .bin").
 */
describe('el CV adjunto desde Intereses', () => {
  it('es el mismo PDF que se subio, byte a byte', async () => {
    // Una cabecera de PDF real y bytes fuera de ASCII, que es donde cualquier
    // desplazamiento en el base64 se notaria.
    const pdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'),
      Buffer.from(Array.from({ length: 512 }, (_, i) => i % 256)),
      Buffer.from('\n%%EOF\n'),
    ]);
    const form = new FormData();
    form.append('cv', new Blob([pdf], { type: 'application/pdf' }), 'cv.pdf');
    const subida = await fetch(`${base}/api/alumnos/${alumnoId}/cv`, { method: 'POST', headers: conToken, body: form });
    expect(subida.status, `Falló la subida. Salida:\n${salida}`).toBe(200);

    const res = await pedir('/api/alumnos/cv/preparar-attachments', conToken, 'POST', { alumnoIds: [alumnoId] });
    expect(res.status, `Falló la preparación. Salida:\n${salida}`).toBe(200);
    const [adjunto] = await res.json();

    expect(adjunto.filename).toMatch(/_cv\.pdf$/);
    const enviado = fs.readFileSync(adjunto.path);
    expect(enviado.subarray(0, 5).toString()).toBe('%PDF-');
    expect(enviado.equals(pdf)).toBe(true);
    expect(adjunto.size).toBe(pdf.length);
  });
});

/**
 * El nombre de un documento del gestor se escribe a mano. Con un caracter
 * fuera de latin1 la descarga daba error (ERR_INVALID_CHAR en la cabecera) y
 * el documento se quedaba sin adjuntar al correo.
 */
describe('un documento del gestor con un nombre raro', () => {
  it('se descarga igual, y la cabecera lleva su nombre real', async () => {
    const nombre = 'Presupuesto 100€ “final”.pdf';
    const doc = await subirDocumento('relacion', { relacionId }, nombre, '%PDF-1.4 euros');
    const res = await pedir(`/api/documentos/relacion/${doc.id}/download`, conToken);
    expect(res.status, `Falló la descarga. Salida:\n${salida}`).toBe(200);
    expect(await res.text()).toBe('%PDF-1.4 euros');
    expect(res.headers.get('content-disposition')).toContain(`filename*=UTF-8''${encodeURIComponent(nombre)}`);
  });
});
