import express from 'express';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { db } from './src/lib/db.ts';
import { ProfesorDAO, ConfiguracionDAO, AceptacionUsoDAO, CentroDAO, DetalleAcademicoDAO, CursoDAO, AlumnoDAO, EmpresaDAO, EmpresaFestivosDAO, TutorEmpresaDAO, EmpresaEstadisticaDAO, ConvenioDAO, InteresDAO, RelacionAlumnoDAO, PanelDAO, EmailContactsDAO, HistoricoDAO, AvisosDAO, isDatabaseLocked, isDatabaseEncrypted, unlockDatabase, encryptDatabase, lockDatabase, recalcularFechasAlumnos } from './src/lib/dao.ts';
import { Alumno, ConvenioEstado, DetalleAcademico } from './src/types/index.ts';
import { fileURLToPath } from 'url';
import { EstudianteTemplate } from './src/emails/EstudianteTemplate.tsx';
import { EmpresaTemplate } from './src/emails/EmpresasTemplate.tsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const baseDir = process.env.PORTABLE_EXECUTABLE_DIR || process.cwd();

  // 1. Validar permisos de escritura inmediatamente
  try {
    const testFile = path.join(baseDir, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
  } catch (e) {
    if (process.send) process.send('ERROR_PERMISOS');
  }

  app.use(express.json());

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
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
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
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir), // Usa la nueva ruta
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  const upload = multer({
    storage,
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

    if (unlockDatabase(password)) {
      res.status(200).json({ success: true });
    } else {
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
      await transporter.sendMail({
        from: `"Test Configuración" <${fromEmail}>`,
        to,
        subject: 'Prueba de configuración de correo - Gestor FFE',
        html: '<p>Este es un correo de prueba para verificar la configuración SMTP del Gestor FFE.</p><p>Si recibes este mensaje, la configuración es correcta.</p>',
      });
      res.json({ success: true });
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
    const { to, cc, subject, html, attachments, sendIndividual, delayMs } = req.body;

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

      if (sendIndividual && to?.length > 1) {
        for (let i = 0; i < to.length; i++) {
          await transporter.sendMail({
            from: fromStr,
            to: to[i],
            cc: cc || [],
            subject,
            html,
            attachments: mailAttachments,
          });
          if (i < to.length - 1) {
            await new Promise(resolve => setTimeout(resolve, sendDelay));
          }
        }
      } else {
        await transporter.sendMail({
          from: fromStr,
          to: (to || []).join(', '),
          cc: (cc || []).join(', '),
          subject,
          html,
          attachments: mailAttachments,
        });
      }

      // Registrar en histórico
      try {
        const adjNames = (attachments || []).map((a: { filename: string }) => a.filename);
        HistoricoDAO.logComunicacion(
          Array.isArray(to) ? to.join(', ') : (to || ''),
          Array.isArray(cc) ? cc.join(', ') : (cc || ''),
          Array.isArray(req.body.bcc) ? req.body.bcc.join(', ') : (req.body.bcc || ''),
          subject || '',
          html || '',
          adjNames
        );
      } catch (e) { /* silencioso */ }

      // Limpiar adjuntos temporales
      for (const a of mailAttachments) {
        try { if (fs.existsSync(a.path)) fs.unlinkSync(a.path); } catch {}
      }

      res.json({ success: true });
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
  app.get('/api/alumnos', (req, res) => res.json(AlumnoDAO.getAll(
    req.query.cursoId ? Number(req.query.cursoId) : undefined,
    req.query.detalleAcademicoId ? Number(req.query.detalleAcademicoId) : undefined
  )));
  app.post('/api/alumnos', (req, res) => res.json({ id: AlumnoDAO.create(req.body) }));
  app.put('/api/alumnos/:id', (req, res) => {
    AlumnoDAO.update(Number(req.params.id), req.body);
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

  // CV Upload
  // RUTA PARA SUBIR CV (Guardando en BD)
  app.post('/api/alumnos/:id/cv', upload.single('cv'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Convertimos el buffer a base64
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype; // Debería ser application/pdf
    const dataURI = `data:${mimeType};base64,${base64Data}`;

    const { AlumnoDAO } = require('./src/lib/dao.ts');
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
    const { AlumnoDAO } = require('./src/lib/dao.ts');
    try {
      AlumnoDAO.updateCV(Number(req.params.id), null);
      res.json({ message: 'CV eliminado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar el CV' });
    }
  });
  app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.resolve('uploads', req.params.filename));
  });

  // Contactos para autocompletado de email
  app.get('/api/email-contacts', (req, res) => res.json(EmailContactsDAO.getAll()));

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

  // Empresas
  app.get('/api/empresas', (req, res) => res.json(EmpresaDAO.getAll()));
  app.post('/api/empresas', (req, res) => res.json({ id: EmpresaDAO.create(req.body) }));
  app.put('/api/empresas/:id', (req, res) => {
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
  app.post('/api/convenios', (req, res) => {
    const { convenio } = req.body;
    if (!convenio.centroId) return res.status(400).json({ error: 'El centro educativo es obligatorio.' });
    const id = ConvenioDAO.create(convenio);
    try { HistoricoDAO.logOperacionConvenio('CREATE', id as number, convenio.numConvenio); } catch {}
    res.json({ id });
  });

  app.put('/api/convenios/:id', (req, res) => {
    const { convenio } = req.body;
    if (!convenio.centroId) return res.status(400).json({ error: 'El centro educativo es obligatorio.' });
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
  app.get('/api/historico/convenios', (req, res) => {
    res.json(HistoricoDAO.getOperacionesConvenio(req.query as any));
  });
  app.get('/api/historico/relaciones', (req, res) => {
    res.json(HistoricoDAO.getOperacionesRelacion(req.query as any));
  });
  app.get('/api/historico/estados', (req, res) => {
    res.json(HistoricoDAO.getCambiosEstado(req.query as any));
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

      const fechaFormateada = convenio.fechaConvenio
        ? new Date(convenio.fechaConvenio).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        : '';

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
          FECHA_NAC: new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          F_INICIO: new Date(alumno.fechaInicio).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          F_FIN: new Date(alumno.fechaFin).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          DIAS: "L-V",
          H_INICIO: relacionAlumno.horario.lunes?.inicio || '',
          H_FIN: relacionAlumno.horario.lunes?.fin || '',
          H_SEM: horasSemanales,
          T_HORAS: alumno.totalHorasFFE || 0
        };
      });

      const isProd = process.env.NODE_ENV === 'production';
      const templatePath = isProd
        ? path.join(__dirname, '..', 'templates', 'plantilla_relacion.docx')
        : path.join(process.cwd(), 'templates', 'plantilla_relacion.docx');

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

      if (modo === 'crear') {
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

      const fechaFormateada = convenio.fechaConvenio
        ? new Date(convenio.fechaConvenio).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        : '';

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
          FECHA_NAC: new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          F_INICIO: new Date(fInicio).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          F_FIN: new Date(fFin).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
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
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates') : path.resolve(process.cwd(), 'templates');
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

      if (modo === 'crear') {
        const result = saveToDocs(filenamePdf, pdfBuffer, empresa?.nombre);
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

  // GENERAR DOCX PLAN FORMATIVO INDIVIDUAL
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
        ? path.join(__dirname, '..', 'templates', 'plan_formacion.docx')
        : path.join(process.cwd(), 'templates', 'plan_formacion.docx');
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

      if (modoPF === 'crear') {
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
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates') : path.resolve(process.cwd(), 'templates');
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

      if (modoPFPDF === 'crear') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenamePFPDF, pdfBuffer, ...subdirs);
        return res.json({ success: true, filename: result.relativePath, path: result.filePath });
      }

      // Limpiamos cualquier cabecera previa que pudiera estar interfiriendo
      res.removeHeader('Transfer-Encoding');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=${filenamePFPDF}`);

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

      // Leer config para saber si se descuentan festivos
      const profesor = ProfesorDAO.get();
      let usarFestivos = true;
      let usarFestivosEmpresa = false;
      if (profesor?.id) {
        const cfg = ConfiguracionDAO.getConfig(profesor.id, 'festivos');
        usarFestivos = cfg.usar_festivos !== '0';
        usarFestivosEmpresa = cfg.usar_festivos_empresa === '1';
      }
      const festivosCentro = usarFestivos ? (centro?.festivos || []) : [];

      // Obtener festivos de empresa
      let festivosEmpresa: string[] = [];
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      if (usarFestivosEmpresa && profesor?.id) {
        if (empresa?.ciudad) {
          festivosEmpresa = EmpresaFestivosDAO.getByCiudad(profesor.id, empresa.ciudad);
        }
      }
      const festivos = [...new Set([...festivosCentro, ...festivosEmpresa])];

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
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates') : path.resolve(process.cwd(), 'templates');
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

      if (modoCal === 'crear') {
        const cfg = getCreacionFicherosConfig();
        const subdirs = [empresa?.nombre];
        if (cfg.carpeta_estudiante) subdirs.push(`${alumno.apellidos}_${alumno.nombre}`);
        const result = saveToDocs(filenameCal, pdfBuffer, ...subdirs);
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
      const templatesDir = isProd ? path.join(__dirname, '..', 'templates') : path.resolve(process.cwd(), 'templates');
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
        FECHA_ACTUAL: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) || '',
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
      const filenameCarta = `Carta_Informativa_${empresa?.nombre.replace(/\s+/g, '_')}.pdf`;

      if (modoCarta === 'crear') {
        const result = saveToDocs(filenameCarta, pdfBuffer, empresa?.nombre);
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
      const fechaSeguimiento = alumno.fechaInicio !== null && alumno.fechaInicio !== null ? new Date(alumno.fechaInicio).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' - ' + (alumno.fechaFin ? new Date(alumno.fechaFin).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : '') : '';

      // Mapeo de Resultados de Aprendizaje
      const RAs = (detalle?.resultadosAprendizaje || []).map((ra: any) => ({
        actividad: ra.actividadFormativa,
        moduloCodigo: ra.codigo,
        numero: ra.ra
      }));

      // 2. Cargar plantilla
      const templatePath = isProd
        ? path.join(__dirname, '..', 'templates', 'ficha_de_seguimiento_periodico.docx')
        : path.join(process.cwd(), 'templates', 'ficha_de_seguimiento_periodico.docx');
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

      if (modeSeg === 'crear') {
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
        ? path.join(__dirname, '..', 'templates', 'valoracion_final.docx')
        : path.join(process.cwd(), 'templates', 'valoracion_final.docx');
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

      if (modoVal === 'crear') {
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
    res.json(PanelDAO.resumen(
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

  app.get('/api/festivos/obtener', async (req, res) => {
    const slug = req.query.slug as string;
    if (!slug) return res.status(400).json({ error: 'slug es requerido' });

    const cursos = CursoDAO.getAll();
    if (cursos.length === 0) return res.status(400).json({ error: 'No hay curso activo' });
    const year = new Date(cursos[0].fechaFin).getFullYear();

    try {
      const response = await fetch(`https://calendariosnacionales.com/es/v1/${year}/localidades/mad/madrid/${slug}.json`);
      if (!response.ok) return res.status(502).json({ error: 'Error al consultar la API externa' });

      const data = await response.json();
      const fechas: string[] = (data.holidays?.calendar || []).map((h: any) => h.date);

      res.json({ fechas });
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

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});