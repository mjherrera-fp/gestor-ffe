import express from 'express';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ProfesorDAO, CentroDAO, DetalleAcademicoDAO, CursoDAO, AlumnoDAO, EmpresaDAO, TutorEmpresaDAO, ConvenioDAO, InteresDAO, RelacionAlumnoDAO } from './src/lib/dao.ts';
import { ConvenioEstado } from './src/types/index.ts';

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
  app.post('/api/relaciones-alumnos', (req, res) => res.json({ id: RelacionAlumnoDAO.create(req.body) }));
  app.put('/api/relaciones-alumnos/:id', (req, res) => {
    RelacionAlumnoDAO.update(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/relaciones-alumnos/:id', (req, res) => {
    RelacionAlumnoDAO.delete(Number(req.params.id));
    res.json({ success: true });
  });

  // GENERAR DOCX
  app.get('/api/relaciones-alumnos/:id/documento', (req, res) => {
    try {
      const relacion = RelacionAlumnoDAO.getById(Number(req.params.id));
      if (!relacion) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacion.convenioId);
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const centro = CentroDAO.getById(convenio.centroId!);
      const tutorEmpresa = TutorEmpresaDAO.getById(relacion.tutorEmpresaId);
      const curso = CursoDAO.getById(convenio.cursoId);
      const profesor = ProfesorDAO.get();

      const fechaFormateada = convenio.fechaConvenio
        ? new Date(convenio.fechaConvenio).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        : '';

      let detalleAcademico: any = null;
      const alumnosData = relacion.alumnosRelacion.map((ar, index) => {
        const alumno = AlumnoDAO.getById(ar.alumnoId);

        if (!detalleAcademico && alumno.detalleAcademicoId) {
          detalleAcademico = DetalleAcademicoDAO.getById(alumno.detalleAcademicoId);
        }

        const horasSemanales =
          (relacion.horario.lunes?.horas || 0) + (relacion.horario.martes?.horas || 0) +
          (relacion.horario.miercoles?.horas || 0) + (relacion.horario.jueves?.horas || 0) +
          (relacion.horario.viernes?.horas || 0);

        let fInicio = ar.fechaInicio || relacion.fechaInicio;
        let fFin = ar.fechaFin || relacion.fechaFin;

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
          H_INICIO: relacion.horario.lunes?.inicio || '',
          H_FIN: relacion.horario.lunes?.fin || '',
          H_SEM: horasSemanales,
          T_HORAS: ar.totalHoras
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
        NUMERO_RELACION_ALUMNO: relacion?.numRelacion || '',
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
        CICLO: detalleAcademico?.ciclo || '',
        NIVEL: detalleAcademico?.nivel || '',
        GRADO: detalleAcademico?.grado || '',
        CICLO_CODIGO: detalleAcademico?.codigo || '',
        REGIMEN: detalleAcademico?.regimen || '',
        alumnos: alumnosData
      });

      const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

      res.setHeader('Content-Disposition', `attachment; filename=Anexo_Relacion_${relacion.numRelacion.replace(/\//g, '_')}.docx`);
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
      const relacion = RelacionAlumnoDAO.getById(Number(req.params.id));
      if (!relacion) return res.status(404).json({ error: 'Relación no encontrada' });

      const convenio = ConvenioDAO.getById(relacion.convenioId);
      const empresa = EmpresaDAO.getById(convenio.empresaId);
      const centro = CentroDAO.getById(convenio.centroId!);
      const tutorEmpresa = TutorEmpresaDAO.getById(relacion.tutorEmpresaId);
      const curso = CursoDAO.getById(convenio.cursoId);
      const profesor = ProfesorDAO.get();

      const fechaFormateada = convenio.fechaConvenio
        ? new Date(convenio.fechaConvenio).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        : '';

      let detalleAcademico: any = null;
      const alumnosData = relacion.alumnosRelacion.map((ar, index) => {
        const alumno = AlumnoDAO.getById(ar.alumnoId);

        if (!detalleAcademico && alumno.detalleAcademicoId) {
          detalleAcademico = DetalleAcademicoDAO.getById(alumno.detalleAcademicoId);
        }

        const horasSemanales =
          (relacion.horario.lunes?.horas || 0) + (relacion.horario.martes?.horas || 0) +
          (relacion.horario.miercoles?.horas || 0) + (relacion.horario.jueves?.horas || 0) +
          (relacion.horario.viernes?.horas || 0);

        let fInicio = ar.fechaInicio || relacion.fechaInicio;
        let fFin = ar.fechaFin || relacion.fechaFin;

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
          H_INICIO: relacion.horario.lunes?.inicio || '',
          H_FIN: relacion.horario.lunes?.fin || '',
          H_SEM: horasSemanales,
          T_HORAS: ar.totalHoras
        };
      });

      app.get('/api/relaciones-alumnos/:id/plan-formativo', async (req, res) => {
        const relacionId = req.params.id;
        const alumnoId = req.query.alumnoId; // <--- Debes capturar esto

        // Aquí generas el Word/PDF usando los datos de 'relacionId' y filtrando por 'alumnoId'
        // ...
      });

      app.get('/api/relaciones-alumnos/:id/plan-formativo/pdf', async (req, res) => {
        const relacionId = req.params.id;
        const alumnoId = req.query.alumnoId; // <--- Debes capturar esto

        // Aquí generas el Word/PDF usando los datos de 'relacionId' y filtrando por 'alumnoId'
        // ...
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
        NUMERO_RELACION_ALUMNO: relacion?.numRelacion || '',
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
        CICLO: detalleAcademico?.ciclo || '',
        NIVEL: detalleAcademico?.nivel || '',
        GRADO: detalleAcademico?.grado || '',
        CICLO_CODIGO: detalleAcademico?.codigo || '',
        REGIMEN: detalleAcademico?.regimen || '',
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
      res.setHeader('Content-Disposition', `attachment; filename=Anexo_Relacion_${relacion.numRelacion.replace(/\//g, '_')}.pdf`);

      return res.end(pdfBuffer); // Usamos .end() para enviar el buffer binario puro

    } catch (error: any) {
      if (browser) await browser.close();
      console.error('Error crítico generando PDF:', error);
      res.status(500).json({ error: error.message || 'Error interno al generar PDF' });
    }
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