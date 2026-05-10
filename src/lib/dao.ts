import db, { initDB } from './db.ts';
import { Profesor, CentroEducativo, DetalleAcademico, Curso, Alumno, Empresa, TutorEmpresa, Convenio, InteresAlumnoEmpresa, RelacionAlumno, PlanFormativoEstado, SeguimientoEstado } from '../types/index.ts';

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
        db.pragma(`key='${password}'`);
        // Probamos si la clave es correcta
        db.prepare('SELECT count(*) FROM sqlite_master').get();
        sessionKeyApplied = true;
        initDB();
        
        return true;
    } catch (error) {
        return false; // Contraseña incorrecta
    }
};

// Función para cifrar o cambiar la contraseña (se usa en el Perfil)
export const encryptDatabase = (password: string) => {
    db.pragma(`rekey='${password}'`);
    sessionKeyApplied = true; // <--- Marcamos que ahora tiene clave
};

if (!isDatabaseLocked()) {
    initDB();
}

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
  getByRelacionId: (id: number) => db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').get(id) as Alumno[],
  create: (alumno: Alumno) => {
    const stmt = db.prepare('INSERT INTO alumnos (nombre, apellidos, dni, numSS, tlfn, emailEduca, emailPersonal, fechaNacimiento, cursoId, detalleAcademicoId, totalHorasFFE, fechaInicio, fechaFin, estadoPlanFormativo, estadoSeguimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(alumno.nombre, alumno.apellidos, alumno.dni, alumno.numSS, alumno.tlfn, alumno.emailEduca, alumno.emailPersonal, alumno.fechaNacimiento, alumno.cursoId, alumno.detalleAcademicoId || null, alumno.totalHorasFFE, alumno.fechaInicio, alumno.fechaFin);
    return info.lastInsertRowid;
  },
  update: (id: number, alumno: Alumno) => {
    const stmt = db.prepare('UPDATE alumnos SET nombre = ?, apellidos = ?, dni = ?, numSS = ?, tlfn = ?, emailEduca = ?, emailPersonal = ?, fechaNacimiento = ?, cursoId = ?, detalleAcademicoId = ?, totalHorasFFE = ?, fechaInicio = ?, fechaFin = ?, estadoPlanFormativo = ?, estadoSeguimiento = ? WHERE id = ?');
    stmt.run(alumno.nombre, alumno.apellidos, alumno.dni, alumno.numSS, alumno.tlfn, alumno.emailEduca, alumno.emailPersonal, alumno.fechaNacimiento, alumno.cursoId, alumno.detalleAcademicoId || null, alumno.totalHorasFFE, alumno.fechaInicio, alumno.fechaFin, alumno.estadoPlanFormativo, alumno.estadoSeguimiento, id);
  },
  updateEstadoPlanFormativo: (id: number, estadoPlanFormativo: PlanFormativoEstado) => {
    const stmt = db.prepare('UPDATE alumnos SET estadoPlanFormativo = ? WHERE id = ?');
    stmt.run(estadoPlanFormativo, id);
  },
  updateEstadoSeguimiento: (id: number, estadoSeguimiento: SeguimientoEstado) => {
    const stmt = db.prepare('UPDATE alumnos SET estadoSeguimiento = ? WHERE id = ?');
    stmt.run(estadoSeguimiento, id);
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
  getAll: (): RelacionAlumno[] => {
    const relaciones = db.prepare('SELECT * FROM relaciones').all() as any[];

    return relaciones.map(r => {
      // Obtenemos los alumnos asociados a esta relación específica
      const alumnosRelacionados = db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').all(r.id) as Alumno[];

      return {
        ...r,
        horario: safeParse(r.horario, {}),
        alumnos: alumnosRelacionados
      } as RelacionAlumno;
    });
  },
  getById: (id: number): RelacionAlumno | null => {
    const r = db.prepare('SELECT * FROM relaciones WHERE id = ?').get(id) as any;
    if (!r) return null;

    // Obtenemos los alumnos asociados a esta relación
    const alumnosRelacionados = db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').all(id) as Alumno[];

    return {
      ...r,
      horario: safeParse(r.horario, {}),
      alumnos: alumnosRelacionados
    } as RelacionAlumno;
  },

  getByConvenio: (convenioId: number): RelacionAlumno[] => {
    const relaciones = db.prepare('SELECT * FROM relaciones WHERE convenioId = ?').all(convenioId) as any[];

    return relaciones.map(r => {
      // Obtenemos los alumnos asociados a cada relación
      const alumnosRelacionados = db.prepare('SELECT * FROM alumnos WHERE relacionId = ?').all(r.id) as Alumno[];

      return {
        ...r,
        horario: safeParse(r.horario, {}),
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
          convenioId, tutorEmpresaId, numRelacion, horario, estado
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const info = stmtRel.run(
        rel.convenioId,
        rel.tutorEmpresaId,
        rel.numRelacion,
        JSON.stringify(rel.horario),
        rel.estado
      );

      const relacionId = info.lastInsertRowid as number;

      // 2. Actualizar cada alumno vinculado
      // Asumiendo que 'rel.alumnos' es el array de objetos Alumno que viene del frontal
      const stmtAlumno = db.prepare(`
        UPDATE alumnos SET 
          relacionId = ?, 
          fechaInicio = ?,
          fechaFin = ? 
        WHERE id = ?
      `);

      for (const alu of rel.alumnos) {
        // Aquí puedes restar las horas si totalHoras es lo que consumen en esta relación
        // O simplemente actualizar el campo si el frontal ya manda el valor final
        stmtAlumno.run(relacionId, alu.fechaInicio, alu.fechaFin, alu.id);
      }

      return relacionId;
    })();
  },

  update: (id: number, rel: RelacionAlumno) => {
    db.transaction(() => {
      // 1. Actualizar la tabla de relaciones
      const stmtRel = db.prepare(`
        UPDATE relaciones SET 
          convenioId = ?, tutorEmpresaId = ?, numRelacion = ?, 
          horario = ?, estado = ? 
        WHERE id = ?
      `);

      stmtRel.run(
        rel.convenioId, rel.tutorEmpresaId, rel.numRelacion,
        JSON.stringify(rel.horario), rel.estado, id
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
        // Aquí puedes restar las horas si totalHoras es lo que consumen en esta relación
        // O simplemente actualizar el campo si el frontal ya manda el valor final
        stmtAlumno.run(id, alu.fechaInicio, alu.fechaFin, alu.id);
      }
    })();
  },

  delete: (id: number) => {
    db.transaction(() => {
      // 1. Limpiamos la referencia en los alumnos antes de borrar la relación
      db.prepare('UPDATE alumnos SET relacionId = NULL, fechaInicio = NULL, fechaFin = NULL, estadoPlanFormativo = ?, estadoSeguimiento = ? WHERE relacionId = ?').run('PENDIENTE_ENVIAR_ESTUDIANTE', 'PENDIENTE', id);
      
      // 2. Borramos la relación
      db.prepare('DELETE FROM relaciones WHERE id = ?').run(id);
    })();
  },

  getRelacionAlumnoParaSeguimiento: (relacionId: number, alumnoId: number) => {
    // Como ya no hay tabla pivote, buscamos la info cruzando la relación y el alumno directamente
    const stmt = db.prepare(`
      SELECT 
        r.id AS relacionId,
        c.numConvenio,
        a.id AS alumnoId,
        a.nombre AS alumnoNombre,
        a.apellidos AS alumnoApellidos,
        a.emailEduca AS alumnoEmail,
        e.nombre AS empresaNombre,
        te.nombre AS tutorEmpresaNombre,
        te.apellidos AS tutorEmpresaApellidos,
        te.email AS tutorEmpresaEmail,
        t.nombre AS tutorCentroNombre,
        t.apellidos AS tutorCentroApellidos
      FROM relaciones r
      JOIN convenios c ON r.convenioId = c.id
      JOIN alumnos a ON a.relacionId = r.id
      JOIN empresas e ON c.empresaId = e.id
      JOIN tutores_empresa te ON r.tutorEmpresaId = te.id
      LEFT JOIN tutores t ON c.centroId = t.id -- Asegúrate de que esta relación tutor-centro es la correcta según tu esquema
      WHERE r.id = ? AND a.id = ?
  `);

    return stmt.get(relacionId, alumnoId);
  }
};




