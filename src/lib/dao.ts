import db from './db.ts';
import { Profesor, CentroEducativo, DetalleAcademico, Curso, Alumno, Empresa, TutorEmpresa, Convenio, InteresAlumnoEmpresa, RelacionAlumno } from '../types/index.ts';

export const ProfesorDAO = {
  get: () => db.prepare('SELECT * FROM profesores LIMIT 1').get() as Profesor | undefined,
  create: (profesor: Profesor) => {
    const stmt = db.prepare(`
      INSERT INTO profesores (nombre, apellidos, nif, email, telefono)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(profesor.nombre, profesor.apellidos, profesor.nif, profesor.email, profesor.telefono);
    return info.lastInsertRowid;
  },
  update: (id: number, profesor: Profesor) => {
    const stmt = db.prepare(`
      UPDATE profesores SET 
        nombre = ?, apellidos = ?, nif = ?, email = ?, telefono = ?
      WHERE id = ?
    `);
    stmt.run(profesor.nombre, profesor.apellidos, profesor.nif, profesor.email, profesor.telefono, id);
  }
};

export const CentroDAO = {
  getAllByProfesor: (profesorId: number) => db.prepare('SELECT * FROM centros_educativos WHERE profesorId = ?').all(profesorId) as CentroEducativo[],
  getById: (id: number) => db.prepare('SELECT * FROM centros_educativos WHERE id = ?').get(id) as CentroEducativo | undefined,
  create: (centro: CentroEducativo) => {
    const stmt = db.prepare(`
      INSERT INTO centros_educativos (profesorId, nombre, ciudad, telefono, email)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(centro.profesorId, centro.nombre, centro.ciudad, centro.telefono, centro.email);
    return info.lastInsertRowid;
  },
  update: (id: number, centro: CentroEducativo) => {
    const stmt = db.prepare(`
      UPDATE centros_educativos SET 
        nombre = ?, ciudad = ?, telefono = ?, email = ?
      WHERE id = ?
    `);
    stmt.run(centro.nombre, centro.ciudad, centro.telefono, centro.email, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM centros_educativos WHERE id = ?').run(id)
};

export const DetalleAcademicoDAO = {
  getAll: () => (db.prepare(`
    SELECT d.*, c.nombre as centroNombre 
    FROM detalles_academicos d 
    JOIN centros_educativos c ON d.centroId = c.id
  `).all() as any[]).map(d => ({
    ...d,
    resultadosAprendizaje: d.resultadosAprendizaje ? JSON.parse(d.resultadosAprendizaje) : []
  })),
  getAllByCentro: (centroId: number) => (db.prepare('SELECT * FROM detalles_academicos WHERE centroId = ?').all(centroId) as any[]).map(d => ({
    ...d,
    resultadosAprendizaje: d.resultadosAprendizaje ? JSON.parse(d.resultadosAprendizaje) : []
  })),
  getById: (id: number) => {
    const d = db.prepare('SELECT * FROM detalles_academicos WHERE id = ?').get(id) as any;
    if (!d) return undefined;
    return {
      ...d,
      resultadosAprendizaje: d.resultadosAprendizaje ? JSON.parse(d.resultadosAprendizaje) : []
    } as DetalleAcademico;
  },
  create: (detalle: DetalleAcademico) => {
    const stmt = db.prepare(`
      INSERT INTO detalles_academicos (centroId, ciclo, codigo, nivel, grado, regimen, codigoGrupo, resultadosAprendizaje)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(detalle.centroId, detalle.ciclo, detalle.codigo, detalle.nivel, detalle.grado, detalle.regimen, detalle.codigoGrupo, JSON.stringify(detalle.resultadosAprendizaje || []));
    return info.lastInsertRowid;
  },
  update: (id: number, detalle: DetalleAcademico) => {
    const stmt = db.prepare(`
      UPDATE detalles_academicos SET 
        ciclo = ?, codigo = ?, nivel = ?, grado = ?, regimen = ?, codigoGrupo = ?, resultadosAprendizaje = ?
      WHERE id = ?
    `);
    stmt.run(detalle.ciclo, detalle.codigo, detalle.nivel, detalle.grado, detalle.regimen, detalle.codigoGrupo, JSON.stringify(detalle.resultadosAprendizaje || []), id);
  },
  delete: (id: number) => db.prepare('DELETE FROM detalles_academicos WHERE id = ?').run(id)
};

export const CursoDAO = {
  getAll: () => (db.prepare('SELECT * FROM cursos').all() as any[]).map(c => ({
    ...c,
    archivado: !!c.archivado,
    festivos: c.festivos ? JSON.parse(c.festivos) : []
  })),
  getActive: () => (db.prepare('SELECT * FROM cursos WHERE archivado = 0').all() as any[]).map(c => ({
    ...c,
    archivado: !!c.archivado,
    festivos: c.festivos ? JSON.parse(c.festivos) : []
  })),
  getArchived: () => (db.prepare('SELECT * FROM cursos WHERE archivado = 1').all() as any[]).map(c => ({
    ...c,
    archivado: !!c.archivado,
    festivos: c.festivos ? JSON.parse(c.festivos) : []
  })),
  getById: (id: number) => {
    const c = db.prepare('SELECT * FROM cursos WHERE id = ?').get(id) as any;
    if (!c) return undefined;
    return {
      ...c,
      archivado: !!c.archivado,
      festivos: c.festivos ? JSON.parse(c.festivos) : []
    } as Curso;
  },
  create: (curso: Curso) => {
    const stmt = db.prepare('INSERT INTO cursos (descripcion, fechaInicio, fechaFin, festivos) VALUES (?, ?, ?, ?)');
    const info = stmt.run(curso.descripcion, curso.fechaInicio, curso.fechaFin, JSON.stringify(curso.festivos || []));
    return info.lastInsertRowid;
  },
  update: (id: number, curso: Curso) => {
    const stmt = db.prepare('UPDATE cursos SET descripcion = ?, fechaInicio = ?, fechaFin = ?, festivos = ? WHERE id = ?');
    stmt.run(curso.descripcion, curso.fechaInicio, curso.fechaFin, JSON.stringify(curso.festivos || []), id);
  },
  delete: (id: number) => {
    // Cascade delete is handled by DB schema (foreign keys)
    db.prepare('DELETE FROM cursos WHERE id = ?').run(id);
  },
  archive: (id: number, archive: boolean) => {
    db.prepare('UPDATE cursos SET archivado = ? WHERE id = ?').run(archive ? 1 : 0, id);
  }
};

export const AlumnoDAO = {
  getAll: (cursoId?: number) => {
    if (cursoId) return db.prepare('SELECT * FROM alumnos WHERE cursoId = ?').all(cursoId) as Alumno[];
    return db.prepare('SELECT * FROM alumnos').all() as Alumno[];
  },
  getById: (id: number) => db.prepare('SELECT * FROM alumnos WHERE id = ?').get(id) as Alumno,
  create: (alumno: Alumno) => {
    const stmt = db.prepare('INSERT INTO alumnos (nombre, apellidos, dni, numSS, tlfn, emailEduca, emailPersonal, fechaNacimiento, cursoId, detalleAcademicoId, horasPendientesFFE) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(alumno.nombre, alumno.apellidos, alumno.dni, alumno.numSS, alumno.tlfn, alumno.emailEduca, alumno.emailPersonal, alumno.fechaNacimiento, alumno.cursoId, alumno.detalleAcademicoId || null, alumno.horasPendientesFFE || 0);
    return info.lastInsertRowid;
  },
  update: (id: number, alumno: Alumno) => {
    const stmt = db.prepare('UPDATE alumnos SET nombre = ?, apellidos = ?, dni = ?, numSS = ?, tlfn = ?, emailEduca = ?, emailPersonal = ?, fechaNacimiento = ?, cursoId = ?, detalleAcademicoId = ?, horasPendientesFFE = ? WHERE id = ?');
    stmt.run(alumno.nombre, alumno.apellidos, alumno.dni, alumno.numSS, alumno.tlfn, alumno.emailEduca, alumno.emailPersonal, alumno.fechaNacimiento, alumno.cursoId, alumno.detalleAcademicoId || null, alumno.horasPendientesFFE || 0, id);
  },
  linkDetalle: (alumnoId: number, detalleId: number | null) => {
    db.prepare('UPDATE alumnos SET detalleAcademicoId = ? WHERE id = ?').run(detalleId, alumnoId);
  },
  delete: (id: number) => db.prepare('DELETE FROM alumnos WHERE id = ?').run(id),
  updateCV: (id: number, cvPath: string | null) => db.prepare('UPDATE alumnos SET cvPath = ? WHERE id = ?').run(cvPath, id)
};

export const EmpresaDAO = {
  getAll: () => db.prepare('SELECT * FROM empresas').all() as Empresa[],
  getById: (id: number) => db.prepare('SELECT * FROM empresas WHERE id = ?').get(id) as Empresa,
  create: (empresa: Empresa) => {
    const stmt = db.prepare('INSERT INTO empresas (nombre, direccion, ciudad, cif, email, tlfn) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(empresa.nombre, empresa.direccion, empresa.ciudad, empresa.cif, empresa.email, empresa.tlfn);
    return info.lastInsertRowid;
  },
  update: (id: number, empresa: Empresa) => {
    const stmt = db.prepare('UPDATE empresas SET nombre = ?, direccion = ?, ciudad = ?, cif = ?, email = ?, tlfn = ? WHERE id = ?');
    stmt.run(empresa.nombre, empresa.direccion, empresa.ciudad, empresa.cif, empresa.email, empresa.tlfn, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM empresas WHERE id = ?').run(id)
};

export const TutorEmpresaDAO = {
  getAllByEmpresa: (empresaId: number) => db.prepare('SELECT * FROM tutores_empresa WHERE empresaId = ?').all(empresaId) as TutorEmpresa[],
  getById: (id: number) => db.prepare('SELECT * FROM tutores_empresa WHERE id = ?').get(id) as TutorEmpresa,
  create: (tutor: TutorEmpresa) => {
    const stmt = db.prepare('INSERT INTO tutores_empresa (empresaId, nombre, apellidos, nif, email, tlfn) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(tutor.empresaId, tutor.nombre, tutor.apellidos, tutor.nif, tutor.email, tutor.tlfn);
    return info.lastInsertRowid;
  },
  update: (id: number, tutor: TutorEmpresa) => {
    const stmt = db.prepare('UPDATE tutores_empresa SET nombre = ?, apellidos = ?, nif = ?, email = ?, tlfn = ? WHERE id = ?');
    stmt.run(tutor.nombre, tutor.apellidos, tutor.nif, tutor.email, tutor.tlfn, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM tutores_empresa WHERE id = ?').run(id)
};

export const ConvenioDAO = {
  getAll: (cursoId?: number) => {
    const query = cursoId 
      ? "SELECT c.*, e.nombre as empresaNombre, ce.nombre as centroNombre FROM convenios c JOIN empresas e ON c.empresaId = e.id LEFT JOIN centros_educativos ce ON c.centroId = ce.id WHERE c.cursoId = ?"
      : "SELECT c.*, e.nombre as empresaNombre, ce.nombre as centroNombre FROM convenios c JOIN empresas e ON c.empresaId = e.id LEFT JOIN centros_educativos ce ON c.centroId = ce.id";
    return db.prepare(query).all(cursoId ? [cursoId] : []) as (Convenio & { empresaNombre: string, centroNombre?: string })[];
  },
  getById: (id: number) => db.prepare('SELECT * FROM convenios WHERE id = ?').get(id) as Convenio,
  create: (convenio: Convenio) => {
    const stmt = db.prepare('INSERT INTO convenios (numConvenio, fechaConvenio, estado, empresaId, cursoId, centroId) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(convenio.numConvenio, convenio.fechaConvenio, convenio.estado, convenio.empresaId, convenio.cursoId, convenio.centroId);
    return info.lastInsertRowid;
  },
  update: (id: number, convenio: Convenio) => {
    const stmt = db.prepare('UPDATE convenios SET numConvenio = ?, fechaConvenio = ?, estado = ?, centroId = ? WHERE id = ?');
    stmt.run(convenio.numConvenio, convenio.fechaConvenio, convenio.estado, convenio.centroId, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM convenios WHERE id = ?').run(id)
};

export const InteresDAO = {
  getIntereses: () => db.prepare('SELECT * FROM intereses').all() as InteresAlumnoEmpresa[],
  add: (interes: InteresAlumnoEmpresa) => {
    db.prepare('INSERT INTO intereses (alumnoId, empresaId, interesado) VALUES (?, ?, ?)').run(interes.alumnoId, interes.empresaId, interes.interesado);
  },
  remove: (alumnoId: number, empresaId: number, interesado: string) => {
    db.prepare('DELETE FROM intereses WHERE alumnoId = ? AND empresaId = ? AND interesado = ?').run(alumnoId, empresaId, interesado);
  }
};

export const RelacionAlumnoDAO = {
  getAll: () => (db.prepare('SELECT * FROM relaciones_alumnos').all() as any[]).map(r => ({
    ...r,
    alumnosRelacion: JSON.parse(r.alumnosRelacion),
    horario: JSON.parse(r.horario)
  })),
  getById: (id: number) => {
    const r = db.prepare('SELECT * FROM relaciones_alumnos WHERE id = ?').get(id) as any;
    if (!r) return null;
    return { 
      ...r, 
      alumnosRelacion: JSON.parse(r.alumnosRelacion),
      horario: JSON.parse(r.horario) 
    } as RelacionAlumno;
  },
  getByConvenio: (convenioId: number) => (db.prepare('SELECT * FROM relaciones_alumnos WHERE convenioId = ?').all(convenioId) as any[]).map(r => ({
    ...r,
    alumnosRelacion: JSON.parse(r.alumnosRelacion),
    horario: JSON.parse(r.horario)
  })),
  create: (rel: RelacionAlumno) => {
    const stmt = db.prepare('INSERT INTO relaciones_alumnos (alumnosRelacion, convenioId, numRelacion, tutorEmpresaId, fechaInicio, fechaFin, horario, estado, estadoPlanFormativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(JSON.stringify(rel.alumnosRelacion), rel.convenioId, rel.numRelacion, rel.tutorEmpresaId, rel.fechaInicio, rel.fechaFin, JSON.stringify(rel.horario), rel.estado, rel.estadoPlanFormativo || 'PENDIENTE_ENVIAR_ESTUDIANTE');
    return info.lastInsertRowid;
  },
  update: (id: number, rel: RelacionAlumno) => {
    const stmt = db.prepare('UPDATE relaciones_alumnos SET alumnosRelacion = ?, convenioId = ?, numRelacion = ?, tutorEmpresaId = ?, fechaInicio = ?, fechaFin = ?, horario = ?, estado = ?, estadoPlanFormativo = ? WHERE id = ?');
    stmt.run(JSON.stringify(rel.alumnosRelacion), rel.convenioId, rel.numRelacion, rel.tutorEmpresaId, rel.fechaInicio, rel.fechaFin, JSON.stringify(rel.horario), rel.estado, rel.estadoPlanFormativo, id);
  },
  delete: (id: number) => {
    db.prepare('DELETE FROM relaciones_alumnos WHERE id = ?').run(id);
  }
};
