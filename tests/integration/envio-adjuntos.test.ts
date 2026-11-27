import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────
// Lo que de verdad le llega al destinatario cuando se envia un correo con
// adjuntos. Se levanta el servidor real y un SMTP minimo en local que se
// queda con el mensaje, y se mira cada adjunto como lo veria su cliente de
// correo: el tipo declarado, el nombre y los bytes.
//
// Todos los adjuntos de la aplicacion acaban en /api/send-email como un
// fichero en uploads/temp mas un nombre, asi que aqui se cubren los casos que
// rompian el adjunto venga de donde venga: nombre sin extension (gestor
// documental, que se nombra a mano), extension que no cuadra con el
// contenido, y nombres con tildes subidos a mano.
//
// La BBDD es una copia temporal desechable (PORTABLE_EXECUTABLE_DIR).
// ─────────────────────────────────────────────────────────────────────

const TOKEN = 'd'.repeat(64);

let hijo: ChildProcess;
let smtp: net.Server;
let dirTemporal: string;
let base: string;
let salida = '';
const mensajes: string[] = [];

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

/**
 * Un servidor SMTP de lo justo para que nodemailer entregue: acepta cualquier
 * usuario y guarda cada mensaje en `mensajes`.
 */
const arrancarSmtp = (puerto: number) => new Promise<net.Server>((resolver) => {
  const servidor = net.createServer((socket) => {
    let enDatos = false;
    let datos = '';
    let pendiente = '';
    let loginPasos = 0;
    socket.write('220 localhost ESMTP prueba\r\n');
    socket.on('data', (trozo) => {
      pendiente += trozo.toString('latin1');
      if (enDatos) {
        const fin = pendiente.indexOf('\r\n.\r\n');
        if (fin < 0) return;
        datos += pendiente.slice(0, fin);
        pendiente = pendiente.slice(fin + 5);
        mensajes.push(datos);
        datos = '';
        enDatos = false;
        socket.write('250 OK\r\n');
      }
      let salto: number;
      while (!enDatos && (salto = pendiente.indexOf('\r\n')) >= 0) {
        const linea = pendiente.slice(0, salto);
        pendiente = pendiente.slice(salto + 2);
        const orden = linea.toUpperCase();
        if (loginPasos > 0) {
          loginPasos--;
          socket.write(loginPasos > 0 ? '334 UGFzc3dvcmQ6\r\n' : '235 OK\r\n');
        } else if (orden.startsWith('EHLO')) {
          socket.write('250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        } else if (orden.startsWith('HELO')) {
          socket.write('250 localhost\r\n');
        } else if (orden.startsWith('AUTH PLAIN')) {
          socket.write('235 OK\r\n');
        } else if (orden.startsWith('AUTH LOGIN')) {
          loginPasos = 2;
          socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (orden === 'DATA') {
          enDatos = true;
          socket.write('354 Adelante\r\n');
          const fin = pendiente.indexOf('\r\n.\r\n');
          if (fin >= 0) socket.emit('data', Buffer.alloc(0));
        } else if (orden === 'QUIT') {
          socket.end('221 Adios\r\n');
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
    socket.on('error', () => {});
  });
  servidor.listen(puerto, '127.0.0.1', () => resolver(servidor));
});

interface AdjuntoRecibido {
  tipo: string;
  nombre: string;
  bytes: Buffer;
}

/** Los adjuntos de un mensaje tal como los leeria el cliente de correo. */
const adjuntosDe = (raw: string): AdjuntoRecibido[] => {
  const limite = raw.match(/boundary="?([^"\r\n;]+)"?/)?.[1];
  if (!limite) return [];
  return raw.split(`--${limite}`)
    .map(parte => {
      const corte = parte.indexOf('\r\n\r\n');
      if (corte < 0) return null;
      // Las cabeceras largas van plegadas en varias lineas.
      const cabeceras = parte.slice(0, corte).replace(/\r\n[ \t]+/g, ' ');
      if (!/Content-Disposition:\s*attachment/i.test(cabeceras)) return null;
      const tipo = cabeceras.match(/Content-Type:\s*([^;\r\n]+)/i)?.[1].trim() ?? '';
      const codificado = cabeceras.match(/filename\*(?:0\*)?=(?:utf-8|UTF-8)''([^;\r\n]+)/)?.[1];
      const nombre = codificado
        ? decodeURIComponent(codificado.replace(/\s/g, ''))
        : (cabeceras.match(/filename="?([^";\r\n]+)"?/)?.[1] ?? '');
      const bytes = Buffer.from(parte.slice(corte + 4).replace(/\s+/g, ''), 'base64');
      return { tipo, nombre, bytes };
    })
    .filter((a): a is AdjuntoRecibido => a !== null);
};

const subir = async (contenido: Buffer, nombre: string) => {
  const form = new FormData();
  form.append('file', new Blob([contenido]), nombre);
  const res = await fetch(`${base}/api/email/upload-attachment`, {
    method: 'POST',
    headers: { 'X-FFE-Token': TOKEN },
    body: form,
  });
  expect(res.status, `Falló la subida. Salida:\n${salida}`).toBe(200);
  return (await res.json()) as { filename: string; path: string; size: number };
};

const PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'),
  Buffer.from(Array.from({ length: 300 }, (_, i) => i % 256)),
  Buffer.from('\n%%EOF\n'),
]);
// Lo justo de un .docx: un zip cuya primera entrada es de la carpeta word/.
const DOCX = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(26),
  Buffer.from('word/document.xml'),
  Buffer.from(Array.from({ length: 100 }, (_, i) => (i * 7) % 256)),
]);

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ffe-envio-'));
  const puertoSmtp = await puertoLibre();
  smtp = await arrancarSmtp(puertoSmtp);

  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;
  const raiz = path.resolve(__dirname, '../..');
  hijo = spawn(process.execPath, [path.join(raiz, 'node_modules/tsx/dist/cli.mjs'), 'server.ts'], {
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

  const profesor = await pedir('/api/profesor', 'POST', {
    nombre: 'Profe', apellidos: 'Envio', nif: '00000000E', email: 'profe@test.local', telefono: '600000000',
  });
  expect(profesor.status, `Salida:\n${salida}`).toBe(200);
  const config = await pedir('/api/profesor/config/correo', 'POST', {
    smtp_host: '127.0.0.1', smtp_port: String(puertoSmtp), smtp_user: 'profe', smtp_pass: 'clave',
    smtp_secure: '0', smtp_email: 'profe@test.local', guardar_enviados: '0',
  });
  expect(config.status, `Salida:\n${salida}`).toBe(200);
}, 60_000);

afterAll(async () => {
  smtp?.close();
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

/** GF-76: el envio de correos se activa a mano y por defecto esta desactivado. */
describe('activar y desactivar el envío de correos', () => {
  const estado = async () => (await (await pedir('/api/email/estado')).json()) as { activo: boolean; configurado: boolean; habilitado: boolean };
  const configCorreo = async () => (await (await pedir('/api/profesor/config/correo')).json()) as Record<string, string>;
  let smtpGuardado: Record<string, string>;

  it('por defecto está desactivado aunque el SMTP esté configurado', async () => {
    expect(await estado()).toEqual({ activo: false, configurado: true, habilitado: false });
  });

  it('desactivado, el servidor no envía', async () => {
    const res = await pedir('/api/send-email', 'POST', { to: ['empresa@test.local'], subject: 'No', html: '<p>No</p>' });
    expect(res.status).toBe(403);
    expect(mensajes).toHaveLength(0);
  });

  it('al activarlo queda habilitado, y desactivarlo no borra la configuración', async () => {
    smtpGuardado = await configCorreo();
    expect((await pedir('/api/email/estado', 'POST', { activo: true })).status).toBe(200);
    expect(await estado()).toEqual({ activo: true, configurado: true, habilitado: true });

    await pedir('/api/email/estado', 'POST', { activo: false });
    expect(await estado()).toMatchObject({ activo: false, habilitado: false });
    const tras = await configCorreo();
    expect(tras.smtp_user).toBe('profe');
    expect(tras.smtp_pass).toBe('clave');
  });

  it('guardar el formulario SMTP no borra la firma ni el interruptor', async () => {
    await pedir('/api/email/estado', 'POST', { activo: true });
    await pedir('/api/profesor/config/correo/firma', 'POST', { firma_correo: '<p>Un saludo</p>' });
    const { firma_correo: _f, envio_activo: _e, ...formulario } = smtpGuardado;
    expect((await pedir('/api/profesor/config/correo', 'POST', formulario)).status).toBe(200);
    const tras = await configCorreo();
    expect(tras.firma_correo).toBe('<p>Un saludo</p>');
    expect(tras.envio_activo).toBe('1');
  });

  it('activado pero sin usuario ni contraseña no está habilitado', async () => {
    const { smtp_user: _u, smtp_pass: _p, ...sinCredenciales } = smtpGuardado;
    await pedir('/api/profesor/config/correo', 'POST', sinCredenciales);
    expect(await estado()).toEqual({ activo: true, configurado: false, habilitado: false });
    // Se deja como estaba para el resto de pruebas.
    await pedir('/api/profesor/config/correo', 'POST', smtpGuardado);
    expect(await estado()).toEqual({ activo: true, configurado: true, habilitado: true });
  });
});

describe('los adjuntos que llegan al destinatario', () => {
  let recibidos: AdjuntoRecibido[] = [];

  beforeAll(async () => {
    const adjuntos = [
      // Un documento del gestor nombrado a mano, sin extension.
      { ...(await subir(PDF, 'tmp.bin')), filename: 'Convenio firmado' },
      // Subido a mano desde el modal de correo, con tildes.
      await subir(PDF, 'Relación_José_Pérez.pdf'),
      // Un Word al que se le ha puesto .pdf en el nombre.
      { ...(await subir(DOCX, 'tmp.bin')), filename: 'Plan formativo.pdf' },
      // Lo normal, que no debe cambiar.
      { ...(await subir(PDF, 'tmp.bin')), filename: 'Calendario.pdf' },
    ];
    const res = await pedir('/api/send-email', 'POST', {
      to: ['empresa@test.local'], subject: 'Adjuntos', html: '<p>Hola</p>',
      attachments: adjuntos.map(a => ({ filename: a.filename, path: a.path })),
    });
    expect(res.status, `Falló el envío. Salida:\n${salida}`).toBe(200);
    expect(mensajes).toHaveLength(1);
    recibidos = adjuntosDe(mensajes[0]);
    expect(recibidos).toHaveLength(4);
  }, 60_000);

  it('un PDF sin extension llega como PDF, con su .pdf', () => {
    const a = recibidos[0];
    expect(a.tipo).toBe('application/pdf');
    expect(a.nombre).toBe('Convenio firmado.pdf');
    expect(a.bytes.equals(PDF)).toBe(true);
  });

  it('un nombre con tildes subido a mano llega con sus tildes', () => {
    const a = recibidos[1];
    expect(a.nombre).toBe('Relación_José_Pérez.pdf');
    expect(a.tipo).toBe('application/pdf');
    expect(a.bytes.equals(PDF)).toBe(true);
  });

  it('un Word llamado .pdf llega como Word, no como un PDF sospechoso', () => {
    const a = recibidos[2];
    expect(a.tipo).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(a.nombre).toBe('Plan formativo.docx');
    expect(a.bytes.equals(DOCX)).toBe(true);
  });

  it('un PDF bien nombrado no se toca', () => {
    const a = recibidos[3];
    expect(a.tipo).toBe('application/pdf');
    expect(a.nombre).toBe('Calendario.pdf');
    expect(a.bytes.equals(PDF)).toBe(true);
  });
});

/**
 * GF-74: "Descargar todos" en la ventana de correo baja los adjuntos en un
 * zip, con los mismos nombres con los que se enviarian, y solo de uploads/temp.
 */
describe('descargar todos los adjuntos en un zip', () => {
  const pedirZip = (adjuntos: { filename: string; path: string }[]) =>
    pedir('/api/email/adjuntos/zip', 'POST', { adjuntos });

  it('trae cada adjunto con su nombre de envio, sin pisarse', async () => {
    const a = await subir(PDF, 'tmp.bin');
    const b = await subir(PDF, 'tmp.bin');
    const c = await subir(DOCX, 'tmp.bin');
    const res = await pedirZip([
      { filename: 'Convenio firmado', path: a.path },
      { filename: 'Convenio firmado.pdf', path: b.path },
      { filename: 'Plan.pdf', path: c.path },
    ]);
    expect(res.status, `Salida:\n${salida}`).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/zip');

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
    expect(Object.keys(zip.files).sort()).toEqual(['Convenio firmado (2).pdf', 'Convenio firmado.pdf', 'Plan.docx']);
    expect((await zip.file('Convenio firmado.pdf')!.async('nodebuffer')).equals(PDF)).toBe(true);
    expect((await zip.file('Plan.docx')!.async('nodebuffer')).equals(DOCX)).toBe(true);
  });

  it('no sirve ficheros de fuera de uploads/temp', async () => {
    const ajeno = path.resolve(__dirname, '../../package.json');
    const res = await pedirZip([{ filename: 'package.json', path: ajeno }]);
    expect(res.status).toBe(404);
  });

  it('una ruta con ../ no escapa de la carpeta', async () => {
    const a = await subir(PDF, 'tmp.bin');
    const res = await pedirZip([
      { filename: 'bueno.pdf', path: a.path },
      { filename: 'malo.json', path: `${path.dirname(a.path)}/../../package.json` },
    ]);
    expect(res.status).toBe(200);
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
    expect(Object.keys(zip.files)).toEqual(['bueno.pdf']);
  });
});

/** GF-75: enlaces personalizados (Configuracion -> Enlaces). */
describe('enlaces personalizados', () => {
  const lista = async () => (await (await pedir('/api/enlaces')).json()) as { id: number; nombre: string; url: string }[];

  it('se crean normalizando la URL y salen en orden de alta', async () => {
    expect(await lista()).toEqual([]);
    expect((await pedir('/api/enlaces', 'POST', { nombre: 'Raíces', url: 'raices.madrid.org' })).status).toBe(200);
    expect((await pedir('/api/enlaces', 'POST', { nombre: 'EducaMadrid', url: 'https://www.educa2.madrid.org/' })).status).toBe(200);
    expect((await lista()).map(e => [e.nombre, e.url])).toEqual([
      ['Raíces', 'https://raices.madrid.org/'],
      ['EducaMadrid', 'https://www.educa2.madrid.org/'],
    ]);
  });

  it('rechaza URLs que no son web y enlaces sin nombre', async () => {
    expect((await pedir('/api/enlaces', 'POST', { nombre: 'Malo', url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await pedir('/api/enlaces', 'POST', { nombre: 'Malo', url: 'file:///C:/Windows' })).status).toBe(400);
    expect((await pedir('/api/enlaces', 'POST', { nombre: '', url: 'https://a.es' })).status).toBe(400);
    expect(await lista()).toHaveLength(2);
  });

  it('se editan, se reordenan y se borran', async () => {
    const [raices, educa] = await lista();
    expect((await pedir(`/api/enlaces/${raices.id}`, 'PUT', { nombre: 'Raíces FFE', url: 'https://raices.madrid.org/ffe' })).status).toBe(200);
    expect((await pedir(`/api/enlaces/${raices.id}`, 'PUT', { nombre: 'X', url: 'javascript:x' })).status).toBe(400);
    await pedir('/api/enlaces/orden', 'PUT', { ids: [educa.id, raices.id] });
    expect((await lista()).map(e => e.nombre)).toEqual(['EducaMadrid', 'Raíces FFE']);
    await pedir(`/api/enlaces/${educa.id}`, 'DELETE');
    expect((await lista()).map(e => e.nombre)).toEqual(['Raíces FFE']);
  });
});
