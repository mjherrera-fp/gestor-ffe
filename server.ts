import express from 'express';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ProfesorDAO, CentroDAO, DetalleAcademicoDAO, CursoDAO, AlumnoDAO, EmpresaDAO, TutorEmpresaDAO, ConvenioDAO, InteresDAO, RelacionAlumnoDAO } from './src/lib/dao.ts';
import { Alumno, ConvenioEstado, DetalleAcademico } from './src/types/index.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup multer for CV uploads
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
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
  }

  // API Routes
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
  app.delete('/api/alumnos/:id', (req, res) => {
    AlumnoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // CV Upload
  app.post('/api/alumnos/:id/cv', upload.single('cv'), (req, res) => {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file' });
    AlumnoDAO.updateCV(Number(req.params.id), file.path);
    res.json({ success: true, path: file.path });
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
      const templatesDir = path.resolve(process.cwd(), 'templates');
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

  // GENERAR DOCX PLAN FORMATIVO
  app.get('/api/relaciones-alumnos/:id/plan-formativo', (req, res) => {
    const relacionId = req.params.id;
    // Aquí generas el Word usando los datos de 'relacionId'
    // ...
  });

  app.get('/api/relaciones-alumnos/:id/plan-formativo/pdf', async (req, res) => {
    const relacionId = req.params.id;
    const alumnoId = req.query.alumnoId; // <--- Debes capturar esto

    // Aquí generas el Word/PDF usando los datos de 'relacionId' y filtrando por 'alumnoId'
    // ...
  });

  // --- ENDPOINT GENERACIÓN DE SEGUIMIENTO ---
  app.post('/api/generate-seguimiento', async (req, res) => {
    /*
    try {
      const { relacionAlumnoId, RAs, fechaSeguimiento, curso } = req.body;

      // 1. Usar el DAO para obtener los datos
      const dbData = RelacionAlumnoDAO.getRelacionAlumnoParaSeguimiento(relacionAlumnoId) as any;

      if (!dbData) {
        return res.status(404).json({ error: 'Datos del alumno no encontrados' });
      }

      // 2. Cargar plantilla
      const templatePath = path.join(process.cwd(), 'templates', 'ficha_de_seguimiento_periodico.docx');
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      // 3. Mapeo de variables
      const data: any = {
        CURSO: curso || "2025-2026",
        NUMERO_CONVENIO: dbData.numConvenio || "",
        NUMERO_RELACION_ALUMNO: dbData.relacionId || "",
        ALUMNADO_APELLIDOS: dbData.alumnoApellidos || "",
        ALUMNADO_NOMBRE: dbData.alumnoNombre || "",
        ALUMNADO_EMAIL: dbData.alumnoEmail || "",
        EMPRESA: dbData.empresaNombre || "",
        EMPRESA_TUTOR_APELLIDOS: dbData.tutorEmpresaApellidos || "",
        EMPRESA_TUTOR_NOMBRE: dbData.tutorEmpresaNombre || "",
        EMPRESA_TUTOR_EMAIL: dbData.tutorEmpresaEmail || "",
        FECHA_SEGUIMIENTO: fechaSeguimiento || new Date().toLocaleDateString('es-ES'),
        TUTOR_NOMBRE: `${dbData.tutorCentroNombre} ${dbData.tutorCentroApellidos}` || ""
      };

      // 4. Mapeo RAs
      for (let i = 1; i <= 40; i++) {
        if (RAs && RAs[i - 1]) {
          data[`RA${i}`] = RAs[i - 1];
        } else {
          data[`RA${i}`] = "@@ELIMINAR@@";
        }
      }

      doc.render(data);
      let buf = doc.getZip().generate({ type: 'nodebuffer' });

      // 5. Limpieza XML
      buf = limpiarFilasActiveX(buf);

      res.setHeader('Content-Disposition', `attachment; filename=Seguimiento_${dbData.alumnoNombre.replace(/\s+/g, '_')}.docx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buf);
    } catch (error) {
      console.error('Error generando Ficha de Seguimiento:', error);
      res.status(500).json({ error: 'Error interno generando el documento' });
    }*/
  });

  // Vite setup
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
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