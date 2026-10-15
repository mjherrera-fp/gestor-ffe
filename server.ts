import express from 'express';
import {DOMParser, XMLSerializer} from '@xmldom/xmldom';
import PizZip from 'pizzip';
import JSZip from 'jszip';
import Docxtemplater from 'docxtemplater';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import {resolverRutaDentro} from './src/lib/seguridadRutas.ts';
import {formatDate} from './src/lib/dateUtils.ts';
import {
  EstadoBackoff,
  ESTADO_INICIAL,
  esperaRestanteMs,
  registrarExito,
  registrarFallo,
} from './src/lib/backoff.ts';
import {db} from './src/lib/db.ts';
import {
  AceptacionUsoDAO,
  AlumnoDAO,
  AnulacionFFEDAO,
  AvisosDAO,
  CentroDAO,
  ComunicacionDATDAO,
  ConfiguracionDAO,
  ContactoDAO,
  ConvenioDAO,
  CursoDAO,
  DetalleAcademicoDAO,
  DocComunicacionDATDAO,
  DocConvenioDAO,
  DocPlanFormativoDAO,
  DocRelacionDAO,
  DocSeguimientoDAO,
  DocValoracionDAO,
  EmailContactsDAO,
  EmpresaDAO,
  EmpresaEstadisticaDAO,
  EmpresaFestivosDAO,
  encryptDatabase,
  decryptDatabase,
  FFEEvaluacionDAO,
  FFEInformeDAO,
  FFEMotivoNoRealizacionDAO,
  FFEResultadoRADAO,
  FFEValoracionFinalDAO,
  GrupoContactoDAO,
  HistoricoDAO,
  InteresDAO,
  isDatabaseEncrypted,
  isDatabaseLocked,
  lockDatabase,
  MarcadorPersonalizadoDAO,
  PanelDAO,
  PlantillaCorreoDAO,
  ProfesorDAO,
  recalcularFechasAlumnos,
  RelacionAlumnoDAO,
  TutorEmpresaDAO,
  unlockDatabase,
  AlumnoFestivosDAO
} from './src/lib/dao.ts';
import {aplicarPersonalizados, festivosHeredados} from './src/lib/festivosAlumno.ts';
import {Alumno, DetalleAcademico, DocConvenio, DocRelacion} from './src/types/index.ts';
import {appendToSentFolder} from './src/lib/imap.ts';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallos consecutivos de desbloqueo. Solo la lectura correcta lo pone a cero:
// deliberadamente NO se reinicia en /api/auth/lock, porque si se hiciera un
// atacante podría alternar lock y unlock para anular la espera en cada intento.
let backoffDesbloqueo: EstadoBackoff = { ...ESTADO_INICIAL };

/**
 * La fecha de hoy en 'YYYY-MM-DD' leida en hora local.
 *
 * `toISOString()` no sirve para esto: convierte a UTC, asi que a partir de las
 * dos de la tarde en España devolveria el dia siguiente. Se construye a mano con
 * los getters locales para pasarla despues a `formatDate`, que parte la cadena.
 */
