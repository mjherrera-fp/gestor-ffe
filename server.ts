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
import { ProfesorDAO, CentroDAO, DetalleAcademicoDAO, CursoDAO, AlumnoDAO, EmpresaDAO, TutorEmpresaDAO, ConvenioDAO, InteresDAO, RelacionAlumnoDAO, isDatabaseLocked, isDatabaseEncrypted, unlockDatabase, encryptDatabase } from './src/lib/dao.ts';
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
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
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

  // Emails
  app.post('/api/send-email', async (req, res) => {
    const { profesorId, tipo, destinatarios, plantillaId, asunto } = req.body;

    try {
      // 1. Obtener la configuración del profesor desde la BD
      const profesor = ProfesorDAO.get();

      if (!profesor || !profesor.smtp_user || !profesor.smtp_pass) {
        return res.status(400).json({ error: "Configuración de email incompleta" });
      }

      // 2. Crear transporter dinámico
      const transporter = nodemailer.createTransport({
        host: profesor.smtp_host,
        port: profesor.smtp_port,
        secure: profesor.smtp_secure,
        auth: {
          user: profesor.smtp_user,
          pass: profesor.smtp_pass,
        },
      });

      // 3. Renderizar y enviar (usando React Email)
      const emailHtml = await render(
        tipo === 'estudiante' ? EstudianteTemplate(destinatarios) : EmpresaTemplate(destinatarios)
      );

      await transporter.sendMail({
        from: `"${profesor.nombre} ${profesor.apellidos}" <${profesor.smtp_user}>`,
        to: destinatarios,
        subject: asunto,
        html: emailHtml,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al enviar el email", details: error });
    }
  });

  // Cursos
  app.get('/api/cursos', (req, res) => res.json(CursoDAO.getAll()));
  app.get('/api/cursos/active', (req, res) => res.json(CursoDAO.getActive()));
  app.get('/api/cursos/archived', (req, res) => res.json(CursoDAO.getArchived()));
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
  app.post('/api/cursos/:id/archive', (req, res) => {
    try {
      const id = Number(req.params.id);
      const isArchived = req.body.archive === true || req.body.archive === 1 || String(req.body.archive) === 'true';
      CursoDAO.archive(id, isArchived);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving curso:", error);
      res.status(500).json({ error: "No se pudo cambiar el estado del curso" });
    }
  });

  // Alumnos
  app.get('/api/alumnos', (req, res) => res.json(AlumnoDAO.getAll(req.query.cursoId ? Number(req.query.cursoId) : undefined)));
  app.post('/api/alumnos', (req, res) => res.json({ id: AlumnoDAO.create(req.body) }));
  app.put('/api/alumnos/:id', (req, res) => {
    AlumnoDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.put('/api/alumnos/:id/estado-plan-formativo', (req, res) => {
    AlumnoDAO.updateEstadoPlanFormativo(Number(req.params.id), req.body.estadoPlanFormativo);
    res.json({ success: true });
  });
  app.put('/api/alumnos/:id/estado-seguimiento', (req, res) => {
    AlumnoDAO.updateEstadoSeguimiento(Number(req.params.id), req.body.estadoSeguimiento);
    res.json({ success: true });
  });
  app.put('/api/alumnos/:id/estado-valoracion', (req, res) => {
    AlumnoDAO.updateEstadoValoracion(Number(req.params.id), req.body.estadoValoracion);
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

  // Convenios
  app.get('/api/convenios', (req, res) => res.json(ConvenioDAO.getAll(req.query.cursoId ? Number(req.query.cursoId) : undefined)));
  app.post('/api/convenios', (req, res) => {
    const { convenio } = req.body;
    if (!convenio.centroId) return res.status(400).json({ error: 'El centro educativo es obligatorio.' });
    const id = ConvenioDAO.create(convenio);
    res.json({ id });
  });

  app.put('/api/convenios/:id', (req, res) => {
    const { convenio } = req.body;
    if (!convenio.centroId) return res.status(400).json({ error: 'El centro educativo es obligatorio.' });
    ConvenioDAO.update(Number(req.params.id), convenio);
    res.json({ success: true });
  });
  app.delete('/api/convenios/:id', (req, res) => {
    ConvenioDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // Intereses
  app.get('/api/intereses', (req, res) => res.json(InteresDAO.getIntereses()));
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
    res.json(RelacionAlumnoDAO.getAll());
  });
  app.post('/api/relaciones-alumnos', (req, res) => {
    try {
      const id = RelacionAlumnoDAO.create(req.body);
      res.json({ id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear la relación y vincular alumnos' });
    }
  });
  app.put('/api/relaciones-alumnos/:id', (req, res) => {
    try {
      RelacionAlumnoDAO.update(Number(req.params.id), req.body);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar' });
    }
  });
  app.delete('/api/relaciones-alumnos/:id', (req, res) => {
    try {
      RelacionAlumnoDAO.delete(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });

  // GENERAR DOCX
  app.get('/api/relaciones-alumnos/:id/documento', (req, res) => {
    try {
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

      res.setHeader('Content-Disposition', `attachment; filename=Anexo_Relacion_${relacionAlumno.numRelacion.replace(/\//g, '_')}.docx`);
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
        waitUntil: 'networkidle0', // Espera a que carguen imágenes/estilos
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      await browser.close();

      // 4. ENVÍO SEGURO DEL BUFFER
      // Limpiamos cualquier cabecera previa que pudiera estar interfiriendo
      res.removeHeader('Transfer-Encoding');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=Anexo_Relacion_${relacionAlumno.numRelacion.replace(/\//g, '_')}.pdf`);

      return res.end(pdfBuffer); // Usamos .end() para enviar el buffer binario puro

    } catch (error: any) {
      console.error('💥 ERROR CRÍTICO GENERANDO EL DOCX:');

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

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="Plan_Formativo_${alumno.apellidos.replace(/\s+/g, '_')}.docx"`);
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
    const relacionId = req.params.id;
    const alumnoId = req.query.alumnoId; // <--- Debes capturar esto

    // Aquí generas el Word/PDF usando los datos de 'relacionId' y filtrando por 'alumnoId'
    // ...
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

      // IMPORTANTE: Finalizar correctamente la respuesta
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=Seguimiento_${alumno.nombre.replace(/\s+/g, '_')}_${alumno.apellidos.replace(/\s+/g, '_')}.docx`,
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

      // IMPORTANTE: Finalizar correctamente la respuesta
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=Valoración_final_${alumno.nombre.replace(/\s+/g, '_')}_${alumno.apellidos.replace(/\s+/g, '_')}.docx`,
        'Content-Length': buf.length
      });
      res.end(buf);
    } catch (error) {
      console.error('Error generando Ficha de Valoración:', error);
      res.status(500).json({ error: 'Error interno generando el documento' });
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