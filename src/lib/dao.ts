import { db, isDbEncrypted, unlockDB, lockDB } from './db.ts';
import { Profesor, CentroEducativo, DetalleAcademico, Curso, Alumno, Empresa, TutorEmpresa, EmpresaEstadistica, Convenio, InteresAlumnoEmpresa, RelacionAlumno, PlanFormativoEstado, SeguimientoEstado, ValoracionEstado, PanelResumenRow, SeguridadSocialData } from '../types/index.ts';

const safeParse = (str: any, fallback: any) => {
  if (!str || str === 'undefined' || str === 'null') return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

// --- LÓGICA DE CIFRADO ---

let databaseHadKeyAtStartup = false;
let sessionKeyApplied = false;

// Función interna para comprobar el estado real del archivo
const checkFileLocked = (): boolean => {
  try {
    db.prepare('SELECT count(*) FROM sqlite_master').get();
    return false;
  } catch (error) {
    return true;
  }
};

// Guardamos si al arrancar el servidor el archivo estaba cifrado
databaseHadKeyAtStartup = checkFileLocked();

export const isDatabaseLocked = () => checkFileLocked();

// NUEVA FUNCIÓN: Nos dice si el archivo TIENE cifrado (aunque esté desbloqueado ahora)
export const isDatabaseEncrypted = () => {
  return databaseHadKeyAtStartup || sessionKeyApplied;
};

// Función para desbloquear al arrancar
export const unlockDatabase = (password: string): boolean => {
  try {
    unlockDB(password);
    return true
  } catch (error) {
    console.error("🔴 Error REAL al intentar desbloquear:", error);
    return false; // Contraseña incorrecta
  }
};

export const lockDatabase = (): boolean => {
  try {
    lockDB();
    return true
  } catch (error) {
    console.error("🔴 Error REAL al intentar bloquear:", error);
    return false; // Contraseña incorrecta
  }
};

// Función para cifrar o cambiar la contraseña (se usa en el Perfil)
export const encryptDatabase = (password: string) => {
  db.pragma(`rekey='${password}'`);
  sessionKeyApplied = true; // <--- Marcamos que ahora tiene clave
};

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
  },
  updateConfigEmail: (id: number, config: Partial<Profesor>) => {
    const stmt = db.prepare(`
      UPDATE profesores SET 
        smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?, send_delay_ms = ?
      WHERE id = ?
    `);
    stmt.run(config.smtp_host, config.smtp_port, config.smtp_user, config.smtp_pass, config.smtp_secure ? 1 : 0, config.send_delay_ms ?? 1500, id);
  },
};

export const ConfiguracionDAO = {
  getConfig: (profesorId: number, tipo: string): Record<string, string> => {
    const rows = db.prepare('SELECT clave, valor FROM configuracion WHERE profesorId = ? AND tipo = ?').all(profesorId, tipo) as { clave: string; valor: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.clave] = row.valor;
    }
    return result;
  },
  setConfig: (profesorId: number, tipo: string, data: Record<string, string | number | boolean | null | undefined>) => {
    const del = db.prepare('DELETE FROM configuracion WHERE profesorId = ? AND tipo = ?');
    const insert = db.prepare('INSERT INTO configuracion (profesorId, tipo, clave, valor) VALUES (?, ?, ?, ?)');
    const transaction = db.transaction(() => {
      del.run(profesorId, tipo);
      for (const [clave, valor] of Object.entries(data)) {
        if (valor !== undefined && valor !== null && valor !== '') {
          insert.run(profesorId, tipo, clave, typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor));
        }
      }
    });
    transaction();
  },
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
    festivos: c.festivos ? JSON.parse(c.festivos) : [],
    tutorias: c.tutorias ? JSON.parse(c.tutorias) : []
  })),
  getById: (id: number) => {
    const c = db.prepare('SELECT * FROM cursos WHERE id = ?').get(id) as any;
    if (!c) return undefined;
    return {
      ...c,
      festivos: c.festivos ? JSON.parse(c.festivos) : [],
      tutorias: c.tutorias ? JSON.parse(c.tutorias) : []
    } as Curso;
  },
  create: (curso: Curso) => {
    const stmt = db.prepare('INSERT INTO cursos (descripcion, fechaInicio, fechaFin, festivos, tutorias) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(curso.descripcion, curso.fechaInicio, curso.fechaFin, JSON.stringify(curso.festivos || []), JSON.stringify(curso.tutorias || []));
    return info.lastInsertRowid;
  },
  update: (id: number, curso: Curso) => {
    const stmt = db.prepare('UPDATE cursos SET descripcion = ?, fechaInicio = ?, fechaFin = ?, festivos = ?, tutorias = ? WHERE id = ?');
    stmt.run(curso.descripcion, curso.fechaInicio, curso.fechaFin, JSON.stringify(curso.festivos || []), JSON.stringify(curso.tutorias || []), id);
  },
  delete: (id: number) => {
    const delRelaciones = db.prepare('DELETE FROM relaciones WHERE convenioId IN (SELECT id FROM convenios WHERE cursoId = ?)');
    const delAlumnos = db.prepare('DELETE FROM alumnos WHERE cursoId = ?');
    const delCurso = db.prepare('DELETE FROM cursos WHERE id = ?');
    db.transaction(() => {
      delRelaciones.run(id);
      delAlumnos.run(id);
      delCurso.run(id);
    })();
  },
};