function fechaLocalISO(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function resolveImapSendConfig(emailCfg: Record<string, string>, smtpUser: string, smtpPass: string, smtpHost: string) {
  const enabled = emailCfg.guardar_enviados === undefined ? true : emailCfg.guardar_enviados === '1';
  const derivedHost = smtpHost ? smtpHost.replace(/^smtp\d*/i, 'imap') : 'imap.educa.madrid.org';
  return {
    enabled,
    host: emailCfg.imap_host || derivedHost,
    port: emailCfg.imap_port ? (Number(emailCfg.imap_port) || 993) : 993,
    secure: emailCfg.imap_secure === undefined ? true : emailCfg.imap_secure === '1',
    user: emailCfg.imap_user || smtpUser,
    pass: emailCfg.imap_pass || smtpPass,
    folder: emailCfg.imap_folder || 'Sent',
  };
}

async function buildRawEmail(mailOptions: any): Promise<Buffer> {
  const bufferTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
  const info: any = await bufferTransport.sendMail(mailOptions);
  return info.message as Buffer;
}

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  // Puerto: se puede sobrescribir con PORT. Por defecto producción usa 3000
  // y desarrollo 3100 para no chocar con el de producción.
  const PORT = Number(process.env.PORT) || (isProd ? 3000 : 3100);
  // Puerto realmente escucha. Puede acabar siendo otro si el de partida está
  // ocupado: ver listenOnFirstFreePort() más abajo. Lo necesita la sonda de
  // identidad para que main.js sepa a qué puerto debe dirigirse.
  let puertoReal = PORT;
  const baseDir = process.env.PORTABLE_EXECUTABLE_DIR || process.cwd();

  // 1. Validar permisos de escritura inmediatamente
  try {
    const testFile = path.join(baseDir, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
  } catch (e) {
    if (process.send) process.send('ERROR_PERMISOS');
  }

  // ─────────────────────────────────────────────────────────────────────
  // SEGURIDAD: token de sesión
  // ─────────────────────────────────────────────────────────────────────
  // El servidor escucha solo en 127.0.0.1, pero eso NO impide que cualquier
  // página web que el usuario tenga abierta en el navegador haga fetch a
  // http://127.0.0.1:PORT/api/... y lea o modifique todos sus datos. Ese es
  // el ataque real (CSRF/DNS rebinding contra un servidor local).
  //
  // El token lo genera el proceso principal (main.js) y llega al renderer
  // únicamente por el preload, así que una web ajena no puede leerlo. Además
  // la cabecera X-FFE-Token no es "simple": al ser personalizada, el navegador
  // exigiría un preflight CORS que el servidor no responde, así que ni
  // siquiera se llega a enviar la petición.
  //
  // ⚠️ La resolución del token debe MANTENERSE IGUAL que en main.js.
  // ─────────────────────────────────────────────────────────────────────
  function resolveSessionToken(): string {
    // 1. Producción: main.js lo inyecta por entorno al hacer fork.
    const fromEnv = (process.env.FFE_SESSION_TOKEN || '').trim();
    if (fromEnv) return fromEnv;

    // 2. Desarrollo: Electron y este proceso NO comparten process.env (los
    //    lanza 'concurrently' por separado), así que se consensúa por un
    //    fichero git-ignored que crea el que llegue primero.
    //    OJO: server.ts se compila a ESM, donde __dirname no existe; el resto
    //    del archivo usa process.cwd() por el mismo motivo.
    try {
      const tokenFile = path.join(process.cwd(), '.ffe-session-token');
      // La lectura falla a propósito en el primer arranque (el fichero aún
      // no existe): por eso va en su propio try, para que ese fallo NORMAL
      // no se lleve por delante la escritura que viene justo después.
      let guardado = '';
      try {
        guardado = fs.readFileSync(tokenFile, 'utf8').trim();
      } catch {
        // aún no creado
      }
      if (guardado) return guardado;
      const nuevo = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(tokenFile, nuevo, {encoding: 'utf8', mode: 0o600});
      return nuevo;
    } catch {
      return '';
    }
  }

  const sessionToken = resolveSessionToken();
  const sessionTokenHash = sessionToken ? crypto.createHash('sha256').update(sessionToken).digest() : null;

  if (!sessionToken) {
    console.warn('[seguridad] Sin token de sesión: la API responderá sin autenticar. NO distribuyas así.');
  }

  // Comparación en tiempo constante sobre el hash, para no filtrar el token
  // por tiempos de respuesta ni romper cuando las longitudes no coinciden.
  function tokenValido(recibido: unknown): boolean {
    if (!sessionTokenHash) return true;
    if (typeof recibido !== 'string' || !recibido) return false;
    const hash = crypto.createHash('sha256').update(recibido).digest();
    return crypto.timingSafeEqual(hash, sessionTokenHash);
  }

  // Se registra ANTES de express.json() a propósito: así una petición no
  // autorizada ni siquiera llega a parsearse, y no puede gastar memoria
  // hasta los 50 MB de body que permite el límite de JSON.
  app.use((req, res, next) => {
    // Los assets del frontend (index.html, bundles) los carga el BrowserWindow
    // con una navegación normal, que no puede añadir cabeceras: por eso el
    // token solo protege la API y /uploads, no express.static.
    const url = req.path || '';
    if (!url.startsWith('/api') && !url.startsWith('/uploads')) return next();
    if (tokenValido(req.headers['x-ffe-token'])) return next();
    res.status(401).json({error: 'unauthorized'});
  });

  app.use(express.json({limit: '50mb'}));

  // ─────────────────────────────────────────────────────────────────────
  // SONDA DE IDENTIDAD
  // El puerto 3000 (producción) es uno de los más usados de cualquier
  // máquina: basta con que haya otro programa escuchándolo (otro Node, un
  // Jupyter, un servidor de la escuela) para que nuestra app no pueda
  // arrancar. Antes, main.js abría la ventana en cuanto "algo" contestara en el
  // 3000, así que se acababa mostrando la web del intruso en lugar de la
  // nuestra. Esta ruta devuelve una marca que solo esta app genera, de modo
  // que main.js pueda distinguir "mi servidor" de "cualquier cosa en ese
  // puerto". Va antes del bloqueo de token a propósito: es pública y sin
  // datos, y el proceso principal no puede añadir la cabecera X-FFE-Token.
  // ─────────────────────────────────────────────────────────────────────
  app.get('/ffe-identity', (_req, res) => {
    res.json({ app: 'gestor-ffe', port: puertoReal, pid: process.pid });
  });

  // Si la BD está bloqueada (db === null), las rutas de datos deben responder
  // 401 en vez de crashear con TypeError al usar la conexión null.
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth')) return next();
    if (!isDatabaseLocked()) return next();
    res.status(401).json({ error: 'locked' });
  });

  // 2. Configurar carpeta de subidas (UPLOADS) portable
  const uploadDir = path.join(baseDir, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Carpeta docs para guardar documentos junto al .exe
  const docsDir = path.join(baseDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  function getCreacionFicherosModo(): string {
    try {
      const profesor = ProfesorDAO.get();
      if (!profesor?.id) return 'descargar';
      const config = ConfiguracionDAO.getConfig(profesor.id, 'creacion-ficheros');
      return config.modo || 'descargar';
    } catch {
      return 'descargar';
    }
  }

  function getCreacionFicherosConfig(): { modo: string; carpeta_estudiante: boolean } {
    try {
      const profesor = ProfesorDAO.get();
      if (!profesor?.id) return { modo: 'descargar', carpeta_estudiante: false };
      const config = ConfiguracionDAO.getConfig(profesor.id, 'creacion-ficheros');
      return {
        modo: config.modo || 'descargar',
        carpeta_estudiante: config.carpeta_estudiante === '1'
      };
    } catch {
      return { modo: 'descargar', carpeta_estudiante: false };
    }
  }

  function sanitizeDirName(name: string): string {
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    let sanitized = String(name ?? '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim();
    if (/^[.]+$/.test(sanitized)) sanitized = '';
    if (reservedNames.test(sanitized)) sanitized += '_';
    if (!sanitized) sanitized = 'Carpeta';
    return sanitized.slice(0, 255);
  }

  function saveToDocs(filename: string, buffer: Buffer, ...subdirs: string[]): { filePath: string; relativePath: string } {
    const subdirPath = subdirs.filter(Boolean).map(s => sanitizeDirName(s)).join(path.sep);
    const targetDir = subdirPath ? path.join(docsDir, subdirPath) : docsDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);
    const relativePath = subdirPath ? path.join(subdirPath, filename) : filename;
    return { filePath, relativePath };
  }

  // Actualiza tu configuración de multer:
  const upload = multer({
    storage: multer.memoryStorage(), // El CV se guarda en BD como dataURI (base64), no en disco
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') cb(null, true);
      else cb(new Error('Only PDF allowed'));
    }
  });

  const emailUploadDir = path.join(uploadDir, 'temp');
  if (!fs.existsSync(emailUploadDir)) {
    fs.mkdirSync(emailUploadDir, { recursive: true });
  }

  const emailStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, emailUploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  const uploadEmail = multer({ storage: emailStorage });

  function limpiarFilasActiveX(docxBuffer: Buffer): Buffer {
    try {
      const zip = new PizZip(docxBuffer);
      const docXmlStr = zip.file("word/document.xml")?.asText();
      const relsXmlStr = zip.file("word/_rels/document.xml.rels")?.asText();

      if (!docXmlStr || !relsXmlStr) return docxBuffer;

      const parser = new DOMParser();
      const doc = parser.parseFromString(docXmlStr, "text/xml");
      const relsDoc = parser.parseFromString(relsXmlStr, "text/xml");

      const rows = doc.getElementsByTagName("w:tr");
      const relIdsToDelete: string[] = [];

      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        if (row.textContent && row.textContent.includes("@@ELIMINAR@@")) {
          const oleObjects = row.getElementsByTagName("o:OLEObject");
          for (let j = 0; j < oleObjects.length; j++) {
            const rId = oleObjects[j].getAttribute("r:id");
            if (rId) relIdsToDelete.push(rId);
          }
          row.parentNode?.removeChild(row);
        }
      }

      const relationships = relsDoc.getElementsByTagName("Relationship");
      for (let i = relationships.length - 1; i >= 0; i--) {
        const rel = relationships[i];
        const rId = rel.getAttribute("Id");
        if (rId && relIdsToDelete.includes(rId)) {
          rel.parentNode?.removeChild(rel);
        }
      }

      const serializer = new XMLSerializer();
      zip.file("word/document.xml", serializer.serializeToString(doc));
      zip.file("word/_rels/document.xml.rels", serializer.serializeToString(relsDoc));

      return zip.generate({ type: "nodebuffer" });
    } catch (e) {
      console.error("Error en la cirugía XML:", e);
      return docxBuffer; // Devolvemos el original si falla la limpieza
    }
  }

  const generarCheckboxXML = (marcado: boolean) => {
    return marcado ? '☒' : '☐';
  };

  const generarCheckboxInteractivoXML = (marcado: boolean) => {
    const isChecked = marcado ? '1' : '0';
    // En la fuente MS Gothic: &#x2612; es ☒ y &#x2610; es ☐
    const charCode = marcado ? '&#x2612;' : '&#x2610;';

    // Generamos el párrafo (<w:p>) con el Structured Document Tag (<w:sdt>)
    const xmlStr = `
    <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:sdt>
        <w:sdtPr>
          <w14:checkbox>
            <w14:checked w14:val="${isChecked}"/>
            <w14:checkedState w14:val="2612" w14:font="MS Gothic"/>
            <w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/>
          </w14:checkbox>
        </w:sdtPr>
        <w:sdtContent>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:cs="MS Gothic"/>
            </w:rPr>
            <w:t>${charCode}</w:t>
          </w:r>
        </w:sdtContent>
      </w:sdt>
    </w:p>
  `;

    // Limpiamos los saltos de línea para que docxtemplater no rompa el XML interno
    return xmlStr.replace(/>\s+</g, '><').trim();
  };

  // API Routes
  // --- RUTAS DE SEGURIDAD ---
  app.get('/api/auth/status', (req, res) => {
    // Hemos quitado el require que hacía explotar el servidor
    res.json({
      locked: isDatabaseLocked(),
      encrypted: isDatabaseEncrypted()
    });
  });

  app.post('/api/auth/unlock', (req, res) => {
    const { password } = req.body;

    // La espera se comprueba ANTES de comparar la contraseña. Si se comprobara
    // después, el retardo solo molestaría: se seguiría probando tan rápido como
    // la CPU permita. Así, mientras haya que esperar, no se gasta nada.
    const restante = esperaRestanteMs(backoffDesbloqueo, Date.now());
    if (restante > 0) {
      const esperaSegundos = Math.ceil(restante / 1000);
      res.setHeader('Retry-After', String(esperaSegundos));
      return res.status(429).json({
        error: 'Demasiados intentos fallidos.',
        esperaSegundos,
      });
    }

    if (unlockDatabase(password)) {
      backoffDesbloqueo = registrarExito();
      res.status(200).json({ success: true });
    } else {
      backoffDesbloqueo = registrarFallo(backoffDesbloqueo, Date.now());
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  });


  app.post('/api/auth/lock', (req, res) => {
    lockDatabase();
    res.status(200).json({ success: true });
  });

  app.post('/api/auth/encrypt', (req, res) => {
    const { password } = req.body;

    try {
      encryptDatabase(password);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/decrypt', (req, res) => {
    try {
      if (isDatabaseLocked()) {
        return res.status(400).json({ error: 'La base de datos está bloqueada. Desbloquéala antes de eliminar el cifrado.' });
      }
      if (!isDatabaseEncrypted()) {
        return res.status(400).json({ error: 'La base de datos ya no está cifrada.' });
      }
      decryptDatabase();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Profesor
  app.get('/api/profesor', (req, res) => res.json(ProfesorDAO.get() || null));
  app.post('/api/profesor', (req, res) => {
    const existing = ProfesorDAO.get();
    if (existing) {
      ProfesorDAO.update(existing.id!, req.body);
      res.json({ success: true, id: existing.id });
    } else {
      const id = ProfesorDAO.create(req.body);
      res.json({ success: true, id });
    }
  });
  app.post('/api/profesor/email-config', (req, res) => {
    const existing = ProfesorDAO.get();
    if (!existing) return res.status(400).json({ error: 'No hay profesor' });
    ProfesorDAO.updateConfigEmail(existing.id!, req.body);
    res.json({ success: true });
  });
  app.get('/api/profesor/config/:tipo', (req, res) => {
    const existing = ProfesorDAO.get();
    if (!existing) return res.status(400).json({ error: 'No hay profesor' });
    const config = ConfiguracionDAO.getConfig(existing.id!, req.params.tipo);
    res.json(config);
  });
  app.post('/api/profesor/config/:tipo', (req, res) => {
    const existing = ProfesorDAO.get();
    if (!existing) return res.status(400).json({ error: 'No hay profesor' });

    // Extraer empresa_festivos antes de guardar el resto de la config
    const { empresa_festivos, ...configData } = req.body;
    ConfiguracionDAO.setConfig(existing.id!, req.params.tipo, configData);

    // Guardar empresa festivos por localidad si se enviaron
    if (req.params.tipo === 'festivos' && empresa_festivos) {
      for (const [localidad, festivos] of Object.entries(empresa_festivos)) {
        EmpresaFestivosDAO.setByCiudad(existing.id!, localidad, festivos as string[]);
      }
    }

    // Recalcular fechas de todos los alumnos
    let recalculadas = -1;
    if (req.params.tipo === 'festivos') {
      try {
        recalculadas = recalcularFechasAlumnos(existing.id!);
      } catch (e) {
        console.error('Error al recalcular fechas:', e);
      }
    }

    res.json({ success: true, recalculadas });
  });
  app.post('/api/profesor/config/correo/firma', (req, res) => {
    const existing = ProfesorDAO.get();
    if (!existing) return res.status(400).json({error: 'No hay profesor'});
    const firma = req.body.firma_correo || '';
    ConfiguracionDAO.upsertConfigKey(existing.id!, 'correo', 'firma_correo', firma);
    res.json({success: true});
  });
  app.get('/api/profesor/aceptacion-uso', (req, res) => {
    res.json({ aceptado: AceptacionUsoDAO.getAceptado() });
  });
  app.post('/api/profesor/aceptacion-uso', (req, res) => {
    const profesorId = AceptacionUsoDAO.crearProfesorSiNoExiste();
    AceptacionUsoDAO.setAceptado(profesorId);
    res.json({ success: true });
  });

  app.post('/api/profesor/test-email', async (req, res) => {
    const { to, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_email } = req.body;
    if (!to || !smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
      return res.status(400).json({ error: 'Faltan datos de configuración SMTP' });
    }
    try {
      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_secure,
        auth: { user: smtp_user, pass: smtp_pass },
      });
      const fromEmail = smtp_email || `${smtp_user}@educa.madrid.org`;
      const mailOptions = {
        from: `"Test Configuración" <${fromEmail}>`,
        to,
        subject: 'Prueba de configuración de correo - Gestor FFE',
        html: '<p>Este es un correo de prueba para verificar la configuración SMTP del Gestor FFE.</p><p>Si recibes este mensaje, la configuración es correcta.</p>',
        headers: { 'Content-Language': 'es' },
      };
      await transporter.sendMail(mailOptions);

      let copiadoEnviados = 'desactivada';
      let imapError = '';
      const imapCfg = resolveImapSendConfig({}, smtp_user, smtp_pass, smtp_host);
      if (imapCfg.enabled) {
        try {
          const raw = await buildRawEmail(mailOptions);
          await appendToSentFolder({ ...imapCfg, raw });
          copiadoEnviados = 'ok';
        } catch (e: any) {
          copiadoEnviados = 'error';
          imapError = e.message || String(e);
          console.warn('No se pudo guardar la copia en Enviados:', imapError);
        }
      }

      res.json({ success: true, copiadoEnviados, imapError });
    } catch (error: any) {
      console.error('Error test-email:', error.message || error);
      res.status(500).json({ error: error.message || 'Error al enviar correo de prueba' });
    }
  });

  // Detalle Academico / Centros
  app.get('/api/centros', (req, res) => {
    const p = ProfesorDAO.get();
    if (!p) return res.json([]);
    res.json(CentroDAO.getAllByProfesor(p.id!));
  });
  app.post('/api/centros', (req, res) => res.json({ id: CentroDAO.create(req.body) }));
  app.put('/api/centros/:id', (req, res) => {
    CentroDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/centros/:id', (req, res) => {
    CentroDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  app.get('/api/centros/:id', (req, res) => {
    const centro = CentroDAO.getById(Number(req.params.id));
    if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
    res.json(centro);
  });
  app.get('/api/centros/:centroId/detalles', (req, res) => {
    res.json(DetalleAcademicoDAO.getAllByCentro(Number(req.params.centroId)));
  });
  app.get('/api/detalles-academicos', (req, res) => res.json(DetalleAcademicoDAO.getAll()));
  app.post('/api/detalles-academicos', (req, res) => res.json({ id: DetalleAcademicoDAO.create(req.body) }));
  app.put('/api/detalles-academicos/:id', (req, res) => {
    DetalleAcademicoDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  // Los RA se editan en su propia pantalla, que no conoce el resto del ciclo.
  // Por eso van por su propio endpoint: el de arriba reescribe todas las
  // columnas y desde ahi no habria nada que mandar.
  app.put('/api/detalles-academicos/:id/resultados', (req, res) => {
    const id = Number(req.params.id);
    if (!DetalleAcademicoDAO.getById(id)) {
      return res.status(404).json({ error: 'El ciclo formativo no existe.' });
    }
    const resultados = req.body.resultadosAprendizaje;
    if (!Array.isArray(resultados)) {
      return res.status(400).json({ error: 'La lista de resultados de aprendizaje no es válida.' });
    }
    DetalleAcademicoDAO.updateResultados(id, resultados);
    res.json({ success: true });
  });
  app.delete('/api/detalles-academicos/:id', (req, res) => {
    DetalleAcademicoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });
  app.post('/api/alumnos/:alumnoId/link-detalle', (req, res) => {
    AlumnoDAO.linkDetalle(Number(req.params.alumnoId), req.body.detalleId);
    res.json({ success: true });
  });

  // ─── EMAILS ──────────────────────────────────────

  // Subir adjunto temporal
  app.post('/api/email/upload-attachment', uploadEmail.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    });
  });

  // Eliminar adjunto temporal
  app.delete('/api/email/upload-attachment', (req, res) => {
    const { path: filePath } = req.body;
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Error al eliminar el archivo' });
    }
  });

  // Enviar email
  app.post('/api/send-email', async (req, res) => {
    const { to, cc, bcc, subject, html, attachments, sendIndividual, delayMs } = req.body;

    try {
      const profesor = ProfesorDAO.get();
      if (!profesor) return res.status(400).json({ error: "No hay profesor" });

      // Leer config de correo desde tabla configuracion
      const emailCfg = ConfiguracionDAO.getConfig(profesor.id!, 'correo');
      const smtp_host = emailCfg.smtp_host || profesor.smtp_host || 'smtp01.educa.madrid.org';
      const smtp_port = emailCfg.smtp_port ? parseInt(emailCfg.smtp_port, 10) : (profesor.smtp_port || 465);
      const smtp_user = emailCfg.smtp_user || profesor.smtp_user || '';
      const smtp_pass = emailCfg.smtp_pass || profesor.smtp_pass || '';
      const smtp_secure = emailCfg.smtp_secure === '1' || !!profesor.smtp_secure;
      const smtp_email = emailCfg.smtp_email || profesor.smtp_email || '';

      if (!smtp_user || !smtp_pass) {
        return res.status(400).json({ error: "Configuración de email incompleta" });
      }

      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_secure,
        auth: { user: smtp_user, pass: smtp_pass },
      });

      const fromEmail = smtp_email || `${smtp_user}@educa.madrid.org`;
      const fromStr = `"${profesor.nombre} ${profesor.apellidos}" <${fromEmail}>`;

      const mailAttachments = (attachments || []).map((a: { filename: string; path: string }) => ({
        filename: a.filename,
        path: a.path,
      }));

      const sendDelay = delayMs || (emailCfg.send_delay_ms ? parseInt(emailCfg.send_delay_ms, 10) : (profesor.send_delay_ms || 1500));

      const imapCfg = resolveImapSendConfig(emailCfg, smtp_user, smtp_pass, smtp_host);
      const pendingSaves: Promise<void>[] = [];

      const saveSentCopy = async (mailOptions: any) => {
        if (!imapCfg.enabled) return;
        try {
          const raw = await buildRawEmail(mailOptions);
          await appendToSentFolder({ ...imapCfg, raw });
        } catch (e: any) {
          console.warn('No se pudo guardar la copia en Enviados:', e.message || e);
        }
      };

      if (sendIndividual && to?.length > 1) {
        for (let i = 0; i < to.length; i++) {
          const mailOptions = {
            from: fromStr,
            to: to[i],
            cc: cc || [],
            bcc: bcc || [],
            subject,
            html,
            headers: { 'Content-Language': 'es' },
            attachments: mailAttachments,
          };
          await transporter.sendMail(mailOptions);
          pendingSaves.push(saveSentCopy(mailOptions));
          if (i < to.length - 1) {
            await new Promise(resolve => setTimeout(resolve, sendDelay));
          }
        }
      } else {
        const mailOptions = {
          from: fromStr,
          to: (to || []).join(', '),
          cc: (cc || []).join(', '),
          bcc: (bcc || []).join(', '),
          subject,
          html,
          headers: { 'Content-Language': 'es' },
          attachments: mailAttachments,
        };
        await transporter.sendMail(mailOptions);
        pendingSaves.push(saveSentCopy(mailOptions));
      }

      // Registrar en histórico
      try {
        const adjNames = (attachments || []).map((a: { filename: string }) => a.filename);
        HistoricoDAO.logComunicacion(
          Array.isArray(to) ? to.join(', ') : (to || ''),
          Array.isArray(cc) ? cc.join(', ') : (cc || ''),
          Array.isArray(bcc) ? bcc.join(', ') : (bcc || ''),
          subject || '',
          html || '',
          adjNames
        );
      } catch (e) { /* silencioso */ }

      res.json({ success: true });

      // Limpiar adjuntos temporales una vez terminada la copia IMAP en segundo plano
      Promise.allSettled(pendingSaves).then(() => {
        for (const a of mailAttachments) {
          try { if (fs.existsSync(a.path)) fs.unlinkSync(a.path); } catch {}
        }
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: "Error al enviar el email", details: error.message || error });
    }
  });

  // Cursos
  app.get('/api/cursos', (req, res) => res.json(CursoDAO.getAll()));
  app.get('/api/cursos/:id', (req, res) => {
    const curso = CursoDAO.getById(Number(req.params.id));
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(curso);
  });
  app.post('/api/cursos/reemplazar', (req, res) => {
    try {
      const id = CursoDAO.replaceAll(req.body);
      res.json({ id });
    } catch (error) {
      console.error("Error replacing cursos:", error);
      res.status(500).json({ error: "No se pudo crear el nuevo curso. No se ha eliminado nada." });
    }
  });
  app.post('/api/cursos', (req, res) => res.json({ id: CursoDAO.create(req.body) }));
  app.put('/api/cursos/:id', (req, res) => {
    CursoDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/cursos/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      CursoDAO.delete(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting curso:", error);
      res.status(500).json({ error: "No se pudo eliminar el curso" });
    }
  });

  // Alumnos
  app.get('/api/alumnos', (req, res) => {
    const alumnos = AlumnoDAO.getAll(
      req.query.cursoId ? Number(req.query.cursoId) : undefined,
      req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined
    );
    const counts = HistoricoDAO.countAnulacionesPorAlumno(alumnos.map(a => a.id!));
    res.json(alumnos.map(a => ({ ...a, anulacionesCount: counts[a.id!] || 0 })));
  });
  app.post('/api/alumnos', (req, res) => {
    const { dni, emailEduca, emailPersonal, tlfn } = req.body;
    const dups = AlumnoDAO.findByDNIEmailPhone(dni, emailEduca, emailPersonal, tlfn);
    if (dups.length > 0) {
      const fields = dups.map(d => {
        const matches: string[] = [];
        if (d.dni === dni) matches.push('DNI');
        if (d.emailEduca === emailEduca) matches.push('email educamadrid');
        if (d.emailPersonal === emailPersonal) matches.push('email personal');
        if (d.tlfn === tlfn) matches.push('teléfono');
        return `${d.nombre} ${d.apellidos} (${matches.join(', ')})`;
      });
      return res.status(409).json({ error: `Ya existe${dups.length > 1 ? 'n' : ''} alumno${dups.length > 1 ? 's' : ''} con los mismos datos: ${fields.join('; ')}` });
    }
    res.json({ id: AlumnoDAO.create(req.body) });
  });
  app.put('/api/alumnos/:id', (req, res) => {
    const id = Number(req.params.id);
    const { dni, emailEduca, emailPersonal, tlfn } = req.body;
    const dups = AlumnoDAO.findByDNIEmailPhone(dni, emailEduca, emailPersonal, tlfn, id);
    if (dups.length > 0) {
      const fields = dups.map(d => {
        const matches: string[] = [];
        if (d.dni === dni) matches.push('DNI');
        if (d.emailEduca === emailEduca) matches.push('email educamadrid');
        if (d.emailPersonal === emailPersonal) matches.push('email personal');
        if (d.tlfn === tlfn) matches.push('teléfono');
        return `${d.nombre} ${d.apellidos} (${matches.join(', ')})`;
      });
      return res.status(409).json({ error: `Ya existe${dups.length > 1 ? 'n' : ''} alumno${dups.length > 1 ? 's' : ''} con los mismos datos: ${fields.join('; ')}` });
    }
    AlumnoDAO.update(id, req.body);
    res.json({ success: true });
  });
  app.put('/api/alumnos/:id/estado-plan-formativo', (req, res) => {
    const old = AlumnoDAO.getById(Number(req.params.id));
    AlumnoDAO.updateEstadoPlanFormativo(Number(req.params.id), req.body.estadoPlanFormativo);
    try {
      if (old) HistoricoDAO.logCambioEstado('plan_formativo', old.estadoPlanFormativo, req.body.estadoPlanFormativo, Number(req.params.id));
    } catch {}
    res.json({ success: true });
  });
  app.put('/api/alumnos/:id/estado-seguimiento', (req, res) => {
    const old = AlumnoDAO.getById(Number(req.params.id));
    AlumnoDAO.updateEstadoSeguimiento(Number(req.params.id), req.body.estadoSeguimiento);
    try {
      if (old) HistoricoDAO.logCambioEstado('seguimiento', old.estadoSeguimiento, req.body.estadoSeguimiento, Number(req.params.id));
    } catch {}
    res.json({ success: true });
  });
  app.put('/api/alumnos/:id/estado-valoracion', (req, res) => {
    const old = AlumnoDAO.getById(Number(req.params.id));
    AlumnoDAO.updateEstadoValoracion(Number(req.params.id), req.body.estadoValoracion);
    try {
      if (old) HistoricoDAO.logCambioEstado('valoracion', old.estadoValoracion, req.body.estadoValoracion, Number(req.params.id));
    } catch {}
    res.json({ success: true });
  });
  app.delete('/api/alumnos/:id', (req, res) => {
    AlumnoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── ANULACIÓN FFE ─────────────────────────────────────
  app.post('/api/alumnos/:id/anular-ffe/preview', (req, res) => {
    const alumnoId = Number(req.params.id);
    let fechaStr = '';
    if (typeof req.body?.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha)) {
      fechaStr = req.body.fecha;
    } else {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      fechaStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    const [y, m, d] = fechaStr.split('-').map(Number);
    const preview = AnulacionFFEDAO.preview(alumnoId, new Date(y, m - 1, d));
    if (!preview) return res.status(404).json({ error: 'El alumno no tiene una relación activa' });
    res.json(preview);
  });

  app.post('/api/alumnos/:id/anular-ffe', (req, res) => {
    const alumnoId = Number(req.params.id);
    const fechaAnulacion = typeof req.body?.fecha === 'string' ? req.body.fecha : '';
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaAnulacion)) {
      return res.status(400).json({ error: 'Fecha de anulación no válida' });
    }
    const result = AnulacionFFEDAO.anular(alumnoId, fechaAnulacion, motivo);
    if (!result.ok) return res.status(400).json({ error: result.error });
    try { HistoricoDAO.logOperacionRelacion('ANULAR_FFE', result.relacionId, result.referencia || `Alumno ${alumnoId}`); } catch {}
    res.json({ success: true, horasRealizadas: result.horasRealizadas, totalHorasNuevo: result.totalHorasNuevo });
  });

  // CV Upload
  // RUTA PARA SUBIR CV (Guardando en BD)
  app.post('/api/alumnos/:id/cv', upload.single('cv'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Convertimos el buffer a base64
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype; // Debería ser application/pdf
    const dataURI = `data:${mimeType};base64,${base64Data}`;

    try {
      // En lugar de una ruta de archivo, guardamos el DataURI inmenso
      AlumnoDAO.updateCV(Number(req.params.id), dataURI);
      res.json({ message: 'CV subido y cifrado correctamente', path: dataURI });
    } catch (error) {
      res.status(500).json({ error: 'Error al procesar el archivo' });
    }
  });

  // NUEVA RUTA PARA ELIMINAR CV
  app.delete('/api/alumnos/:id/cv', (req, res) => {
    try {
      AlumnoDAO.updateCV(Number(req.params.id), null);
      res.json({ message: 'CV eliminado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar el CV' });
    }
  });

  // Preparar attachments de CVs para enviar por email
  app.post('/api/alumnos/cv/preparar-attachments', (req, res) => {
    const { alumnoIds } = req.body;
    if (!Array.isArray(alumnoIds) || alumnoIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de alumnoIds' });
    }
    const attachments: { filename: string; path: string; size: number }[] = [];
    for (const id of alumnoIds) {
      const alumno = AlumnoDAO.getById(id);
      if (!alumno || !alumno.cvPath) continue;
      const filename = `${alumno.nombre}_${alumno.apellidos}_cv.pdf`.replace(/\s+/g, '_');
      const safeName = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + filename;
      const outputPath = path.join(emailUploadDir, safeName);
      try {
        const buffer = Buffer.from(alumno.cvPath, 'base64');
        fs.writeFileSync(outputPath, buffer);
        attachments.push({ filename, path: outputPath, size: buffer.length });
      } catch { /* skip alumno */ }
    }
    res.json(attachments);
  });

  // Carga masiva de CVs via ZIP
  const uploadZip = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, emailUploadDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) cb(null, true);
      else cb(new Error('Only ZIP files allowed'));
    }
  });

  app.post('/api/alumnos/cv/zip', uploadZip.single('zip'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const results: { dni: string; nombre: string; ok: boolean; error?: string }[] = [];

    try {
      const zipData = fs.readFileSync(req.file.path);
      const zip = await JSZip.loadAsync(zipData);

      const pdfFiles = Object.keys(zip.files).filter(f => f.endsWith('.pdf'));

      for (const fileName of pdfFiles) {
        const dni = fileName.replace(/\.pdf$/i, '').trim();
        try {
          const alumno = db.prepare('SELECT id, nombre, apellidos FROM alumnos WHERE dni = ?').get(dni) as any;
          if (!alumno) {
            results.push({ dni, nombre: '', ok: false, error: 'Alumno no encontrado' });
            continue;
          }
          const fileData = await zip.files[fileName].async('nodebuffer');
          const base64Data = fileData.toString('base64');
          const dataURI = `data:application/pdf;base64,${base64Data}`;
          AlumnoDAO.updateCV(alumno.id, dataURI);
          results.push({ dni, nombre: `${alumno.nombre} ${alumno.apellidos}`, ok: true });
        } catch (err: any) {
          results.push({ dni, nombre: '', ok: false, error: err.message || 'Error al procesar' });
        }
      }

      // Cleanup uploaded ZIP
      try { fs.unlinkSync(req.file.path); } catch {}

      res.json({ total: pdfFiles.length, procesados: results.filter(r => r.ok).length, errores: results.filter(r => !r.ok).length, results });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al procesar el ZIP: ' + err.message });
    }
  });

  app.get('/uploads/:filename', (req, res) => {
    // path.basename elimina cualquier componente de directorio, así que un
    // nombre como "..%2F..%2Fconfig" se queda en su último segmento y nunca
    // puede salir de UPLOADS. La comparación con uploadDir es una segunda
    // barrera por si basename devolviera '..' o un separador.
    const seguro = path.basename(req.params.filename);
    const destino = resolverRutaDentro(uploadDir, seguro);
    if (!destino) {
      return res.status(400).json({error: 'invalid_filename'});
    }
    res.sendFile(destino);
  });

  // Contactos para autocompletado de email
  app.get('/api/email-contacts', (req, res) => res.json(EmailContactsDAO.getAll()));

  // CRUD Contactos manuales
  app.get('/api/contactos', (req, res) => res.json(ContactoDAO.getAll()));
  app.post('/api/contactos', (req, res) => {
    const { nombre, email, telefono } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    const existing = (ContactoDAO.getAll() as any[]).find((c: any) => c.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) return res.status(400).json({ error: 'Ya existe un contacto con ese email' });
    const id = ContactoDAO.create({ nombre, email, telefono: telefono || '' });
    res.json({ id });
  });
  app.post('/api/contactos/batch', (req, res) => {
    const { raw } = req.body;
    if (!raw) return res.status(400).json({ error: 'No hay datos' });
    const re = /([^,<]+)\s*<([^>]+)>/g;
    let match;
    let count = 0;
    let skipped = 0;
    const seen = new Set<string>();
    const existingEmails = new Set(
      (ContactoDAO.getAll() as any[]).map((c: any) => c.email.toLowerCase().trim())
    );
    while ((match = re.exec(raw)) !== null) {
      const nombre = match[1].trim();
      const email = match[2].trim().toLowerCase();
      if (!nombre || !email) continue;
      if (seen.has(email) || existingEmails.has(email)) {
        skipped++;
        continue;
      }
      seen.add(email);
      try {
        ContactoDAO.create({ nombre, email, telefono: '' });
        count++;
      } catch {
        skipped++;
      }
    }
    if (count === 0) return res.status(400).json({ error: `No se pudo importar ningún contacto. ${skipped > 0 ? `${skipped} contacto(s) ya existían.` : 'Formato esperado: Nombre Apellidos <email>, ...'}` });
    res.json({ count, skipped });
  });
  app.put('/api/contactos/:id', (req, res) => {
    const id = Number(req.params.id);
    const { nombre, email, telefono } = req.body;
    ContactoDAO.update(id, { nombre, email, telefono });
    res.json({ success: true });
  });
  app.delete('/api/contactos/:id', (req, res) => {
    ContactoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // CRUD Grupos de contactos
  app.get('/api/grupos-contactos', (req, res) => res.json(GrupoContactoDAO.getAllConMiembros()));
  app.post('/api/grupos-contactos', (req, res) => {
    const { nombre, miembros } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
    if (!miembros || miembros.length < 2) return res.status(400).json({ error: 'El grupo debe tener al menos 2 miembros' });
    const id = GrupoContactoDAO.create({ nombre, miembros });
    res.json({ id });
  });
  app.put('/api/grupos-contactos/:id', (req, res) => {
    const id = Number(req.params.id);
    const { nombre, miembros } = req.body;
    GrupoContactoDAO.update(id, { nombre, miembros });
    res.json({ success: true });
  });
  app.delete('/api/grupos-contactos/:id', (req, res) => {
    GrupoContactoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // Contexto para sugerencias de email
  app.get('/api/email-contexto', (req, res) => {
    const { empresaId, alumnoId } = req.query;
    const ids: { type: string; id: number }[] = [];
    if (empresaId) {
      const eId = Number(empresaId);
      ids.push({ type: 'empresa', id: eId });
      const tutores = db.prepare('SELECT id FROM empresa_tutores WHERE empresaId = ?').all(eId) as any[];
      for (const t of tutores) ids.push({ type: 'tutor', id: t.id });
      const alumnos = db.prepare(`
        SELECT DISTINCT a.id FROM alumnos a
        JOIN relaciones r ON a.relacionId = r.id
        JOIN convenios c ON r.convenioId = c.id
        WHERE c.empresaId = ?
      `).all(eId) as any[];
      for (const a of alumnos) ids.push({ type: 'alumno', id: a.id });
    }
    if (alumnoId) {
      const aId = Number(alumnoId);
      ids.push({ type: 'alumno', id: aId });
      const row = db.prepare(`
        SELECT c.empresaId, r.tutorEmpresaId FROM alumnos a
        JOIN relaciones r ON a.relacionId = r.id
        JOIN convenios c ON r.convenioId = c.id
        WHERE a.id = ?
        LIMIT 1
      `).get(aId) as any;
      if (row) {
        ids.push({ type: 'empresa', id: row.empresaId });
        if (row.tutorEmpresaId) ids.push({ type: 'tutor', id: row.tutorEmpresaId });
      }
    }
    res.json(ids);
  });

  // ─── PLANTILLAS DE CORREO ─────────────────────────────

  app.get('/api/plantillas', (req, res) => {
    const place = req.query.place as string | undefined;
    res.json(PlantillaCorreoDAO.getAll(place));
  });

  app.get('/api/plantillas/by-plantilla-id/:plantillaId', (req, res) => {
    const p = PlantillaCorreoDAO.getByPlantillaId(req.params.plantillaId);
    if (!p) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(p);
  });

  app.get('/api/plantillas/:id', (req, res) => {
    const p = PlantillaCorreoDAO.getById(Number(req.params.id));
    if (!p) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(p);
  });

  app.post('/api/plantillas', (req, res) => {
    const { plantillaId, name, description, subject, body, documents, recipientTarget, icon, color, place, grupo } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const id = PlantillaCorreoDAO.create({
      plantillaId: plantillaId || crypto.randomUUID(),
      name, description: description || '', subject: subject || '', body: body || '',
      documents: documents ? JSON.stringify(documents) : '[]',
      recipientTarget: recipientTarget || 'ninguno',
      icon: icon || 'file-text', color: color || 'slate',
      place: place || 'relaciones', tipo: 'personal',
      grupo: grupo || '',
    });
    res.json({ id, success: true });
  });

  app.put('/api/plantillas/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = PlantillaCorreoDAO.getById(id);
    if (!existing) return res.status(404).json({ error: 'Plantilla no encontrada' });
    const allowed: Record<string, any> = {};
    for (const key of ['name', 'description', 'subject', 'body', 'documents', 'recipientTarget', 'icon', 'color', 'place', 'grupo']) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    if (allowed.documents && Array.isArray(allowed.documents)) allowed.documents = JSON.stringify(allowed.documents);
    PlantillaCorreoDAO.update(id, allowed);
    res.json({ success: true });
  });

  app.delete('/api/plantillas/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = PlantillaCorreoDAO.getById(id);
    if (!existing) return res.status(404).json({ error: 'Plantilla no encontrada' });
    if (existing.tipo === 'sistema') return res.status(403).json({ error: 'No se puede eliminar una plantilla de sistema' });
    PlantillaCorreoDAO.delete(id);
    res.json({ success: true });
  });

  // ─── MARCADORES PERSONALIZADOS ────────────────────────

  app.get('/api/marcadores-personalizados', (req, res) => {
    res.json(MarcadorPersonalizadoDAO.getAll());
  });

  app.post('/api/marcadores-personalizados', (req, res) => {
    const { nombre, valor, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const id = MarcadorPersonalizadoDAO.create({ nombre, valor: valor || '', descripcion: descripcion || '' });
    res.json({ id, success: true });
  });

  app.put('/api/marcadores-personalizados/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = MarcadorPersonalizadoDAO.getById(id);
    if (!existing) return res.status(404).json({ error: 'Marcador no encontrado' });
    const allowed: Record<string, any> = {};
    for (const key of ['nombre', 'valor', 'descripcion']) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    MarcadorPersonalizadoDAO.update(id, allowed);
    res.json({ success: true });
  });

  app.delete('/api/marcadores-personalizados/:id', (req, res) => {
    MarcadorPersonalizadoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // Empresas
  app.get('/api/empresas', (req, res) => res.json(EmpresaDAO.getAll()));
  app.post('/api/empresas', (req, res) => {
    const yaExiste = EmpresaDAO.getByCif(req.body.cif);
    if (yaExiste) return res.status(409).json({ error: 'Ya existe una empresa con ese CIF' });
    res.json({ id: EmpresaDAO.create(req.body) });
  });
  app.put('/api/empresas/:id', (req, res) => {
    const yaExiste = EmpresaDAO.getByCif(req.body.cif);
    if (yaExiste && yaExiste.id !== Number(req.params.id)) return res.status(409).json({ error: 'Ya existe una empresa con ese CIF' });
    EmpresaDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/empresas/:id', (req, res) => {
    EmpresaDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  app.get('/api/empresas/con-convenio', (req, res) => res.json(ConvenioDAO.getEmpresaIdsConConvenio()));

  app.get('/api/empresas/localidades-con-relaciones', (req, res) => {
    res.json(EmpresaDAO.getLocalidadesConRelaciones());
  });

  app.get('/api/empresas/festivos', (req, res) => {
    const existing = ProfesorDAO.get();
    if (!existing) return res.status(400).json({ error: 'No hay profesor' });
    res.json(EmpresaFestivosDAO.getAll(existing.id!));
  });

  app.post('/api/empresas/festivos', (req, res) => {
    const existing = ProfesorDAO.get();
    if (!existing) return res.status(400).json({ error: 'No hay profesor' });
    const { localidad, festivos } = req.body;
    if (!localidad) return res.status(400).json({ error: 'localidad es requerida' });
    EmpresaFestivosDAO.setByCiudad(existing.id!, localidad, festivos || []);

    // Recalcular fechas si la opción está habilitada
    let recalculadas = -1;
    const config = ConfiguracionDAO.getConfig(existing.id!, 'festivos');
    if (config.usar_festivos_empresa === '1') {
      try {
        recalculadas = recalcularFechasAlumnos(existing.id!);
      } catch (e) {
        console.error('Error al recalcular fechas:', e);
      }
    }

    res.json({ success: true, recalculadas });
  });

  // Empresa por id (para detalle puntual p.ej. generación de eventos de calendario)
  app.get('/api/empresas/:id', (req, res) => {
    const emp = EmpresaDAO.getById(Number(req.params.id));
    if (!emp) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(emp);
  });

  // Tutores Empresa
  app.get('/api/empresas/:empresaId/tutores', (req, res) => res.json(TutorEmpresaDAO.getAllByEmpresa(Number(req.params.empresaId))));
  app.post('/api/tutores-empresa', (req, res) => res.json({ id: TutorEmpresaDAO.create(req.body) }));
  app.put('/api/tutores-empresa/:id', (req, res) => {
    TutorEmpresaDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/tutores-empresa/:id', (req, res) => {
    TutorEmpresaDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // Estadísticas Empresa
  app.get('/api/empresas-estadisticas', (req, res) => res.json(EmpresaEstadisticaDAO.getAll()));
  app.get('/api/empresas/:empresaId/estadisticas', (req, res) => res.json(EmpresaEstadisticaDAO.getAllByEmpresa(Number(req.params.empresaId))));
  app.get('/api/empresas-estadisticas/by-curso', (req, res) => {
    const { empresaId, curso } = req.query;
    const est = EmpresaEstadisticaDAO.getByEmpresaAndCurso(Number(empresaId), curso as string);
    res.json(est || null);
  });
  app.post('/api/empresas-estadisticas', (req, res) => res.json({ id: EmpresaEstadisticaDAO.create(req.body) }));
  app.post('/api/empresas-estadisticas/upsert', (req, res) => {
    const { empresaId, curso, numAlumnos, contratados, valoracion } = req.body;
    const id = EmpresaEstadisticaDAO.upsert(Number(empresaId), curso, { numAlumnos, contratados, valoracion });
    res.json({ id });
  });
  app.put('/api/empresas-estadisticas/:id', (req, res) => {
    EmpresaEstadisticaDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/empresas-estadisticas/:id', (req, res) => {
    EmpresaEstadisticaDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // Convenios
  app.get('/api/convenios', (req, res) => res.json(ConvenioDAO.getAll(
    req.query.cursoId ? Number(req.query.cursoId) : undefined,
    req.query.centroId ? Number(req.query.centroId) : undefined
  )));
  app.get('/api/convenios/:id', (req, res) => {
    const conv = ConvenioDAO.getById(Number(req.params.id));
    if (!conv) return res.status(404).json({error: 'Convenio no encontrado'});
    res.json(conv);
  });
  app.post('/api/convenios', (req, res) => {
    const { convenio } = req.body;
    if (!convenio.empresaId) return res.status(400).json({ error: 'La empresa supervisora es obligatoria.' });
    const id = ConvenioDAO.create(convenio);
    try { HistoricoDAO.logOperacionConvenio('CREATE', id as number, convenio.numConvenio); } catch {}
    res.json({ id });
  });

  app.put('/api/convenios/:id', (req, res) => {
    const { convenio } = req.body;
    if (!convenio.empresaId) return res.status(400).json({ error: 'La empresa supervisora es obligatoria.' });
    const old = ConvenioDAO.getById(Number(req.params.id));
    ConvenioDAO.update(Number(req.params.id), convenio);
    try {
      HistoricoDAO.logOperacionConvenio('UPDATE', Number(req.params.id), convenio.numConvenio);
      if (old && old.estado !== convenio.estado) {
        HistoricoDAO.logCambioEstado('convenio', old.estado, convenio.estado, Number(req.params.id), convenio.numConvenio);
      }
    } catch {}
    res.json({ success: true });
  });
  app.delete('/api/convenios/:id', (req, res) => {
    const old = ConvenioDAO.getById(Number(req.params.id));
    ConvenioDAO.delete(Number(req.params.id));
    try { HistoricoDAO.logOperacionConvenio('DELETE', Number(req.params.id), old?.numConvenio); } catch {}
    res.json({ success: true });
  });

  // ─── Documentos de Convenio ───

  app.post('/api/documentos/convenio', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({error: 'No se ha subido ningún archivo'});
    const {convenioId, comentario, nombreFichero} = req.body;
    if (!convenioId) return res.status(400).json({error: 'Falta convenioId'});

    const convenioRow = db.prepare('SELECT c.numConvenio, e.nombre as empresaNombre FROM convenios c JOIN empresas e ON c.empresaId = e.id WHERE c.id = ?').get(Number(convenioId)) as any;
    if (!convenioRow) return res.status(404).json({error: 'Convenio no encontrado'});

    let finalNombre = nombreFichero;
    if (!finalNombre) {
      const parts = (convenioRow.numConvenio as string).split('/');
      const ref = parts.length > 1 ? parts[parts.length - 1].trim() : (convenioRow.numConvenio as string).trim();
      const paddedRef = ref.padStart(4, '0');
      const empresaSanitized = sanitizeDirName((convenioRow.empresaNombre as string) || '');
      finalNombre = `CONV_${paddedRef}_${empresaSanitized}.pdf`;
    }

    const nextVersion = DocConvenioDAO.getNextVersion(Number(convenioId));

    const base64Data = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64Data}`;

    const id = DocConvenioDAO.create({
      convenioId: Number(convenioId),
      nombreFichero: finalNombre,
      contenido: dataURI,
      comentario: comentario || null,
      version: nextVersion,
    } as DocConvenio);

    res.json({id, version: nextVersion, nombreFichero: finalNombre});
  });

  app.get('/api/documentos/convenio', (req, res) => {
    const convenioId = req.query.convenioId ? Number(req.query.convenioId) : undefined;
    if (!convenioId) return res.status(400).json({error: 'Falta convenioId'});
    res.json(DocConvenioDAO.getByConvenioId(convenioId));
  });

  app.get('/api/documentos/convenio/:id/download', (req, res) => {
    const doc = DocConvenioDAO.getById(Number(req.params.id));
    if (!doc) return res.status(404).json({error: 'Documento no encontrado'});

    // El contenido es un data URI: data:application/pdf;base64,XXXXX
    const matches = doc.contenido.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return res.status(500).json({error: 'Formato de documento inválido'});

    const buffer = Buffer.from(matches[2], 'base64');
    res.setHeader('Content-Type', matches[1]);
    res.setHeader('Content-Disposition', `inline; filename="${doc.nombreFichero}"`);
    res.send(buffer);
  });

  app.delete('/api/documentos/convenio/:id', (req, res) => {
    DocConvenioDAO.delete(Number(req.params.id));
    res.json({success: true});
  });

  // ─── Documentos de Relación ───

  app.post('/api/documentos/relacion', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({error: 'No se ha subido ningún archivo'});
    const {relacionId, comentario, nombreFichero} = req.body;
    if (!relacionId) return res.status(400).json({error: 'Falta relacionId'});

    const relacion = RelacionAlumnoDAO.getById(Number(relacionId));
    if (!relacion) return res.status(404).json({error: 'Relación no encontrada'});

    let finalNombre = nombreFichero;
    if (!finalNombre) {
      // Buscar codigoGrupo del detalle académico de los alumnos
      let codigoGrupo = '';
      if (relacion.alumnos && relacion.alumnos.length > 0) {
        const alumno = relacion.alumnos[0];
        const da = db.prepare('SELECT codigoGrupo FROM detalles_academicos WHERE id = ?').get(alumno.detalleAcademicoId) as any;
        if (da) codigoGrupo = da.codigoGrupo || '';
      }
      const dnis = (relacion.alumnos || []).map((a: any) => a.dni).join('_');
      finalNombre = `RELA_${codigoGrupo}_${dnis}.pdf`;
    }

    const nextVersion = DocRelacionDAO.getNextVersion(Number(relacionId));

    const base64Data = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64Data}`;

    const id = DocRelacionDAO.create({
      relacionId: Number(relacionId),
      nombreFichero: finalNombre,
      contenido: dataURI,
      comentario: comentario || null,
      version: nextVersion,
    } as DocRelacion);

    res.json({id, version: nextVersion, nombreFichero: finalNombre});
  });

  app.get('/api/documentos/relacion', (req, res) => {
    const relacionId = req.query.relacionId ? Number(req.query.relacionId) : undefined;
    if (!relacionId) return res.status(400).json({error: 'Falta relacionId'});
    res.json(DocRelacionDAO.getByRelacionId(relacionId));
  });

  app.get('/api/documentos/relacion/:id/download', (req, res) => {
    const doc = DocRelacionDAO.getById(Number(req.params.id));
    if (!doc) return res.status(404).json({error: 'Documento no encontrado'});

    const matches = doc.contenido.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return res.status(500).json({error: 'Formato de documento inválido'});

    const buffer = Buffer.from(matches[2], 'base64');
    res.setHeader('Content-Type', matches[1]);
    res.setHeader('Content-Disposition', `inline; filename="${doc.nombreFichero}"`);
    res.send(buffer);
  });

  app.delete('/api/documentos/relacion/:id', (req, res) => {
    DocRelacionDAO.delete(Number(req.params.id));
    res.json({success: true});
  });

  // ─── Documentos de Plan Formativo, Seguimiento, Valoración ───

  function addDocAlumnoRoutes(apiPath: string, dao: any, prefijo: string, docType: string) {
    const dbTable = docType === 'plan-formativo' ? 'doc_planes_formativos' : `doc_${docType}`;

    app.post(`/api/documentos/${apiPath}`, upload.single('file'), (req, res) => {
      if (!req.file) return res.status(400).json({error: 'No se ha subido ningún archivo'});
      const {relacionId, alumnoId, comentario, nombreFichero} = req.body;
      if (!relacionId) return res.status(400).json({error: 'Falta relacionId'});
      if (!alumnoId) return res.status(400).json({error: 'Falta alumnoId'});

      const alumno = db.prepare('SELECT dni, detalleAcademicoId FROM alumnos WHERE id = ?').get(Number(alumnoId)) as any;
      if (!alumno) return res.status(404).json({error: 'Alumno no encontrado'});

      let finalNombre = nombreFichero;
      if (!finalNombre) {
        let codigoGrupo = '';
        const da = db.prepare('SELECT codigoGrupo FROM detalles_academicos WHERE id = ?').get(alumno.detalleAcademicoId) as any;
        if (da) codigoGrupo = da.codigoGrupo || '';
        finalNombre = `${prefijo}_${codigoGrupo}_${alumno.dni}.pdf`;
      }

      const nextVersion = dao.getNextVersion(Number(relacionId), Number(alumnoId));

      const base64Data = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Data}`;

      const id = dao.create({
        relacionId: Number(relacionId),
        alumnoId: Number(alumnoId),
        nombreFichero: finalNombre,
        contenido: dataURI,
        comentario: comentario || null,
        version: nextVersion,
      });

      res.json({id, version: nextVersion, nombreFichero: finalNombre});
    });

    app.get(`/api/documentos/${apiPath}`, (req, res) => {
      const relacionId = req.query.relacionId ? Number(req.query.relacionId) : undefined;
      const alumnoId = req.query.alumnoId ? Number(req.query.alumnoId) : undefined;
      if (!relacionId) return res.status(400).json({error: 'Falta relacionId'});
      if (!alumnoId) return res.status(400).json({error: 'Falta alumnoId'});
      res.json(dao.getByRelacionIdAndAlumnoId(relacionId, alumnoId));
    });

    app.get(`/api/documentos/${apiPath}/:id/download`, (req, res) => {
      const doc = dao.getById(Number(req.params.id));
      if (!doc) return res.status(404).json({error: 'Documento no encontrado'});

      const matches = doc.contenido.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return res.status(500).json({error: 'Formato de documento inválido'});

      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', matches[1]);
      res.setHeader('Content-Disposition', `inline; filename="${doc.nombreFichero}"`);
      res.send(buffer);
    });

    app.delete(`/api/documentos/${apiPath}/:id`, (req, res) => {
      dao.delete(Number(req.params.id));
      res.json({success: true});
    });
  }

  addDocAlumnoRoutes('plan-formativo', DocPlanFormativoDAO, 'PLFO', 'plan-formativo');
  addDocAlumnoRoutes('seguimiento', DocSeguimientoDAO, 'SEGP', 'seguimiento');
  addDocAlumnoRoutes('valoracion', DocValoracionDAO, 'VALO', 'valoracion');

  // ─── Última versión de un documento, para mandarlo por correo ────
  //
  // Responde solo con el identificador, el nombre y la versión; el archivo se
  // descarga después por su ruta de siempre. Con el contenido dentro, esta
  // respuesta arrastraría el archivo entero en base64 para acabar descartando
  // todas las versiones menos la última.
  //
  // El 404 es parte del contrato: quien pregunta es el envío de correo, y para
  // él "no hay nada subido" y "no existe" son la misma respuesta, porque en los
  // dos casos no hay nada que mandar.
  //
  // Cada tipo se cuelga de lo suyo: las relaciones y los documentos de alumno
  // van por `relacionId`, y los del convenio por `convenioId`. Por eso cada
  // entrada dice de qué campo se cuelga, en vez de suponerlo a partir del tipo.

  const DAOS_GESTOR_DOCUMENTAL: Record<string, { dao: any; campo: 'relacionId' | 'convenioId'; porAlumno: boolean }> = {
    'relacion': { dao: DocRelacionDAO, campo: 'relacionId', porAlumno: false },
    'plan-formativo': { dao: DocPlanFormativoDAO, campo: 'relacionId', porAlumno: true },
    'seguimiento': { dao: DocSeguimientoDAO, campo: 'relacionId', porAlumno: true },
    'valoracion': { dao: DocValoracionDAO, campo: 'relacionId', porAlumno: true },
    'convenio': { dao: DocConvenioDAO, campo: 'convenioId', porAlumno: false },
  };

  app.get('/api/documentos/adjunto', (req, res) => {
    const tipo = String(req.query.tipo || '');
    const relacionId = req.query.relacionId ? Number(req.query.relacionId) : undefined;
    const alumnoId = req.query.alumnoId ? Number(req.query.alumnoId) : undefined;
    const convenioId = req.query.convenioId ? Number(req.query.convenioId) : undefined;

    const entrada = DAOS_GESTOR_DOCUMENTAL[tipo];
    if (!entrada) return res.status(404).json({ error: 'Ese tipo de documento no se archiva.' });

    // "Falta X" (400) es una llamada mal formada y hay que notarla; "no hay
    // ninguna versión subida" (404) es una respuesta normal y la que el cliente
    // usa para decidir que no se adjunta nada.
    const duenio = entrada.campo === 'convenioId' ? convenioId : relacionId;
    if (!duenio) return res.status(400).json({ error: `Falta ${entrada.campo}` });
    if (entrada.porAlumno && !alumnoId) return res.status(400).json({ error: 'Falta alumnoId' });

    const doc = entrada.dao.getUltimo(duenio, alumnoId);
    if (!doc) return res.status(404).json({ error: 'No hay ninguna versión subida.' });

    res.json({
      id: doc.id,
      nombreFichero: doc.nombreFichero,
      version: doc.version,
      comentario: doc.comentario || null,
    });
  });

  // ─── Documentos Comunicación DAT ────────────────────

  app.post('/api/documentos/com-dat', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({error: 'No se ha subido ningún archivo'});
    const {comunicacionDatId, comentario, nombreFichero} = req.body;
    if (!comunicacionDatId) return res.status(400).json({error: 'Falta comunicacionDatId'});

    const nextVersion = DocComunicacionDATDAO.getNextVersion(Number(comunicacionDatId));
    const base64Data = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64Data}`;

    const id = DocComunicacionDATDAO.create({
      comunicacionDatId: Number(comunicacionDatId),
      nombreFichero: nombreFichero || 'documento.pdf',
      contenido: dataURI,
      comentario: comentario || null,
      version: nextVersion,
    });
    res.json({id, version: nextVersion, nombreFichero: nombreFichero || 'documento.pdf'});
  });

  app.get('/api/documentos/com-dat', (req, res) => {
    const comunicacionDatId = Number(req.query.comunicacionDatId);
    if (!comunicacionDatId) return res.status(400).json({error: 'Falta comunicacionDatId'});
    res.json(DocComunicacionDATDAO.getByComunicacionId(comunicacionDatId));
  });

  app.get('/api/documentos/com-dat/:id/download', (req, res) => {
    const doc = DocComunicacionDATDAO.getById(Number(req.params.id));
    if (!doc) return res.status(404).json({error: 'Documento no encontrado'});

    const matches = doc.contenido.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return res.status(500).json({error: 'Formato de documento inválido'});

    const buffer = Buffer.from(matches[2], 'base64');
    res.setHeader('Content-Type', matches[1]);
    res.setHeader('Content-Disposition', `inline; filename="${doc.nombreFichero}"`);
    res.send(buffer);
  });

  app.delete('/api/documentos/com-dat/:id', (req, res) => {
    DocComunicacionDATDAO.delete(Number(req.params.id));
    res.json({success: true});
  });

  // ─── Comunicaciones DAT ─────────────────────────────

  app.get('/api/comunicaciones-dat', (req, res) => {
    const detalleAcademicoId = Number(req.query.detalleAcademicoId);
    if (!detalleAcademicoId) return res.status(400).json({error: 'Falta detalleAcademicoId'});
    res.json(ComunicacionDATDAO.getAllByDetalleAcademico(detalleAcademicoId));
  });

  app.post('/api/comunicaciones-dat', (req, res) => {
    const {fecha, alumnoIds, detalleAcademicoId} = req.body;
    if (!fecha || !alumnoIds || !detalleAcademicoId) return res.status(400).json({error: 'Faltan datos'});
    const id = ComunicacionDATDAO.create(fecha, detalleAcademicoId, alumnoIds);
    res.json({id, fecha, estado: 'PENDIENTE_ENVIAR_DIRECTOR'});
  });

  app.put('/api/comunicaciones-dat/:id', (req, res) => {
    ComunicacionDATDAO.update(Number(req.params.id), req.body.fecha);
    res.json({success: true});
  });

  app.put('/api/comunicaciones-dat/:id/estado', (req, res) => {
    ComunicacionDATDAO.updateEstado(Number(req.params.id), req.body.estado);
    res.json({success: true});
  });

  app.delete('/api/comunicaciones-dat/:id', (req, res) => {
    ComunicacionDATDAO.delete(Number(req.params.id));
    res.json({success: true});
  });

  app.get('/api/alumnos/con-relacion-completada', (req, res) => {
    const detalleAcademicoId = Number(req.query.detalleAcademicoId);
    const incluirConComunicacion = req.query.incluirConComunicacion === 'true';
    if (!detalleAcademicoId) return res.status(400).json({error: 'Falta detalleAcademicoId'});
    let sql = 'SELECT * FROM alumnos WHERE detalleAcademicoId = ? AND relacionId IS NOT NULL AND (SELECT estado FROM relaciones WHERE id = relacionId) = ?';
    if (!incluirConComunicacion) sql += ' AND comunicacionDAT IS NULL';
    res.json(db.prepare(sql).all(detalleAcademicoId, 'COMPLETADO'));
  });

  // ─── NextCloud ──────────────────────────────────────
  // Raw WebDAV (compatible con todas las versiones de NextCloud)

  function resolveNextCloudCreds(existing: any, body: any): {
    serverUrl: string;
    username: string;
    password: string
  } | null {
    const profesorId = existing?.id;
    let serverUrl = body.server_url || body.serverUrl;
    let username = body.username;
    let password = body.password;

    // 1. Try body creds
    if (serverUrl && username && password) {
      return {serverUrl, username, password};
    }

    // 2. Try saved cloud config
    if (profesorId) {
      const saved = ConfiguracionDAO.getConfig(profesorId, 'cloud');
      if (saved) {
        serverUrl = serverUrl || saved.server_url || saved.serverUrl || '';
        username = username || saved.username || '';
        password = password || saved.password || '';
        if (serverUrl && username && password) {
          return {serverUrl, username, password};
        }
      }
    }

    return null;
  }

  function getWebDavUrl(serverUrl: string, username: string): string {
    const s = serverUrl.replace(/\/+$/, '');
    // If user already specified a full WebDAV path, use it as-is
    if (s.includes('/remote.php/webdav') || s.includes('/remote.php/dav')) return s;
    // Modern NextCloud uses personal files endpoint
    if (username) return `${s}/remote.php/dav/files/${encodeURIComponent(username)}`;
    return `${s}/remote.php/webdav`;
  }

  function getBasicAuthHeader(username: string, password: string): string {
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  app.post('/api/nextcloud/list-folders', async (req, res) => {
    try {
      const existing = ProfesorDAO.get();
      if (!existing) return res.status(400).json({error: 'No hay profesor'});
      const creds = resolveNextCloudCreds(existing, req.body);
      if (!creds) {
        return res.status(400).json({error: 'NextCloud no configurado. Guarda la configuración primero.'});
      }
      const {serverUrl, username, password} = creds;

      const webdavUrl = getWebDavUrl(serverUrl, username);
      const auth = getBasicAuthHeader(username, password);
      const path: string = req.body.path || '/';
      const cleanPath = path.replace(/\/+$/, '') || '/';

      const propfindBody = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:getlastmodified />
    <d:resourcetype />
    <oc:fileid />
  </d:prop>
</d:propfind>`;

      const url = `${webdavUrl}${cleanPath}`;
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        body: propfindBody,
      });

      if (!response.ok) {
        console.error('[NextCloud] PROPFIND failed:', response.status, response.statusText, 'url:', url, 'user:', username);
        return res.status(400).json({error: `Error NextCloud (${response.status}): ${response.statusText}`});
      }

      const text = await response.text();
      // Parse the multistatus XML
      const folders: { name: string; path: string }[] = [];
      const regex = /<d:response[^>]*>([\s\S]*?)<\/d:response>/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const respXml = match[1];
        const hrefMatch = respXml.match(/<d:href[^>]*>([^<]+)<\/d:href>/);
        if (!hrefMatch) continue;
        let href = decodeURIComponent(hrefMatch[1].trim());
        // Skip the current folder
        const baseUrlForCompare = (url.endsWith('/') ? url : url + '/');
        if (baseUrlForCompare.endsWith(href) || baseUrlForCompare === href) continue;
        // Check if it's a directory
        if (!respXml.includes('<d:collection/>')) continue;
        // Extract name from href
        href = href.replace(/\/+$/, '');
        const name = href.split('/').pop() || '';
        if (!name) continue;
        // Build relative path
        const webdavBase = webdavUrl.replace(/\/+$/, '') + '/';
        const relPath = href.startsWith(webdavBase) ? href.slice(webdavBase.length - 1) : '/' + href.split('/').slice(href.split('/').indexOf('files') + 1).join('/');
        folders.push({
          name,
          path: cleanPath === '/' ? `/${name}` : `${cleanPath}/${name}`,
        });
      }

      res.json({folders});
    } catch (e: any) {
      console.error('NextCloud list error:', e);
      res.status(500).json({error: e.message || 'Error al listar carpetas'});
    }
  });

  app.post('/api/nextcloud/upload', async (req, res) => {
    try {
      const existing = ProfesorDAO.get();
      if (!existing) return res.status(400).json({error: 'No hay profesor'});
      const creds = resolveNextCloudCreds(existing, req.body);
      if (!creds) {
        return res.status(400).json({error: 'NextCloud no configurado'});
      }
      const {serverUrl, username, password} = creds;

      const {folder: folderPath, filename, contentBase64} = req.body;
      if (!folderPath || !filename || !contentBase64) {
        return res.status(400).json({error: 'Faltan datos: folder, filename, contentBase64'});
      }

      const webdavUrl = getWebDavUrl(serverUrl, username);
      const auth = getBasicAuthHeader(username, password);
      const buffer = Buffer.from(contentBase64, 'base64');

      // Ensure folder exists (MKCOL)
      const cleanFolder = folderPath.replace(/\/+$/, '') || '/';
      const folderUrl = `${webdavUrl}${cleanFolder}`;
      try {
        await fetch(folderUrl, {method: 'MKCOL', headers: {'Authorization': auth}});
      } catch { /* folder may already exist */
      }

      // Upload file (PUT)
      const fileUrl = `${webdavUrl}${cleanFolder}/${filename}`;
      const putRes = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });

      if (!putRes.ok) {
        console.error('[NextCloud] PUT failed:', putRes.status, putRes.statusText, 'url:', fileUrl, 'user:', username);
        return res.status(400).json({error: `Error al subir (${putRes.status}): ${putRes.statusText}`});
      }

      res.json({success: true, name: filename});
    } catch (e: any) {
      console.error('NextCloud upload error:', e);
      res.status(500).json({error: e.message || 'Error al subir a NextCloud'});
    }
  });

  // Intereses
  app.get('/api/intereses', (req, res) => res.json(InteresDAO.getIntereses(
    req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined
  )));
  app.post('/api/intereses', (req, res) => {
    InteresDAO.add(req.body);
    res.json({ success: true });
  });
  app.delete('/api/intereses', (req, res) => {
    const { alumnoId, empresaId, interesado } = req.body;
    InteresDAO.remove(Number(alumnoId), Number(empresaId), interesado);
    res.json({ success: true });
  });

  // Relaciones Alumnos
  app.get('/api/relaciones-alumnos', (req, res) => {
    if (req.query.convenioId) {
      return res.json(RelacionAlumnoDAO.getByConvenio(Number(req.query.convenioId)));
    }
    res.json(RelacionAlumnoDAO.getAll(
      req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined
    ));
  });
  app.get('/api/relaciones-alumnos/:id', (req, res) => {
    const rel = RelacionAlumnoDAO.getById(Number(req.params.id));
    if (!rel) return res.status(404).json({error: 'Relación no encontrada'});
    res.json(rel);
  });
  app.post('/api/relaciones-alumnos', (req, res) => {
    try {
      const convenio = ConvenioDAO.getById(req.body.convenioId);
      if (!convenio) {
        return res.status(400).json({ error: 'El convenio seleccionado no existe.' });
      }
      if (convenio.estado !== 'COMPLETADO') {
        return res.status(400).json({ error: 'No se puede crear una relación si el convenio no está completado.' });
      }
      const id = RelacionAlumnoDAO.create(req.body);
      try { HistoricoDAO.logOperacionRelacion('CREATE', id as number, req.body.numRelacion); } catch {}
      res.json({ id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear la relación y vincular alumnos' });
    }
  });
  app.put('/api/relaciones-alumnos/:id', (req, res) => {
    try {
      const old = RelacionAlumnoDAO.getById(Number(req.params.id));
      RelacionAlumnoDAO.update(Number(req.params.id), req.body);
      try {
        HistoricoDAO.logOperacionRelacion('UPDATE', Number(req.params.id), req.body.numRelacion);
        if (old && old.estado !== req.body.estado) {
          HistoricoDAO.logCambioEstado('relacion', old.estado, req.body.estado, Number(req.params.id), req.body.numRelacion);
        }
      } catch {}
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar' });
    }
  });
  app.delete('/api/relaciones-alumnos/:id', (req, res) => {
    try {
      const old = RelacionAlumnoDAO.getById(Number(req.params.id));
      RelacionAlumnoDAO.delete(Number(req.params.id));
      try { HistoricoDAO.logOperacionRelacion('DELETE', Number(req.params.id), old?.numRelacion); } catch {}
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });

  // ─── HISTÓRICO ──────────────────────────────────────

  app.get('/api/historico/comunicaciones', (req, res) => {
    res.json(HistoricoDAO.getComunicaciones(req.query as any));
  });
  app.get('/api/historico/emails-contactados', (req, res) => {
    res.json(HistoricoDAO.getEmailsContactados());
  });
  app.get('/api/historico/convenios', (req, res) => {
    res.json(HistoricoDAO.getOperacionesConvenio(req.query as any));
  });
  app.get('/api/historico/relaciones', (req, res) => {
    res.json(HistoricoDAO.getOperacionesRelacion(req.query as any));
  });
  app.get('/api/historico/estados', (req, res) => {
    res.json(HistoricoDAO.getCambiosEstado(req.query as any));
  });
  app.get('/api/historico/anulaciones/counts', (req, res) => {
    const ids = String(req.query.alumnoIds || '').split(',').map(s => Number(s)).filter(n => !Number.isNaN(n));
    res.json(HistoricoDAO.countAnulacionesPorAlumno(ids));
  });
  app.get('/api/historico/anulaciones', (req, res) => {
    res.json(HistoricoDAO.getAnulacionesFFE(req.query as any));
  });

  // ─── AVISOS ──────────────────────────────────────────

  app.post('/api/avisos/generate', (req, res) => {
    try {
      const profesor = ProfesorDAO.get();
      if (!profesor?.id) return res.status(400).json({ error: 'Profesor no encontrado' });
      const avisos = AvisosDAO.generarAutomaticos(profesor.id);
      res.json(avisos);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/avisos', (req, res) => {
    try {
      res.json(AvisosDAO.getActivos());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/avisos', (req, res) => {
    try {
      const { fecha_aviso, asunto, descripcion } = req.body;
      if (!fecha_aviso || !asunto || !descripcion) {
        return res.status(400).json({ error: 'fecha_aviso, asunto y descripcion son requeridos' });
      }
      const id = AvisosDAO.crear({ fecha_aviso, asunto, descripcion, origen: 'manual' });
      res.json({ id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/avisos/:id/descartar', (req, res) => {
    try {
      AvisosDAO.descartar(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/avisos/:id/posponer', (req, res) => {
    try {
      AvisosDAO.posponer(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GENERAR DOCX
  app.get('/api/relaciones-alumnos/:id/documento', (req, res) => {
    try {
      const modo = getCreacionFicherosModo();
      const relacionId = Number(req.params.id);
      const relacionAlumno = RelacionAlumnoDAO.getById(relacionId);

      if (!relacionAlumno) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacionAlumno.convenioId);
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const centro = CentroDAO.getById(convenio.centroId!);
      const tutorEmpresa = TutorEmpresaDAO.getById(relacionAlumno.tutorEmpresaId);
      const curso = CursoDAO.getById(convenio.cursoId);
      const profesor = ProfesorDAO.get();

      // NUEVO: Buscamos TODOS los alumnos que tienen esta relacionId
      const alumnosAsignados: Alumno[] = relacionAlumno.alumnos || [];

      const fechaFormateada = formatDate(convenio.fechaConvenio);

      // Buscamos el detalle académico (asumiendo que todos los alumnos de la relación comparten ciclo)
      // 1. Tipamos la variable permitiendo que sea 'undefined'
      let detalleAcademicoGlobal: DetalleAcademico | undefined = undefined;

      // 2. Buscamos el primer alumno que SÍ tenga un detalleAcademicoId asignado
      const alumnoConDetalle = alumnosAsignados.find(a => a.detalleAcademicoId);

      // 3. Si encontramos a ese alumno, buscamos su detalle en la base de datos
      if (alumnoConDetalle && alumnoConDetalle.detalleAcademicoId) {
        detalleAcademicoGlobal = DetalleAcademicoDAO.getById(alumnoConDetalle.detalleAcademicoId);
      }

      const horasSemanales =
        (relacionAlumno.horario.lunes?.horas || 0) + (relacionAlumno.horario.martes?.horas || 0) +
        (relacionAlumno.horario.miercoles?.horas || 0) + (relacionAlumno.horario.jueves?.horas || 0) +
        (relacionAlumno.horario.viernes?.horas || 0);

      // NUEVO: Mapeamos los alumnos directamente desde el array de la BD
      const alumnosData = alumnosAsignados.map((alumno, index) => {
        return {
          INDEX: index + 1,
          APELLIDOS_NOMBRE: `${alumno.apellidos}, ${alumno.nombre}`,
          NIF: alumno.dni,
          FECHA_NAC: formatDate(alumno.fechaNacimiento),
          F_INICIO: formatDate(alumno.fechaInicio),
          F_FIN: formatDate(alumno.fechaFin),
          DIAS: "L-V",
          H_INICIO: relacionAlumno.horario.lunes?.inicio || '',
          H_FIN: relacionAlumno.horario.lunes?.fin || '',
          H_SEM: horasSemanales,
          T_HORAS: alumno.totalHorasFFE || 0
        };
      });

      const isProd = process.env.NODE_ENV === 'production';
      const templatePath = isProd
        ? path.join(__dirname, '..', 'templates', 'docs', 'plantilla_relacion.docx')
        : path.join(process.cwd(), 'templates', 'docs', 'plantilla_relacion.docx');

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => ""
      });

      doc.render({
        CURSO: curso?.descripcion || '',
        NUMERO_CONVENIO: convenio?.numConvenio || '',
        NUMERO_RELACION_ALUMNO: relacionAlumno?.numRelacion || '',
        FEC_CONVENIO: fechaFormateada,
        CENTRO_NOMBRE: centro?.nombre || '',
        EMPRESA_NOMBRE: empresa?.nombre || '',
        TUTOR_APELLIDOS: profesor?.apellidos || '',
        TUTOR_NOMBRE: profesor?.nombre || '',
        TUTOR_NIF: profesor?.nif || '',
        TUTOR_EMAIL: profesor?.email || '',
        EMPRESA_TUTOR_APELLIDOS: tutorEmpresa?.apellidos || '',
        EMPRESA_TUTOR_NOMBRE: tutorEmpresa?.nombre || '',
        EMPRESA_TUTOR_NIF: tutorEmpresa?.nif || '',
        EMPRESA_TUTOR_EMAIL: tutorEmpresa?.email || '',
        EMPRESA_DIRECCION: empresa ? `${empresa.direccion}, ${empresa.ciudad}` : '',
        CICLO: detalleAcademicoGlobal?.ciclo || '',
        NIVEL: detalleAcademicoGlobal?.nivel || '',
        GRADO: detalleAcademicoGlobal?.grado || '',
        CICLO_CODIGO: detalleAcademicoGlobal?.codigo || '',
        REGIMEN: detalleAcademicoGlobal?.regimen || '',
        alumnos: alumnosData
      });

      const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      const filename = `Anexo_Relacion_${relacionAlumno.numRelacion.replace(/\//g, '_')}.docx`;

      if (modo === 'crear' && req.query.raw !== '1') {
        const result = saveToDocs(filename, buf, empresa?.nombre);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buf);

    } catch (error) {
      console.error('Error generando documento:', error);
      res.status(500).json({ error: 'No se pudo generar el documento' });
    }
  });

  // GENERAR PDF (Usando la misma lógica que DOCX para obtener datos y Handlebars para el HTML, luego Puppeteer para el PDF)
  app.get('/api/relaciones-alumnos/:id/documento/pdf', async (req, res) => {
    let browser;
    try {
      // 1. OBTENCIÓN DE DATOS (Misma lógica que tienes, omitida por brevedad)
      const relacionAlumno = RelacionAlumnoDAO.getById(Number(req.params.id));
      if (!relacionAlumno) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacionAlumno.convenioId);
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const centro = CentroDAO.getById(convenio.centroId!);
      const tutorEmpresa = TutorEmpresaDAO.getById(relacionAlumno.tutorEmpresaId);
      const curso = CursoDAO.getById(convenio.cursoId);
      const profesor = ProfesorDAO.get();

      const alumnosAsignados: Alumno[] = relacionAlumno.alumnos || [];

      const fechaFormateada = formatDate(convenio.fechaConvenio);

      // Buscamos el detalle académico (asumiendo que todos los alumnos de la relación comparten ciclo)
      // 1. Tipamos la variable permitiendo que sea 'undefined'
      let detalleAcademicoGlobal: DetalleAcademico | undefined = undefined;

      // 2. Buscamos el primer alumno que SÍ tenga un detalleAcademicoId asignado
      const alumnoConDetalle = alumnosAsignados.find(a => a.detalleAcademicoId);

      // 3. Si encontramos a ese alumno, buscamos su detalle en la base de datos
      if (alumnoConDetalle && alumnoConDetalle.detalleAcademicoId) {
        detalleAcademicoGlobal = DetalleAcademicoDAO.getById(alumnoConDetalle.detalleAcademicoId);
      }

      const horasSemanales =
        (relacionAlumno.horario.lunes?.horas || 0) + (relacionAlumno.horario.martes?.horas || 0) +
        (relacionAlumno.horario.miercoles?.horas || 0) + (relacionAlumno.horario.jueves?.horas || 0) +
        (relacionAlumno.horario.viernes?.horas || 0);

      // NUEVO: Mapeamos los alumnos directamente desde el array de la BD
      const alumnosData = alumnosAsignados.map((alumno, index) => {

        const horasSemanales =
          (relacionAlumno.horario.lunes?.horas || 0) + (relacionAlumno.horario.martes?.horas || 0) +
          (relacionAlumno.horario.miercoles?.horas || 0) + (relacionAlumno.horario.jueves?.horas || 0) +
          (relacionAlumno.horario.viernes?.horas || 0);

        let fInicio = alumno.fechaInicio;
        let fFin = alumno.fechaFin;

        return {
          INDEX: index + 1,
          APELLIDOS_NOMBRE: `${alumno.apellidos}, ${alumno.nombre}`,
          NIF: alumno.dni,
          FECHA_NAC: formatDate(alumno.fechaNacimiento),
          F_INICIO: formatDate(fInicio),
          F_FIN: formatDate(fFin),
          DIAS: "L-V",
          H_INICIO: relacionAlumno.horario.lunes?.inicio || '',
          H_FIN: relacionAlumno.horario.lunes?.fin || '',
          H_SEM: horasSemanales,
          T_HORAS: alumno.totalHorasFFE || 0
        };
      });

      // 2. PROCESAMIENTO DE PLANTILLA HTML CON VERIFICACIÓN
      const isProd = process.env.NODE_ENV === 'production';
      // Intentamos localizar la carpeta templates de forma absoluta
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates', 'docs') : path.resolve(process.cwd(), 'templates', 'docs');
      const templatePath = path.join(templatesDir, 'plantilla_relacion.html');

      console.log(`Intentando leer plantilla en: ${templatePath}`);

      if (!fs.existsSync(templatePath)) {
        console.error("ERROR: No existe el archivo de plantilla HTML.");
        return res.status(500).json({ error: `Plantilla no encontrada en ${templatePath}` });
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(source);

      const htmlFinal = template({
        CURSO: curso?.descripcion || '',
        NUMERO_CONVENIO: convenio?.numConvenio || '',
        NUMERO_RELACION_ALUMNO: relacionAlumno?.numRelacion || '',
        FEC_CONVENIO: fechaFormateada,
        CENTRO_NOMBRE: centro?.nombre || '',
        EMPRESA_NOMBRE: empresa?.nombre || '',
        TUTOR_APELLIDOS: profesor?.apellidos || '',
        TUTOR_NOMBRE: profesor?.nombre || '',
        TUTOR_NIF: profesor?.nif || '',
        TUTOR_EMAIL: profesor?.email || '',
        EMPRESA_TUTOR_APELLIDOS: tutorEmpresa?.apellidos || '',
        EMPRESA_TUTOR_NOMBRE: tutorEmpresa?.nombre || '',
        EMPRESA_TUTOR_NIF: tutorEmpresa?.nif || '',
        EMPRESA_TUTOR_EMAIL: tutorEmpresa?.email || '',
        EMPRESA_DIRECCION: empresa ? `${empresa.direccion}, ${empresa.ciudad}` : '',
        CICLO: detalleAcademicoGlobal?.ciclo || '',
        NIVEL: detalleAcademicoGlobal?.nivel || '',
        GRADO: detalleAcademicoGlobal?.grado || '',
        CICLO_CODIGO: detalleAcademicoGlobal?.codigo || '',
        REGIMEN: detalleAcademicoGlobal?.regimen || '',
        alumnos: alumnosData
      });

      // 3. GENERACIÓN DE PDF CON PUPPETEER
      browser = await puppeteer.launch({
        headless: true, // Cambiado a true (formato moderno)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--font-render-hinting=none' // Mejora legibilidad en PDF
        ]
      });

      const page = await browser.newPage();

      // ESTO ES CRÍTICO: 
      // Si el HTML tiene imágenes locales, Puppeteer necesita conocer el "basePath"
      await page.setContent(htmlFinal, {
        waitUntil: 'load', // Espera a que carguen imágenes/estilos
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
      });

      await browser.close();

      // 4. ENVÍO SEGURO DEL BUFFER
      const modo = getCreacionFicherosModo();
      const filenamePdf = `Anexo_Relacion_${relacionAlumno.numRelacion.replace(/\//g, '_')}.pdf`;

      if (modo === 'crear' && req.query.raw !== '1') {
        const result = saveToDocs(filenamePdf, Buffer.from(pdfBuffer), empresa?.nombre);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      // Limpiamos cualquier cabecera previa que pudiera estar interfiriendo
      res.removeHeader('Transfer-Encoding');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=${filenamePdf}`);

      return res.end(pdfBuffer); // Usamos .end() para enviar el buffer binario puro

    } catch (error: any) {
      console.error('💥 ERROR CRÍTICO GENERANDO EL PDF:');

      if (error.properties && error.properties.errors) {
        console.error('El motor de plantillas ha encontrado estos errores en tu archivo Word:');
        error.properties.errors.forEach((err: any) => {
          console.error(`- Etiqueta problemática: {${err.properties.id}} | Motivo: ${err.message}`);
        });
      } else {
        console.error(error);
      }

      res.status(500).json({ error: 'No se pudo generar el plan formativo' });
    }
  });

  // Generador DOCX PLAN FORMATIVO INDIVIDUAL
  const formatearHorarioCompacto = (horario: any): string => {
    if (!horario || typeof horario !== 'object') return '';
    const DIAS: { key: string; abrev: string }[] = [
      { key: 'lunes', abrev: 'L' },
      { key: 'martes', abrev: 'M' },
      { key: 'miercoles', abrev: 'X' },
      { key: 'jueves', abrev: 'J' },
      { key: 'viernes', abrev: 'V' },
      { key: 'sabado', abrev: 'S' },
      { key: 'domingo', abrev: 'D' },
    ];
    const bloques: { dias: string[]; inicio: string; fin: string; horas: number }[] = [];
    DIAS.forEach((d) => {
      const dia = horario[d.key];
      if (!dia || dia.horas <= 0) return;
      const ultimo = bloques[bloques.length - 1];
      if (ultimo && ultimo.inicio === dia.inicio && ultimo.fin === dia.fin && ultimo.horas === dia.horas) {
        ultimo.dias.push(d.abrev);
      } else {
        bloques.push({ dias: [d.abrev], inicio: dia.inicio, fin: dia.fin, horas: dia.horas });
      }
    });
    return bloques.map((b) => {
      const dias = b.dias.length > 1 ? `${b.dias[0]}-${b.dias[b.dias.length - 1]}` : b.dias[0];
      return `${dias}: ${b.inicio}-${b.fin} (${b.horas}h)`;
    }).join(', ');
  };

  app.get('/api/relaciones-alumnos/:id/plan-formativo', (req, res) => {

    try {
      const relacionId = Number(req.params.id);
      const alumnoId = Number(req.query.alumnoId);

      const relacion = RelacionAlumnoDAO.getById(relacionId); //
      const alumno = AlumnoDAO.getById(alumnoId); //

      if (!relacion || !alumno) return res.status(404).json({ error: 'Datos no encontrados' });

      const convenio = ConvenioDAO.getById(relacion.convenioId); //
      const empresa = EmpresaDAO.getById(convenio.empresaId); //
      const centro = CentroDAO.getById(convenio.centroId!); //
      const tutorEmpresa = TutorEmpresaDAO.getById(relacion.tutorEmpresaId); //
      const curso = CursoDAO.getById(convenio.cursoId); //
      const profesor = ProfesorDAO.get(); //
      const detalle = alumno.detalleAcademicoId ? DetalleAcademicoDAO.getById(alumno.detalleAcademicoId) : undefined; //

      // Mapeo de Resultados de Aprendizaje
      const RAsData = (detalle?.resultadosAprendizaje || []).map((ra: any) => ({
        MODULO: ra.modulo,
        MODULO_CODIGO: ra.codigo,
        RA_NUMERO: ra.ra,
        // IMPORTANTE: Como tu plantilla usa {@ etiqueta}, debemos enviar un objeto XML o texto simple sin conflictos
        CHECK_INTEGRO: generarCheckboxInteractivoXML(ra.impartidoEmpresa === true),
        CHECK_COMPARTIDO: generarCheckboxInteractivoXML(ra.impartidoEmpresa !== true)
      }));

      const templatePath = isProd
        ? path.join(__dirname, '..', 'templates', 'docs', 'plan_formacion.docx')
        : path.join(process.cwd(), 'templates', 'docs', 'plan_formacion.docx');
      if (!fs.existsSync(templatePath)) throw new Error("Plantilla no encontrada");

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => ""
      });

      // Renderizamos con los nombres exactos de plan_formacion.docx
      doc.render({
        REGIMEN: detalle?.regimen,
        FECHA_CURSO: curso?.descripcion,
        CICLO: detalle?.ciclo,
        CICLO_CODIGO: detalle?.codigo,
        NIVEL: detalle?.nivel,
        ALUMNADO_APELLIDOS_NOMBRE: `${alumno.apellidos}, ${alumno.nombre}`,
        ALUMNADO_EMAIL: alumno.emailEduca || alumno.emailPersonal,
        ALUMNADO_TELEFONO: alumno.tlfn,
        CENTRO: centro?.nombre,
        CENTRO_EMAIL: centro?.email,
        CENTRO_TELEFONO: centro?.telefono,
        TUTOR_NOMBRE_COMPLETO: `${profesor?.nombre} ${profesor?.apellidos}`,
        TUTOR_EMAIL: profesor?.email,
        TUTOR_TELEFONO: profesor?.telefono,
        EMPRESA: empresa?.nombre,
        EMPRESA_CIF: empresa?.cif,
        EMPRESA_EMAIL: empresa?.email,
        EMPRESA_TELEFONO: empresa?.tlfn,
        EMPRESA_TUTOR_NOMBRE_COMPLETO: `${tutorEmpresa?.nombre} ${tutorEmpresa?.apellidos}`,
        EMPRESA_TUTOR_EMAIL: tutorEmpresa?.email,
        EMPRESA_TUTOR_TELEFONO: tutorEmpresa?.tlfn,
        FECHA_INI: alumno.fechaInicio,
        FECHA_FIN: alumno.fechaFin,
        HORARIO: formatearHorarioCompacto(relacion.horario),
        TOTAL_HORAS: alumno.totalHorasFFE || 0,
        modulos: RAsData //
      });

      const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });

      // Verificación de tamaño antes de enviar
      if (buf.length < 2000) {
        console.error("Advertencia: El buffer generado es demasiado pequeño:", buf.length);
      }

      const modoPF = getCreacionFicherosModo();
      const filenamePF = `Plan_Formativo_${alumno.apellidos.replace(/\s+/g, '_')}.docx`;

      if (modoPF === 'crear' && req.query.raw !== '1') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenamePF, buf, ...subdirs);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filenamePF}"`);
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      return res.status(200).send(buf);

    } catch (error: any) {
      console.error('Error detallado en Docxtemplater:', error);
      if (error.properties && error.properties.errors) {
        // Esto te dirá qué etiqueta exacta está rompiendo el documento
        error.properties.errors.forEach((err: any) => console.log(err.message));
      }
      res.status(500).json({ error: 'Error al generar el documento' });
    }
  });

  app.get('/api/relaciones-alumnos/:id/plan-formativo/pdf', async (req, res) => {
    let browser;
    try {
      // 1. OBTENCIÓN DE DATOS (Misma lógica que tienes, omitida por brevedad)
      const relacionAlumno = RelacionAlumnoDAO.getById(Number(req.params.id));
      const alumnoId = req.query.alumnoId;
      if (!relacionAlumno) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacionAlumno.convenioId);
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const centro = CentroDAO.getById(convenio.centroId!);
      const tutorEmpresa = TutorEmpresaDAO.getById(relacionAlumno.tutorEmpresaId);
      const curso = CursoDAO.getById(convenio.cursoId);
      const profesor = ProfesorDAO.get();
      const alumno = AlumnoDAO.getById(Number(alumnoId));
      if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

      const alumnosAsignados: Alumno[] = relacionAlumno.alumnos || [];

      // Buscamos el detalle académico (asumiendo que todos los alumnos de la relación comparten ciclo)
      // 1. Tipamos la variable permitiendo que sea 'undefined'
      let detalleAcademicoGlobal: DetalleAcademico | undefined = undefined;

      // 3. Si encontramos a ese alumno, buscamos su detalle en la base de datos
      if (alumno && alumno.detalleAcademicoId) {
        detalleAcademicoGlobal = DetalleAcademicoDAO.getById(alumno.detalleAcademicoId);
      }

      // NUEVO: Mapeamos los alumnos directamente desde el array de la BD
      // 2. PROCESAMIENTO DE PLANTILLA HTML CON VERIFICACIÓN
      const isProd = process.env.NODE_ENV === 'production';
      // Intentamos localizar la carpeta templates de forma absoluta
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates', 'docs') : path.resolve(process.cwd(), 'templates', 'docs');
      const templatePath = path.join(templatesDir, 'plan_formacion.html');

      console.log(`Intentando leer plantilla en: ${templatePath}`);

      if (!fs.existsSync(templatePath)) {
        console.error("ERROR: No existe el archivo de plantilla HTML.");
        return res.status(500).json({ error: `Plantilla no encontrada en ${templatePath}` });
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(source);

      const htmlFinal = template({
        REGIMEN: detalleAcademicoGlobal?.regimen || '',
        FECHA_CURSO: curso?.descripcion || '',
        CICLO: detalleAcademicoGlobal?.ciclo || '',
        CICLO_CODIGO: detalleAcademicoGlobal?.codigo || '',
        NIVEL: detalleAcademicoGlobal?.nivel || '',
        ALUMNADO_APELLIDOS_NOMBRE: `${alumno.apellidos}, ${alumno.nombre}`,
        ALUMNADO_EMAIL: alumno.emailEduca || alumno.emailPersonal,
        ALUMNADO_TELEFONO: alumno.tlfn,
        CENTRO: centro?.nombre || '',
        CENTRO_EMAIL: centro?.email || '',
        CENTRO_TELEFONO: centro?.telefono || '',
        TUTOR_NOMBRE_COMPLETO: `${profesor?.nombre} ${profesor?.apellidos}`,
        TUTOR_EMAIL: profesor?.email,
        TUTOR_TELEFONO: profesor?.telefono,
        EMPRESA: empresa?.nombre || '',
        EMPRESA_CIF: empresa?.cif || '',
        EMPRESA_EMAIL: empresa?.email || '',
        EMPRESA_TELEFONO: empresa?.tlfn || '',
        EMPRESA_TUTOR_NOMBRE_COMPLETO: `${tutorEmpresa?.nombre} ${tutorEmpresa?.apellidos}`,
        EMPRESA_TUTOR_EMAIL: tutorEmpresa?.email,
        EMPRESA_TUTOR_TELEFONO: tutorEmpresa?.tlfn,
        FECHA_INI: formatDate(alumno.fechaInicio),
        FECHA_FIN: formatDate(alumno.fechaFin),
        HORARIO: formatearHorarioCompacto(relacionAlumno.horario),
        TOTAL_HORAS: alumno.totalHorasFFE || 0,
        modulos: (detalleAcademicoGlobal?.resultadosAprendizaje || []).map((ra: any) => ({
          MODULO: ra.modulo,
          MODULO_CODIGO: ra.codigo,
          RA_NUMERO: ra.ra,
          CHECK_INTEGRO: ra.impartidoEmpresa === true ? '☒' : '☐',
          CHECK_COMPARTIDO: ra.impartidoEmpresa === true ? '☐' : '☒'
        }))
      });

      // 3. GENERACIÓN DE PDF CON PUPPETEER
      browser = await puppeteer.launch({
        headless: true, // Cambiado a true (formato moderno)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--font-render-hinting=none' // Mejora legibilidad en PDF
        ]
      });

      const page = await browser.newPage();

      // ESTO ES CRÍTICO: 
      // Si el HTML tiene imágenes locales, Puppeteer necesita conocer el "basePath"
      await page.setContent(htmlFinal, {
        waitUntil: 'load', // Espera a que carguen imágenes/estilos
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      await browser.close();

      // 4. ENVÍO SEGURO DEL BUFFER
      const modoPFPDF = getCreacionFicherosModo();
      const filenamePFPDF = `Plan_Formativo_${alumno.apellidos.replace(/\s+/g, '_')}.pdf`;

      if (modoPFPDF === 'crear' && req.query.raw !== '1') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenamePFPDF, Buffer.from(pdfBuffer), ...subdirs);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      // Limpiamos cualquier cabecera previa que pudiera estar interfiriendo
      res.removeHeader('Transfer-Encoding');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=${filenamePFPDF}`);

      return res.end(pdfBuffer); // Usamos .end() para enviar el buffer binario puro

    } catch (error: any) {
      console.error('💥 ERROR CRÍTICO GENERANDO EL PDF:', error.message || error, error.stack || '');

      if (error.properties && error.properties.errors) {
        console.error('El motor de plantillas ha encontrado estos errores en tu archivo PDF:');
        error.properties.errors.forEach((err: any) => {
          console.error(`- Etiqueta problemática: {${err.properties.id}} | Motivo: ${err.message}`);
        });
      }

      res.status(500).json({ error: 'No se pudo generar el plan formativo' });
    }
  });

  /**
   * Los dias que un alumno de un convenio no va a la empresa: los festivos del
   * centro y de la ciudad de la empresa (segun la configuracion) con su desvio
   * aplicado.
   *
   * Los interruptores se aplican en `festivosHeredados` y no aqui, para que
   * el servidor y la interfaz compongan el conjunto heredado igual. Luego se
   * aplica el desvío del alumno: un dia que el alumno marcara como ANADIR
   * aparece como no lectivo aunque no sea festivo oficial, y uno que
   * marcara como QUITAR deja de aparecer aunque lo fuera.
   */
  const festivosNoLectivosAlumno = (convenio: { centroId?: number; empresaId?: number }, alumnoId: number): string[] => {
    const profesor = ProfesorDAO.get();
    let usarFestivos = true;
    let usarFestivosEmpresa = false;
    if (profesor?.id) {
      const cfg = ConfiguracionDAO.getConfig(profesor.id, 'festivos');
      usarFestivos = cfg.usar_festivos !== '0';
      usarFestivosEmpresa = cfg.usar_festivos_empresa === '1';
    }
    const centro = convenio.centroId ? CentroDAO.getById(convenio.centroId) : undefined;
    let festivosEmpresa: string[] = [];
    const empresa = convenio.empresaId ? EmpresaDAO.getById(convenio.empresaId) : undefined;
    if (profesor?.id && empresa?.ciudad) {
      festivosEmpresa = EmpresaFestivosDAO.getByCiudad(profesor.id, empresa.ciudad);
    }
    const heredados = festivosHeredados({
      centro: centro?.festivos || [],
      usarCentro: usarFestivos,
      empresa: festivosEmpresa,
      usarEmpresa: usarFestivosEmpresa,
    });
    return aplicarPersonalizados(heredados, AlumnoFestivosDAO.getByAlumno(alumnoId));
  };

  // Los dias no lectivos de un alumno de la relacion, para el calendario de
  // solo lectura del listado. Es la misma lista que pinta el documento de
  // calendario.
  app.get('/api/relaciones-alumnos/:id/dias-no-lectivos', (req, res) => {
    const relacion = RelacionAlumnoDAO.getById(Number(req.params.id));
    if (!relacion) return res.status(404).json({ error: 'Relación no encontrada' });
    const alumnoId = Number(req.query.alumnoId);
    if (!relacion.alumnos?.some(a => a.id === alumnoId)) {
      return res.status(404).json({ error: 'Alumno no vinculado a esta relación' });
    }
    const convenio = ConvenioDAO.getById(relacion.convenioId);
    if (!convenio) return res.status(404).json({ error: 'Convenio no encontrado' });
    res.json({ festivos: festivosNoLectivosAlumno(convenio, alumnoId) });
  });

  app.get('/api/relaciones-alumnos/:id/calendario', async (req, res) => {
    let browser;
    try {
      const relacionId = Number(req.params.id);
      const alumnoId = Number(req.query.alumnoId);
      const alumno = AlumnoDAO.getById(alumnoId);

      const relacion = RelacionAlumnoDAO.getById(relacionId);
      if (!relacion) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacion.convenioId);
      const curso = CursoDAO.getById(convenio.cursoId);
      if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

      // Buscar datos específicos del alumno dentro de la relación
      if (!alumno.fechaInicio || !alumno.fechaFin) return res.status(404).json({ error: 'Alumno no vinculado a esta relación' });

      // Obtener festivos del centro educativo y tutorías del detalle académico
      const centro = CentroDAO.getById(convenio.centroId);
      const detalle = DetalleAcademicoDAO.getById(alumno.detalleAcademicoId);
      const tutorias = detalle?.tutorias || [];

      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const festivos = festivosNoLectivosAlumno(convenio, alumnoId);

      // --- LÓGICA DE GENERACIÓN DE MESES PARA EL CALENDARIO ---
      const mesesData = [];
      const nombresMeses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

      // SOLUCIÓN: Extraemos el año y mes directamente del string para evitar desfases UTC
      const [anioInicio, mesInicio] = alumno.fechaInicio.split('-');
      const [anioFin, mesFin] = alumno.fechaFin.split('-');

      // Ajuste crítico: El calendario empieza en el mes de inicio de prácticas (hora local)
      const start = new Date(Number(anioInicio), Number(mesInicio) - 1, 1);
      // Y termina en el mes de fin de prácticas
      const end = new Date(Number(anioFin), Number(mesFin) - 1, 1);

      while (start <= end) {
        const mesIndex = start.getMonth();
        const año = start.getFullYear();
        const diasEnMes = new Date(año, mesIndex + 1, 0).getDate();

        const diasArray = [];
        for (let d = 1; d <= 31; d++) {
          if (d > diasEnMes) {
            diasArray.push({ DIA: '', CLASE: 'empty-cell' });
            continue;
          }

          const fechaActual = new Date(año, mesIndex, d);

          // SOLUCIÓN: Construimos el isoFecha manualmente en formato YYYY-MM-DD 
          // basándonos en la hora local, evitando .toISOString()
          const mesFormateado = String(mesIndex + 1).padStart(2, '0');
          const diaFormateado = String(d).padStart(2, '0');
          const isoFecha = `${año}-${mesFormateado}-${diaFormateado}`;

          let clase = 'empty-cell';
          const dayOfWeek = fechaActual.getDay();

          // SOLUCIÓN: Comparamos directamente los strings YYYY-MM-DD. 
          // Esto es totalmente seguro y evita fallos de milisegundos u horas.
          const isPeriodFFE = isoFecha >= alumno.fechaInicio && isoFecha <= alumno.fechaFin;

          // Lógica de visualización en la plantilla HTML
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            clase = 'fin-semana-cell';
          }
          else if (isPeriodFFE && festivos.includes(isoFecha)) {
            clase = 'festivo-cell';
          }
          else if (isPeriodFFE && tutorias.includes(isoFecha)) {
            clase = 'tutoria-cell';
          }
          else if (isoFecha === alumno.fechaInicio || isoFecha === alumno.fechaFin) {
            clase = 'inicio-fin-cell';
          }
          else if (isPeriodFFE) {
            clase = 'laboral-cell';
          }

          diasArray.push({ DIA: d, CLASE: clase });
        }

        mesesData.push({
          MES: `${nombresMeses[mesIndex]} ${año}`,
          dias: diasArray
        });

        start.setMonth(start.getMonth() + 1);
      }

      // --- RENDERIZADO ---
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates', 'docs') : path.resolve(process.cwd(), 'templates', 'docs');
      const templatePath = path.join(templatesDir, 'calendar.html');

      if (!fs.existsSync(templatePath)) {
        console.error("ERROR: No existe el archivo de plantilla HTML.");
        return res.status(500).json({ error: `Plantilla no encontrada en ${templatePath}` });
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(source);
      const htmlFinal = template({
        CURSO: curso.descripcion,
        meses: mesesData
      });

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlFinal, { waitUntil: 'load' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true, // El calendario suele verse mejor en horizontal
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      await browser.close();

      const modoCal = getCreacionFicherosModo();
      const filenameCal = `Calendario_${alumno.apellidos.replace(/\s+/g, '_')}.pdf`;

      if (modoCal === 'crear' && req.query.raw !== '1') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenameCal, Buffer.from(pdfBuffer), ...subdirs);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      res.removeHeader('Transfer-Encoding');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=${filenameCal}`);

      return res.end(pdfBuffer); // Usamos .end() para enviar el buffer binario puro

    } catch (error: any) {
      if (browser) await browser.close();
      console.error('Error generando calendario:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/relaciones-alumnos/:id/carta/pdf', async (req, res) => {
    let browser;
    try {
      // 1. OBTENCIÓN DE DATOS (Misma lógica que tienes, omitida por brevedad)
      const relacionAlumno = RelacionAlumnoDAO.getById(Number(req.params.id));
      if (!relacionAlumno) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacionAlumno.convenioId);
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const centro = CentroDAO.getById(convenio.centroId!);
      const curso = CursoDAO.getById(convenio.cursoId);
      const profesor = ProfesorDAO.get();

      // NUEVO: Mapeamos los alumnos directamente desde el array de la BD
      // 2. PROCESAMIENTO DE PLANTILLA HTML CON VERIFICACIÓN
      const isProd = process.env.NODE_ENV === 'production';
      // Intentamos localizar la carpeta templates de forma absoluta
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates', 'docs') : path.resolve(process.cwd(), 'templates', 'docs');
      const templatePath = path.join(templatesDir, 'carta_inicio.html');

      console.log(`Intentando leer plantilla en: ${templatePath}`);

      if (!fs.existsSync(templatePath)) {
        console.error("ERROR: No existe el archivo de plantilla HTML.");
        return res.status(500).json({ error: `Plantilla no encontrada en ${templatePath}` });
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(source);

      const htmlFinal = template({
        CENTRO_CIUDAD: centro?.ciudad || '',
        FECHA_ACTUAL: formatDate(fechaLocalISO()),
        TUTOR_NOMBRE_COMPLETO: `${profesor?.nombre} ${profesor?.apellidos}`,
        TUTOR_EMAIL: profesor?.email,
        CURSO_ACADEMICO: curso?.descripcion || ''
      });

      // 3. GENERACIÓN DE PDF CON PUPPETEER
      browser = await puppeteer.launch({
        headless: true, // Cambiado a true (formato moderno)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--font-render-hinting=none' // Mejora legibilidad en PDF
        ]
      });

      const page = await browser.newPage();

      // ESTO ES CRÍTICO: 
      // Si el HTML tiene imágenes locales, Puppeteer necesita conocer el "basePath"
      await page.setContent(htmlFinal, {
        waitUntil: 'load', // Espera a que carguen imágenes/estilos
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      await browser.close();

      // 4. ENVÍO SEGURO DEL BUFFER
      const modoCarta = getCreacionFicherosModo();
      const filenameCarta = `Carta_Informativa_${sanitizeDirName(empresa?.nombre || '').replace(/\s+/g, '_')}.pdf`;

      if (modoCarta === 'crear' && req.query.raw !== '1') {
        const result = saveToDocs(filenameCarta, Buffer.from(pdfBuffer), empresa?.nombre);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      // Limpiamos cualquier cabecera previa que pudiera estar interfiriendo
      res.removeHeader('Transfer-Encoding');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=${filenameCarta}`);

      return res.end(pdfBuffer); // Usamos .end() para enviar el buffer binario puro

    } catch (error: any) {
      console.error('💥 ERROR CRÍTICO GENERANDO EL PDF:');

      if (error.properties && error.properties.errors) {
        console.error('El motor de plantillas ha encontrado estos errores en tu archivo PDF:');
        error.properties.errors.forEach((err: any) => {
          console.error(`- Etiqueta problemática: {${err.properties.id}} | Motivo: ${err.message}`);
        });
      } else {
        console.error(error);
      }

      res.status(500).json({ error: 'No se pudo generar el plan formativo' });
    }
  });

  // --- ENDPOINT GENERACIÓN DE SEGUIMIENTO ---
  app.get('/api/relaciones-alumnos/:id/seguimiento', async (req, res) => {
    try {
      const relacionId = Number(req.params.id);
      const alumnoId = Number(req.query.alumnoId);

      // 1. Usar el DAO para obtener los datos
      const relacion = RelacionAlumnoDAO.getById(relacionId); //
      const alumno = AlumnoDAO.getById(alumnoId); //

      if (!relacion || !alumno) return res.status(404).json({ error: 'Datos no encontrados' });

      const convenio = ConvenioDAO.getById(relacion.convenioId); //
      const empresa = EmpresaDAO.getById(convenio.empresaId); //
      const tutorEmpresa = TutorEmpresaDAO.getById(relacion.tutorEmpresaId); //
      const curso = CursoDAO.getById(convenio.cursoId); //
      const profesor = ProfesorDAO.get(); //
      const detalle = alumno.detalleAcademicoId ? DetalleAcademicoDAO.getById(alumno.detalleAcademicoId) : undefined; //
      const fechaSeguimiento =
        alumno.fechaInicio && alumno.fechaFin
          ? `${formatDate(alumno.fechaInicio)} - ${formatDate(alumno.fechaFin)}`
          : '';

      // Mapeo de Resultados de Aprendizaje
      const RAs = (detalle?.resultadosAprendizaje || []).map((ra: any) => ({
        actividad: ra.actividadFormativa,
        moduloCodigo: ra.codigo,
        numero: ra.ra
      }));

      // 2. Cargar plantilla
      const templatePath = isProd
        ? path.join(__dirname, '..', 'templates', 'docs', 'ficha_de_seguimiento_periodico.docx')
        : path.join(process.cwd(), 'templates', 'docs', 'ficha_de_seguimiento_periodico.docx');
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      // 3. Mapeo de variables
      const data: any = {
        CURSO: curso?.descripcion || "",
        NUMERO_CONVENIO: convenio?.numConvenio || "",
        NUMERO_RELACION_ALUMNO: relacion?.numRelacion || "",
        ALUMNADO_APELLIDOS: alumno?.apellidos || "",
        ALUMNADO_NOMBRE: alumno?.nombre || "",
        ALUMNADO_EMAIL: alumno?.emailEduca || "",
        EMPRESA: empresa?.nombre || "",
        EMPRESA_TUTOR_APELLIDOS: tutorEmpresa?.apellidos || "",
        EMPRESA_TUTOR_NOMBRE: tutorEmpresa?.nombre || "",
        EMPRESA_TUTOR_EMAIL: tutorEmpresa?.email || "",
        FECHA_SEGUIMIENTO: fechaSeguimiento || "",
        TUTOR_NOMBRE: `${profesor?.nombre} ${profesor?.apellidos}` || ""
      };

      // 4. Mapeo RAs
      for (let i = 1; i <= 40; i++) {
        if (RAs && RAs[i - 1]) {
          // Si hay RA, rellenamos todas las columnas con sus datos
          const ra = RAs[i - 1];
          data[`ACT${i}`] = ra.actividad || "";
          data[`COD${i}`] = ra.moduloCodigo || "";
          data[`NUM${i}`] = ra.numero || "";
        } else {
          // Si la fila sobra, inyectamos la marca de borrado en la primera columna
          // y dejamos las demás en blanco por limpieza.
          data[`ACT${i}`] = "@@ELIMINAR@@";
          data[`COD${i}`] = "";
          data[`NUM${i}`] = "";
        }
      }

      doc.render(data);
      let buf = doc.getZip().generate({ type: 'nodebuffer' });

      // 5. Limpieza XML
      buf = limpiarFilasActiveX(buf);

      const modeSeg = getCreacionFicherosModo();
      const filenameSeg = `Seguimiento_${alumno.nombre.replace(/\s+/g, '_')}_${alumno.apellidos.replace(/\s+/g, '_')}.docx`;

      if (modeSeg === 'crear' && req.query.raw !== '1') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenameSeg, buf, ...subdirs);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      // IMPORTANTE: Finalizar correctamente la respuesta
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=${filenameSeg}`,
        'Content-Length': buf.length
      });
      res.end(buf);
    } catch (error) {
      console.error('Error generando Ficha de Seguimiento:', error);
      res.status(500).json({ error: 'Error interno generando el documento' });
    }
  });

  // --- ENDPOINT GENERACIÓN DE VALORACIÓN ---
  app.get('/api/relaciones-alumnos/:id/valoracion', async (req, res) => {
    try {
      const relacionId = Number(req.params.id);
      const alumnoId = Number(req.query.alumnoId);

      // 1. Usar el DAO para obtener los datos
      const relacion = RelacionAlumnoDAO.getById(relacionId); //
      const alumno = AlumnoDAO.getById(alumnoId); //

      if (!relacion || !alumno) return res.status(404).json({ error: 'Datos no encontrados' });

      const convenio = ConvenioDAO.getById(relacion.convenioId); //
      const empresa = EmpresaDAO.getById(convenio.empresaId); //
      const tutorEmpresa = TutorEmpresaDAO.getById(relacion.tutorEmpresaId); //
      const curso = CursoDAO.getById(convenio.cursoId); //
      const detalle = alumno.detalleAcademicoId ? DetalleAcademicoDAO.getById(alumno.detalleAcademicoId) : undefined; //

      // Mapeo de Resultados de Aprendizaje
      const RAs = (detalle?.resultadosAprendizaje || []).map((ra: any) => ({
        actividad: ra.actividadFormativa,
        moduloCodigo: ra.codigo,
        numero: ra.ra
      }));

      // 2. Cargar plantilla
      const templatePath = isProd
        ? path.join(__dirname, '..', 'templates', 'docs', 'valoracion_final.docx')
        : path.join(process.cwd(), 'templates', 'docs', 'valoracion_final.docx');
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      // 3. Mapeo de variables
      const data: any = {
        CURSO: curso?.descripcion || "",
        NUMERO_CONVENIO: convenio?.numConvenio || "",
        NUMERO_RELACION_ALUMNO: relacion?.numRelacion || "",
        ALUMNADO_APELLIDOS: alumno?.apellidos || "",
        ALUMNADO_NOMBRE: alumno?.nombre || "",
        ALUMNADO_EMAIL: alumno?.emailEduca || "",
        EMPRESA: empresa?.nombre || "",
        EMPRESA_TUTOR_APELLIDOS: tutorEmpresa?.apellidos || "",
        EMPRESA_TUTOR_NOMBRE: tutorEmpresa?.nombre || "",
        EMPRESA_TUTOR_EMAIL: tutorEmpresa?.email || "",
        CICLO: detalle?.ciclo || "",
        GRADO: detalle?.grado || "",
        CICLO_CODIGO: detalle?.codigo || ""
      };

      // 4. Mapeo RAs
      for (let i = 1; i <= 40; i++) {
        if (RAs && RAs[i - 1]) {
          // Si hay RA, rellenamos todas las columnas con sus datos
          const ra = RAs[i - 1];
          data[`COD${i}`] = ra.moduloCodigo || "";
          data[`NUM${i}`] = ra.numero || "";
        } else {
          // Si la fila sobra, inyectamos la marca de borrado en la primera columna
          // y dejamos las demás en blanco por limpieza.
          data[`COD${i}`] = "@@ELIMINAR@@";
          data[`NUM${i}`] = "";
        }
      }

      doc.render(data);
      let buf = doc.getZip().generate({ type: 'nodebuffer' });

      // 5. Limpieza XML
      buf = limpiarFilasActiveX(buf);

      const modoVal = getCreacionFicherosModo();
      const filenameVal = `Valoracion_final_${alumno.nombre.replace(/\s+/g, '_')}_${alumno.apellidos.replace(/\s+/g, '_')}.docx`;

      if (modoVal === 'crear' && req.query.raw !== '1') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenameVal, buf, ...subdirs);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      // IMPORTANTE: Finalizar correctamente la respuesta
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=${filenameVal}`,
        'Content-Length': buf.length
      });
      res.end(buf);
    } catch (error) {
      console.error('Error generando Ficha de Valoración:', error);
      res.status(500).json({ error: 'Error interno generando el documento' });
    }
  });



  // ENDPOINT PARA GUARDAR XLSX (templates generados en cliente)
  app.post('/api/save-xlsx', (req, res) => {
    try {
      const { filename, base64Data } = req.body;
      if (!filename || !base64Data) return res.status(400).json({ error: 'filename y base64Data son requeridos' });
      const buffer = Buffer.from(base64Data, 'base64');
      const result = saveToDocs(filename, buffer);
      res.json({ success: true, filename: result.relativePath, path: result.filePath });
    } catch (error: any) {
      console.error('Error guardando XLSX:', error);
      res.status(500).json({ error: error.message || 'Error al guardar el archivo' });
    }
  });

  // Panel
  app.get('/api/panel/resumen', (req, res) => {
    const profesor = ProfesorDAO.get();
    res.json(PanelDAO.resumen(
      profesor?.id,
      req.query.cursoId ? Number(req.query.cursoId) : undefined,
      req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined
    ));
  });

  app.get('/api/panel/seguridad-social', (req, res) => {
    const cursoId = Number(req.query.cursoId);
    if (!cursoId) return res.json({ meses: [], alumnos: [], datos: {} });
    res.json(PanelDAO.seguridadSocial(
      cursoId,
      req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined
    ));
  });

  // FFE - Valoraciones finales
  app.get('/api/ffe/valoraciones-finales', (_req, res) => res.json(FFEValoracionFinalDAO.getAll()));
  app.post('/api/ffe/valoraciones-finales', (req, res) => res.json(FFEValoracionFinalDAO.create(req.body)));
  app.put('/api/ffe/valoraciones-finales/:id', (req, res) => { FFEValoracionFinalDAO.update(Number(req.params.id), req.body); res.json({ ok: true }); });
  app.delete('/api/ffe/valoraciones-finales/:id', (req, res) => { FFEValoracionFinalDAO.delete(Number(req.params.id)); res.json({ ok: true }); });

  // FFE - Motivos no realización
  app.get('/api/ffe/motivos-no-realizacion', (_req, res) => res.json(FFEMotivoNoRealizacionDAO.getAll()));
  app.post('/api/ffe/motivos-no-realizacion', (req, res) => res.json(FFEMotivoNoRealizacionDAO.create(req.body)));
  app.put('/api/ffe/motivos-no-realizacion/:id', (req, res) => { FFEMotivoNoRealizacionDAO.update(Number(req.params.id), req.body); res.json({ ok: true }); });
  app.delete('/api/ffe/motivos-no-realizacion/:id', (req, res) => { FFEMotivoNoRealizacionDAO.delete(Number(req.params.id)); res.json({ ok: true }); });

  // FFE - Evaluaciones por alumno
  app.get('/api/ffe/evaluaciones/:alumnoId', (req, res) => {
    const ev = FFEEvaluacionDAO.getByAlumno(Number(req.params.alumnoId));
    res.json(ev ?? null);
  });
  app.put('/api/ffe/evaluaciones/:alumnoId', (req, res) => {
    FFEEvaluacionDAO.upsert(
      Number(req.params.alumnoId),
      req.body.relacionId ?? null,
      req.body.fechaEvaluacion ?? null,
      req.body.valoracionFinalId ?? null,
      req.body.motivoNoRealizacionId ?? null
    );
    res.json({ ok: true });
  });

  // FFE - RA resultados por alumno + relación
  app.get('/api/ffe/ra-resultados/:alumnoId/:relacionId', (req, res) => {
    res.json(FFEResultadoRADAO.getByAlumnoAndRelacion(Number(req.params.alumnoId), Number(req.params.relacionId)));
  });
  app.put('/api/ffe/ra-resultados/:alumnoId/:relacionId', (req, res) => {
    FFEResultadoRADAO.batchSave(Number(req.params.alumnoId), Number(req.params.relacionId), req.body.entries || []);
    res.json({ ok: true });
  });

  // FFE - Informe de valoración
  app.get('/api/ffe/informe', (req, res) => {
    const cursoId = Number(req.query.cursoId);
    if (!cursoId) return res.status(400).json({ error: 'cursoId es requerido' });
    res.json(FFEInformeDAO.getInforme(cursoId, (req.query.fechaEvaluacion as string) || '', req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined));
  });

  app.get('/api/festivos/obtener', async (req, res) => {
    const slug = req.query.slug as string;
    if (!slug) return res.status(400).json({ error: 'slug es requerido' });

    const cursos = CursoDAO.getAll();
    const curso = cursos[0];
    let year = Number(req.query.year);
    if (!year || Number.isNaN(year)) {
      // El año se saca de la cadena, no de `new Date(...).getFullYear()`: una
      // fecha solo-fecha es medianoche UTC y en un huso por detras de UTC el
      // 31 de diciembre devolvería el año anterior.
      year = curso ? Number(curso.fechaFin.slice(0, 4)) : new Date().getFullYear();
    }

    // Un curso abarca casi siempre dos años naturales (2025-2026), asi que se
    // admite un rango. `yearFin` ausente equivale a `year`: un solo año, como
    // antes. El tope evita que un rango disparado convierta esto en un bucle de
    // peticiones a la API externa.
    const LIMITE_ANIOS = 3;
    let yearFin = Number(req.query.yearFin);
    if (!yearFin || Number.isNaN(yearFin)) {
      yearFin = year;
    }
    if (yearFin < year) {
      const swapped = year;
      year = yearFin;
      yearFin = swapped;
    }
    if (yearFin - year + 1 > LIMITE_ANIOS) {
      yearFin = year + LIMITE_ANIOS - 1;
    }

    try {
      const fechas = new Set<string>();
      let fallo = false;
      for (let y = year; y <= yearFin; y++) {
        const response = await fetch(`https://calendariosnacionales.com/es/v1/${y}/localidades/mad/madrid/${slug}.json`);
        if (!response.ok) {
          fallo = true;
          break;
        }
        const data = await response.json();
        for (const h of data.holidays?.calendar || []) {
          if (h?.date) fechas.add(h.date);
        }
      }
      if (fallo) return res.status(502).json({ error: 'Error al consultar la API externa' });

      // El orden lo fija el cliente al mezclarlos con lo que ya tuviera, pero se
      // deja ordenado aqui para que la respuesta sea estable.
      res.json({ fechas: [...fechas].sort() });
    } catch {
      res.status(502).json({ error: 'No se pudo conectar con la API de festivos' });
    }
  });

  // Vite setup y Rutas Estáticas (UNIFICADO)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Producción: Usar rutas absolutas dentro del ASAR
    const distPath = path.join(__dirname, '..', 'dist');
    const indexPath = path.join(distPath, 'index.html');

    console.log('--- MODO PRODUCCIÓN ---');
    console.log('Ruta Dist:', distPath);

    // 1. Servir archivos estáticos (js, css, imágenes)
    app.use(express.static(distPath));

    // 2. Servir el index.html para cualquier otra ruta (SPA)
    app.get('*', (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`
            <h2>Error Crítico: Frontend no encontrado</h2>
            <p>El servidor esperaba encontrar el archivo en: <b>${indexPath}</b></p>
        `);
      }
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // Arranque del servidor.
  //
  // Antes, si el puerto estaba ocupado (EADDRINUSE) se reintentaba el MISMO
  // puerto 20 veces y, agotados, process.exit(1). Eso solo funcionaba si lo
  // ocupaba una copia anterior de esta misma app que se cerrara por sí sola;
  // si lo ocupaba cualquier otro programa (el caso habitual: el 3000 es de
  // los puertos más usados de la máquina), los 20 reintentos fallaban
  // siempre y la app se quedaba con la ventana en blanco.
  //
  // Ahora se sube por la lista de puertos candidatos hasta encontrar uno
  // libre. Si todos están ocupados, se pide uno efímero al sistema (puerto 0)
  // para que la app arranque igualmente.
  // La ventana tiene que abrirse en http://localhost, no en http://127.0.0.1:
  // Chromium rechaza WebAuthn en orígenes con IP (lanza SecurityError con
  // "This is an invalid domain"), que es lo que bloqueaba el desbloqueo
  // biométrico en la app empaquetada. Pero en Windows localhost resuelve
  // primero a ::1 y luego a 127.0.0.1, así que al servir solo en IPv4 el
  // navegador tiene que reintentar por su cuenta en cada petición.
  //
  // Se escucha también en el bucle local IPv6 para que ese reintento no
  // exista. Sigue siendo solo local: ::1 no es accesible desde la red, igual
  // que 127.0.0.1. Si la máquina no tiene IPv6, se sigue sirviendo en IPv4
  // sin más.
  function bindIpv6Loopback(port: number): void {
    const extra = app.listen(port, '::1');
    extra.once('listening', () => {
      console.log(`Server running on http://[::1]:${port}`);
    });
    extra.once('error', (err: any) => {
      // Sin IPv6 no es motivo para tumbar la app: el listener IPv4 sigue
      // vivo y el navegador cae a 127.0.0.1 por su cuenta.
      console.warn('No se ha podido escuchar en [::1]: ' + err?.message);
    });
  }

  function listenOnFirstFreePort(candidates: number[], host: string, delayMs = 400): void {
    const [primero, ...resto] = candidates;

    const intentar = (port: number, pendientes: number[]): void => {
      const server = app.listen(port, host);
      server.once('listening', () => {
        const asintado = server.address() as { port: number } | null;
        puertoReal = asintado?.port ?? port;
        console.log(`Server running on http://${host}:${puertoReal}`);
        bindIpv6Loopback(puertoReal);
        // main.js abre la ventana contra este puerto, no contra el que él
        // suponía: si hemos tenido que moverlo, solo el servidor sabe cuál
        // es el bueno.
        if (process.send) {
          process.send({ type: 'ffe-server-ready', port: puertoReal });
        }
      });
      server.once('error', (err: any) => {
        if (err?.code !== 'EADDRINUSE') {
          console.error('Error al iniciar el servidor: ' + err?.message);
          process.exit(1);
          return;
        }
        if (pendientes.length > 0) {
          console.log(`Puerto ${port} ocupado; probando el siguiente...`);
          setTimeout(() => intentar(pendientes[0], pendientes.slice(1)), delayMs);
        } else if (port !== 0) {
          // Último recurso: el sistema nos asigna cualquier puerto libre.
          console.log('Todos los puertos candidatos ocupados; pidiendo uno al sistema.');
          setTimeout(() => intentar(0, []), delayMs);
        } else {
          console.error('No se ha podido encontrar un puerto libre: ' + err?.message);
          process.exit(1);
        }
      });
    };

    intentar(primero, resto);
  }

  // El puerto de por defecto y los siguientes. El 0 queda fuera de la lista
  // porque hace de comodín en la rama de error.
  const candidatos = Array.from({length: 20}, (_, i) => PORT + i);
  listenOnFirstFreePort(candidatos, '127.0.0.1');
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});