export const AlumnoDAO = {
  getAll: (cursoId?: number, detalleAcademicoId?: number) => {
    if (cursoId && detalleAcademicoId) return db.prepare('SELECT * FROM alumnos WHERE cursoId = ? AND detalleAcademicoId = ?').all(cursoId, detalleAcademicoId) as Alumno[];
    if (cursoId) return db.prepare('SELECT * FROM alumnos WHERE cursoId = ?').all(cursoId) as Alumno[];
    if (detalleAcademicoId) return db.prepare('SELECT * FROM alumnos WHERE detalleAcademicoId = ?').all(detalleAcademicoId) as Alumno[];
    return db.prepare('SELECT * FROM alumnos').all() as Alumno[];
  },
  getById: (id: number) => db.prepare('SELECT * FROM alumnos WHERE id = ?').get(id) as Alumno,
  getByRelacionId: (id: number) => db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').get(id) as Alumno[],
  create: (alumno: Alumno) => {
    const stmt = db.prepare('INSERT INTO alumnos (nombre, apellidos, dni, numSS, tlfn, emailEduca, emailPersonal, fechaNacimiento, cursoId, detalleAcademicoId, totalHorasFFE, fechaInicio, fechaFin, estadoPlanFormativo, estadoSeguimiento, estadoValoracion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(alumno.nombre, alumno.apellidos, alumno.dni, alumno.numSS, alumno.tlfn, alumno.emailEduca, alumno.emailPersonal, alumno.fechaNacimiento, alumno.cursoId, alumno.detalleAcademicoId || null, alumno.totalHorasFFE, alumno.fechaInicio, alumno.fechaFin, alumno.estadoPlanFormativo, alumno.estadoSeguimiento, alumno.estadoValoracion);
    return info.lastInsertRowid;
  },
  update: (id: number, alumno: Alumno) => {
    const stmt = db.prepare('UPDATE alumnos SET nombre = ?, apellidos = ?, dni = ?, numSS = ?, tlfn = ?, emailEduca = ?, emailPersonal = ?, fechaNacimiento = ?, cursoId = ?, detalleAcademicoId = ?, totalHorasFFE = ?, fechaInicio = ?, fechaFin = ?, estadoPlanFormativo = ?, estadoSeguimiento = ?, estadoValoracion = ? WHERE id = ?');
    stmt.run(alumno.nombre, alumno.apellidos, alumno.dni, alumno.numSS, alumno.tlfn, alumno.emailEduca, alumno.emailPersonal, alumno.fechaNacimiento, alumno.cursoId, alumno.detalleAcademicoId || null, alumno.totalHorasFFE, alumno.fechaInicio, alumno.fechaFin, alumno.estadoPlanFormativo, alumno.estadoSeguimiento, alumno.estadoValoracion, id);
  },
  updateEstadoPlanFormativo: (id: number, estadoPlanFormativo: PlanFormativoEstado) => {
    const stmt = db.prepare('UPDATE alumnos SET estadoPlanFormativo = ? WHERE id = ?');
    stmt.run(estadoPlanFormativo, id);
  },
  updateEstadoSeguimiento: (id: number, estadoSeguimiento: SeguimientoEstado) => {
    const stmt = db.prepare('UPDATE alumnos SET estadoSeguimiento = ? WHERE id = ?');
    stmt.run(estadoSeguimiento, id);
  },
  updateEstadoValoracion: (id: number, estadoValoracion: ValoracionEstado) => {
    const stmt = db.prepare('UPDATE alumnos SET estadoValoracion = ? WHERE id = ?');
    stmt.run(estadoValoracion, id);
  },
  linkDetalle: (alumnoId: number, detalleId: number | null) => {
    db.prepare('UPDATE alumnos SET detalleAcademicoId = ? WHERE id = ?').run(detalleId, alumnoId);
  },
  delete: (id: number) => db.prepare('DELETE FROM alumnos WHERE id = ?').run(id),
  updateCV: (id: number, cvPath: string | null) => db.prepare('UPDATE alumnos SET cvPath = ? WHERE id = ?').run(cvPath, id)
};

export const EmailContactsDAO = {
  getAll: () => {
    const empresas = db.prepare('SELECT id, nombre, email FROM empresas').all() as { id: number; nombre: string; email: string }[];
    const tutores = db.prepare(`
      SELECT t.id, t.nombre, t.apellidos, t.email, e.nombre as empresaNombre
      FROM tutores_empresa t JOIN empresas e ON e.id = t.empresaId
    `).all() as { id: number; nombre: string; apellidos: string; email: string; empresaNombre: string }[];
    const alumnos = db.prepare('SELECT id, nombre, apellidos, emailEduca, emailPersonal FROM alumnos').all() as { id: number; nombre: string; apellidos: string; emailEduca: string; emailPersonal: string }[];
    return { empresas, tutores, alumnos };
  },
};

export const EmpresaDAO = {
  getAll: () => db.prepare('SELECT * FROM empresas').all() as Empresa[],
  getById: (id: number) => db.prepare('SELECT * FROM empresas WHERE id = ?').get(id) as Empresa,
  create: (empresa: Empresa) => {
    const stmt = db.prepare('INSERT INTO empresas (nombre, direccion, ciudad, cif, email, tlfn, comentarios) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(empresa.nombre, empresa.direccion, empresa.ciudad, empresa.cif, empresa.email, empresa.tlfn, empresa.comentarios ?? null);
    return info.lastInsertRowid;
  },
  update: (id: number, empresa: Empresa) => {
    const stmt = db.prepare('UPDATE empresas SET nombre = ?, direccion = ?, ciudad = ?, cif = ?, email = ?, tlfn = ?, comentarios = ? WHERE id = ?');
    stmt.run(empresa.nombre, empresa.direccion, empresa.ciudad, empresa.cif, empresa.email, empresa.tlfn, empresa.comentarios ?? null, id);
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

export const EmpresaEstadisticaDAO = {
  getAll: () => db.prepare('SELECT * FROM empresa_estadisticas ORDER BY empresaId, curso DESC').all() as EmpresaEstadistica[],
  getAllByEmpresa: (empresaId: number) => db.prepare('SELECT * FROM empresa_estadisticas WHERE empresaId = ? ORDER BY curso DESC').all(empresaId) as EmpresaEstadistica[],
  getById: (id: number) => db.prepare('SELECT * FROM empresa_estadisticas WHERE id = ?').get(id) as EmpresaEstadistica,
  getByEmpresaAndCurso: (empresaId: number, curso: string) => db.prepare('SELECT * FROM empresa_estadisticas WHERE empresaId = ? AND curso = ?').get(empresaId, curso) as EmpresaEstadistica | undefined,
  create: (est: EmpresaEstadistica) => {
    const stmt = db.prepare('INSERT INTO empresa_estadisticas (empresaId, curso, numAlumnos, contratados, valoracion) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(est.empresaId, est.curso, est.numAlumnos, est.contratados ?? 0, est.valoracion ?? null);
    return info.lastInsertRowid;
  },
  update: (id: number, est: EmpresaEstadistica) => {
    const stmt = db.prepare('UPDATE empresa_estadisticas SET curso = ?, numAlumnos = ?, contratados = ?, valoracion = ? WHERE id = ?');
    stmt.run(est.curso, est.numAlumnos, est.contratados ?? 0, est.valoracion ?? null, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM empresa_estadisticas WHERE id = ?').run(id),
  upsert: (empresaId: number, curso: string, data: { numAlumnos?: number; contratados?: number; valoracion?: number }) => {
    const existing = db.prepare('SELECT id FROM empresa_estadisticas WHERE empresaId = ? AND curso = ?').get(empresaId, curso) as any;
    if (existing) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (data.numAlumnos !== undefined) { sets.push('numAlumnos = ?'); vals.push(data.numAlumnos); }
      if (data.contratados !== undefined) { sets.push('contratados = ?'); vals.push(data.contratados); }
      if (data.valoracion !== undefined) { sets.push('valoracion = ?'); vals.push(data.valoracion); }
      if (sets.length > 0) {
        vals.push(existing.id);
        db.prepare(`UPDATE empresa_estadisticas SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      }
      return existing.id;
    } else {
      const info = db.prepare('INSERT INTO empresa_estadisticas (empresaId, curso, numAlumnos, contratados, valoracion) VALUES (?, ?, ?, ?, ?)').run(
        empresaId, curso, data.numAlumnos ?? 0, data.contratados ?? 0, data.valoracion ?? null
      );
      return info.lastInsertRowid;
    }
  }
};

export const ConvenioDAO = {
  getAll: (cursoId?: number, centroId?: number) => {
    let query = "SELECT c.*, e.nombre as empresaNombre, ce.nombre as centroNombre FROM convenios c JOIN empresas e ON c.empresaId = e.id LEFT JOIN centros_educativos ce ON c.centroId = ce.id";
    const params: any[] = [];
    const conditions: string[] = [];
    if (cursoId) { conditions.push('c.cursoId = ?'); params.push(cursoId); }
    if (centroId) { conditions.push('c.centroId = ?'); params.push(centroId); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    return db.prepare(query).all(...params) as (Convenio & { empresaNombre: string, centroNombre?: string })[];
  },
  getById: (id: number) => db.prepare('SELECT * FROM convenios WHERE id = ?').get(id) as Convenio,
  create: (convenio: Convenio) => {
    const stmt = db.prepare('INSERT INTO convenios (numConvenio, fechaConvenio, estado, empresaId, cursoId, centroId, tipoFirma) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(convenio.numConvenio, convenio.fechaConvenio, convenio.estado, convenio.empresaId, convenio.cursoId, convenio.centroId, convenio.tipoFirma || 'SIN_ASIGNAR');
    return info.lastInsertRowid;
  },
  update: (id: number, convenio: Convenio) => {
    const stmt = db.prepare('UPDATE convenios SET numConvenio = ?, fechaConvenio = ?, estado = ?, centroId = ?, tipoFirma = ? WHERE id = ?');
    stmt.run(convenio.numConvenio, convenio.fechaConvenio, convenio.estado, convenio.centroId, convenio.tipoFirma || 'SIN_ASIGNAR', id);
  },
  delete: (id: number) => db.prepare('DELETE FROM convenios WHERE id = ?').run(id)
};

export const InteresDAO = {
  getIntereses: (detalleAcademicoId?: number) => {
    if (detalleAcademicoId) {
      return db.prepare(`
        SELECT i.* FROM intereses i
        JOIN alumnos a ON i.alumnoId = a.id
        WHERE a.detalleAcademicoId = ?
      `).all(detalleAcademicoId) as InteresAlumnoEmpresa[];
    }
    return db.prepare('SELECT * FROM intereses').all() as InteresAlumnoEmpresa[];
  },
  add: (interes: InteresAlumnoEmpresa) => {
    db.prepare('INSERT INTO intereses (alumnoId, empresaId, interesado) VALUES (?, ?, ?)').run(interes.alumnoId, interes.empresaId, interes.interesado);
  },
  remove: (alumnoId: number, empresaId: number, interesado: string) => {
    db.prepare('DELETE FROM intereses WHERE alumnoId = ? AND empresaId = ? AND interesado = ?').run(alumnoId, empresaId, interesado);
  }
};

function syncEmpresaEstadistica(convenioId: number) {
  const convenio = db.prepare('SELECT * FROM convenios WHERE id = ?').get(convenioId) as Convenio | undefined;
  if (!convenio) return;

  const total = db.prepare(`
    SELECT COUNT(*) as total FROM alumnos a
    JOIN relaciones r ON a.relacionId = r.id
    WHERE r.convenioId = ?
  `).get(convenioId) as any;

  const curso = db.prepare('SELECT * FROM cursos WHERE id = ?').get(convenio.cursoId) as any;
  if (!curso) return;

  const cursoStr = `${new Date(curso.fechaInicio).getFullYear()}/${new Date(curso.fechaFin).getFullYear()}`;

  const existing = db.prepare('SELECT id FROM empresa_estadisticas WHERE empresaId = ? AND curso = ?').get(convenio.empresaId, cursoStr) as any;
  if (existing) {
    if (total.total === 0) {
      db.prepare('DELETE FROM empresa_estadisticas WHERE id = ?').run(existing.id);
    } else {
      db.prepare('UPDATE empresa_estadisticas SET numAlumnos = ? WHERE id = ?').run(total.total, existing.id);
    }
  } else if (total.total > 0) {
    db.prepare('INSERT INTO empresa_estadisticas (empresaId, curso, numAlumnos, contratados) VALUES (?, ?, ?, 0)').run(convenio.empresaId, cursoStr, total.total);
  }
}

export const RelacionAlumnoDAO = {
  getAll: (detalleAcademicoId?: number): RelacionAlumno[] => {
    const relaciones = detalleAcademicoId
      ? db.prepare(`
          SELECT DISTINCT r.* FROM relaciones r
          JOIN alumnos a ON a.relacionId = r.id
          WHERE a.detalleAcademicoId = ?
        `).all(detalleAcademicoId) as any[]
      : db.prepare('SELECT * FROM relaciones').all() as any[];

    return relaciones.map(r => {
      const alumnosRelacionados = db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').all(r.id) as Alumno[];
      const empresa = db.prepare('SELECT e.* FROM empresas e INNER JOIN convenios c ON e.id = c.empresaId INNER JOIN relaciones r ON c.id = r.convenioId WHERE r.id = ?').get(r.id) as Empresa;

      return {
        ...r,
        horario: safeParse(r.horario, {}),
        empresa: empresa,
        alumnos: alumnosRelacionados
      } as RelacionAlumno;
    });
  },
  getById: (id: number): RelacionAlumno | null => {
    const r = db.prepare('SELECT * FROM relaciones WHERE id = ?').get(id) as any;
    if (!r) return null;

    // Obtenemos los alumnos asociados a esta relación
    const alumnosRelacionados = db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').all(id) as Alumno[];
    const empresa = db.prepare('SELECT e.* FROM empresas e INNER JOIN convenios c ON e.id = c.empresaId INNER JOIN relaciones r ON c.id = r.convenioId WHERE r.id = ?').get(r.id) as Empresa;

    return {
      ...r,
      horario: safeParse(r.horario, {}),
      empresa: empresa,
      alumnos: alumnosRelacionados
    } as RelacionAlumno;
  },

  getByConvenio: (convenioId: number): RelacionAlumno[] => {
    const relaciones = db.prepare('SELECT * FROM relaciones WHERE convenioId = ?').all(convenioId) as any[];

    return relaciones.map(r => {
      // Obtenemos los alumnos asociados a cada relación
      const alumnosRelacionados = db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').all(r.id) as Alumno[];
      const empresa = db.prepare('SELECT e.* FROM empresas e INNER JOIN convenios c ON e.id = c.empresaId WHERE c.id = ?').get(convenioId) as Empresa;

      return {
        ...r,
        horario: safeParse(r.horario, {}),
        empresa: empresa,
        alumnos: alumnosRelacionados
      } as RelacionAlumno;
    });
  },

  create: (rel: RelacionAlumno) => {
    // Usamos una transacción para asegurar la integridad de ambas tablas
    return db.transaction(() => {
      // 1. Insertar la relación en 'relaciones'
      const stmtRel = db.prepare(`
        INSERT INTO relaciones (
          convenioId, tutorEmpresaId, numRelacion, horario, estado,
          firmaRelacion, firmaPlanFormativo, firmaSeguimiento, firmaValoracion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmtRel.run(
        rel.convenioId,
        rel.tutorEmpresaId,
        rel.numRelacion,
        JSON.stringify(rel.horario),
        rel.estado,
        rel.firmaRelacion || 'SIN_ASIGNAR',
        rel.firmaPlanFormativo || 'SIN_ASIGNAR',
        rel.firmaSeguimiento || 'SIN_ASIGNAR',
        rel.firmaValoracion || 'SIN_ASIGNAR'
      );

      const relacionId = info.lastInsertRowid as number;

      // 2. Actualizar cada alumno vinculado
      const stmtAlumno = db.prepare(`
        UPDATE alumnos SET 
          relacionId = ?, 
          fechaInicio = ?,
          fechaFin = ? 
        WHERE id = ?
      `);

      for (const alu of rel.alumnos) {
        stmtAlumno.run(relacionId, alu.fechaInicio, alu.fechaFin, alu.id);
      }

      // 3. Sincronizar empresa_estadisticas
      syncEmpresaEstadistica(rel.convenioId);

      return relacionId;
    })();
  },

  update: (id: number, rel: RelacionAlumno) => {
    db.transaction(() => {
      // 1. Actualizar la tabla de relaciones
      const stmtRel = db.prepare(`
        UPDATE relaciones SET 
          convenioId = ?, tutorEmpresaId = ?, numRelacion = ?, 
          horario = ?, estado = ?,
          firmaRelacion = ?, firmaPlanFormativo = ?, firmaSeguimiento = ?,
          firmaValoracion = ?
        WHERE id = ?
      `);

      stmtRel.run(
        rel.convenioId, rel.tutorEmpresaId, rel.numRelacion,
        JSON.stringify(rel.horario), rel.estado,
        rel.firmaRelacion || 'SIN_ASIGNAR',
        rel.firmaPlanFormativo || 'SIN_ASIGNAR',
        rel.firmaSeguimiento || 'SIN_ASIGNAR',
        rel.firmaValoracion || 'SIN_ASIGNAR',
        id
      );

      // 2. Gestionar alumnos: Primero desvinculamos a los que ya no están
      db.prepare('UPDATE alumnos SET relacionId = NULL, fechaInicio = NULL, fechaFin = NULL WHERE relacionId = ?').run(id);

      // 3. Vinculamos a los nuevos/actuales
      const stmtAlumno = db.prepare(`
        UPDATE alumnos SET 
          relacionId = ?, 
          fechaInicio = ?,
          fechaFin = ? 
        WHERE id = ?
      `);

      for (const alu of rel.alumnos) {
        stmtAlumno.run(id, alu.fechaInicio, alu.fechaFin, alu.id);
      }

      // 4. Sincronizar empresa_estadisticas
      syncEmpresaEstadistica(rel.convenioId);
    })();
  },

  delete: (id: number) => {
    // Obtenemos datos antes de borrar
    const rel = db.prepare('SELECT * FROM relaciones WHERE id = ?').get(id) as any;

    db.transaction(() => {
      // 1. Limpiamos la referencia en los alumnos antes de borrar la relación
      db.prepare('UPDATE alumnos SET relacionId = NULL, fechaInicio = NULL, fechaFin = NULL, estadoPlanFormativo = ?, estadoSeguimiento = ?, estadoValoracion = ? WHERE relacionId = ?').run('PENDIENTE_ENVIAR_ESTUDIANTE', 'PENDIENTE', 'PENDIENTE', id);

      // 2. Borramos la relación
      db.prepare('DELETE FROM relaciones WHERE id = ?').run(id);

      // 3. Sincronizar empresa_estadisticas
      if (rel) syncEmpresaEstadistica(rel.convenioId);
    })();
  }
};

export const PanelDAO = {
  resumen: (cursoId?: number, detalleAcademicoId?: number): PanelResumenRow[] => {
    const baseQuery = `SELECT 
        a.id as alumnoId, a.nombre, a.apellidos,
        a.fechaInicio, a.fechaFin, a.totalHorasFFE, a.relacionId,
        a.estadoPlanFormativo, a.estadoSeguimiento, a.estadoValoracion,
        e.nombre as empresaNombre,
        c.numConvenio, c.estado as estadoConvenio,
        c.tipoFirma as tipoFirmaConvenio,
        r.numRelacion, r.estado as estadoRelacion,
        r.firmaRelacion, r.firmaPlanFormativo, r.firmaSeguimiento,
        r.firmaValoracion
      FROM alumnos a
      LEFT JOIN relaciones r ON a.relacionId = r.id
      LEFT JOIN convenios c ON r.convenioId = c.id
      LEFT JOIN empresas e ON c.empresaId = e.id`;
    const conditions: string[] = [];
    const params: any[] = [];
    if (cursoId) { conditions.push('a.cursoId = ?'); params.push(cursoId); }
    if (detalleAcademicoId) { conditions.push('a.detalleAcademicoId = ?'); params.push(detalleAcademicoId); }
    const query = conditions.length > 0 ? baseQuery + ' WHERE ' + conditions.join(' AND ') : baseQuery;
    return db.prepare(query).all(...params) as PanelResumenRow[];
  },

  seguridadSocial: (cursoId: number, detalleAcademicoId?: number): SeguridadSocialData => {
    const filtroAlumno = detalleAcademicoId ? 'AND a.detalleAcademicoId = ?' : '';
    const paramsAlumno: any[] = detalleAcademicoId ? [cursoId, detalleAcademicoId] : [cursoId];

    const alumnos = db.prepare(
      `SELECT id, nombre, apellidos, fechaInicio, fechaFin FROM alumnos a WHERE a.cursoId = ? ${filtroAlumno}`
    ).all(...paramsAlumno) as { id: number; nombre: string; apellidos: string; fechaInicio: string | null; fechaFin: string | null }[];

    const curso = db.prepare('SELECT * FROM cursos WHERE id = ?').get(cursoId) as any;
    if (!curso) return { meses: [], alumnos: [], datos: {} };

    const festivos: string[] = curso.festivos ? JSON.parse(curso.festivos) : [];
    const festivosSet = new Set(festivos);

    const toLocalDate = (iso: string | null): Date | null => {
      if (!iso) return null;
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    const toLocalDateStr = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const relaciones = db.prepare(`
      SELECT r.id, r.horario, a.id as alumnoId, a.fechaInicio as aluInicio, a.fechaFin as aluFin
      FROM relaciones r
      JOIN alumnos a ON a.relacionId = r.id
      WHERE a.cursoId = ? ${filtroAlumno}
    `).all(...paramsAlumno) as any[];

    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    for (const rel of relaciones) {
      const di = toLocalDate(rel.aluInicio);
      const df = toLocalDate(rel.aluFin);
      if (di && (!minDate || di < minDate)) minDate = di;
      if (df && (!maxDate || df > maxDate)) maxDate = df;
    }

    if (!minDate || !maxDate) return { meses: [], alumnos: [], datos: {} };

    const meses: string[] = [];
    const iter = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (iter <= maxDate) {
      meses.push(toLocalDateStr(iter));
      iter.setMonth(iter.getMonth() + 1);
    }

    const datos: Record<string, number> = {};

    for (const rel of relaciones) {
      const horario = safeParse(rel.horario, {});
      const diasSemana: string[] = [];
      for (const dia of ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']) {
        if (horario[dia]?.horas > 0) diasSemana.push(dia);
      }
      if (diasSemana.length === 0) continue;

      const diaMap: Record<string, number> = {
        lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0
      };
      const diasSet = new Set(diasSemana.map(d => diaMap[d]));

      const aluInicio = toLocalDate(rel.aluInicio) || minDate;
      const aluFin = toLocalDate(rel.aluFin) || maxDate;

      for (const mesKey of meses) {
        const [year, month] = mesKey.split('-').map(Number);
        const startM = new Date(year, month - 1, 1);
        const endM = new Date(year, month, 0);

        const start = startM < aluInicio ? aluInicio : startM;
        const end = endM > aluFin ? aluFin : endM;

        let dias = 0;
        const d = new Date(start);
        while (d <= end) {
          if (diasSet.has(d.getDay()) && !festivosSet.has(toLocalDateStr(d))) dias++;
          d.setDate(d.getDate() + 1);
        }

        const key = `${rel.alumnoId}_${mesKey}`;
        datos[key] = (datos[key] || 0) + dias;
      }
    }

    return { meses, alumnos, datos };
  }
};

