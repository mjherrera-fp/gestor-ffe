import { db, unlockDB, lockDB } from './db.ts';
import { Profesor, CentroEducativo, DetalleAcademico, Curso, Alumno, Empresa, TutorEmpresa, EmpresaEstadistica, Convenio, InteresAlumnoEmpresa, RelacionAlumno, PlanFormativoEstado, SeguimientoEstado, ValoracionEstado, PanelResumenRow, SeguridadSocialData, Aviso, FFEValoracionFinal, FFEMotivoNoRealizacion, FFEEvaluacion, FFEResultadoRA, FFEInformeRow } from '../types/index.ts';
import { PlantillaCorreoDB, MarcadorPersonalizado, Contacto, GrupoContacto, GrupoMiembro, GrupoMiembroResolved } from '../types/email.ts';

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

export const AceptacionUsoDAO = {
  getAceptado: (): boolean => {
    const existing = db.prepare('SELECT id FROM profesores LIMIT 1').get() as { id: number } | undefined;
    if (!existing) return false;
    const row = db.prepare(
      "SELECT valor FROM configuracion WHERE profesorId = ? AND tipo = 'app' AND clave = 'aceptacion_uso'"
    ).get(existing.id) as { valor: string } | undefined;
    return !!row;
  },
  setAceptado: (profesorId: number): void => {
    db.prepare(
      "INSERT OR REPLACE INTO configuracion (profesorId, tipo, clave, valor) VALUES (?, 'app', 'aceptacion_uso', datetime('now'))"
    ).run(profesorId);
  },
  crearProfesorSiNoExiste: (): number => {
    const existing = db.prepare('SELECT id FROM profesores LIMIT 1').get() as { id: number } | undefined;
    if (existing) return existing.id;
    const info = db.prepare(
      "INSERT INTO profesores (nombre, apellidos, nif, email, telefono) VALUES ('', '', '', '', '')"
    ).run();
    return info.lastInsertRowid as number;
  },
};

interface PaginacionFiltros {
  page: number;
  limit: number;
  [key: string]: any;
}

function buildPaginacion(baseSql: string, countSql: string, params: any[], filtros: PaginacionFiltros): { sql: string; countParams: any[]; total: number; page: number; limit: number } {
  const countParams = [...params];
  const total = (db.prepare(countSql).get(...countParams) as { total: number }).total;
  const page = Math.max(1, filtros.page || 1);
  const limit = Math.min(200, Math.max(1, filtros.limit || 50));
  const offset = (page - 1) * limit;
  const sql = `${baseSql} LIMIT ? OFFSET ?`;
  return { sql, countParams, total, page, limit };
}

interface PaginacionResultado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const HistoricoDAO = {
  logComunicacion(para: string, cc: string, cco: string, asunto: string, cuerpo: string, ficheros: string[]): void {
    db.prepare(
      "INSERT INTO historico_comunicaciones (para, cc, cco, asunto, cuerpo, ficheros_adjuntos) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(para, cc, cco, asunto, cuerpo, JSON.stringify(ficheros));
  },

  logOperacionConvenio(tipo: string, convenioId?: number, referencia?: string): void {
    db.prepare(
      "INSERT INTO historico_operaciones_convenio (tipo_operacion, convenio_id, referencia) VALUES (?, ?, ?)"
    ).run(tipo, convenioId || null, referencia || null);
  },

  logOperacionRelacion(tipo: string, relacionId?: number, referencia?: string): void {
    db.prepare(
      "INSERT INTO historico_operaciones_relacion (tipo_operacion, relacion_id, referencia) VALUES (?, ?, ?)"
    ).run(tipo, relacionId || null, referencia || null);
  },

  logCambioEstado(tipoProceso: string, estadoOrigen: string, estadoDestino: string, entidadId?: number, referencia?: string): void {
    db.prepare(
      "INSERT INTO historico_cambios_estado (tipo_proceso, estado_origen, estado_destino, entidad_id, referencia) VALUES (?, ?, ?, ?, ?)"
    ).run(tipoProceso, estadoOrigen, estadoDestino, entidadId || null, referencia || null);
  },

  getEmailsContactados(): string[] {
    const rows = db.prepare("SELECT para, cc, cco FROM historico_comunicaciones").all() as { para: string; cc: string; cco: string }[];
    const emails = new Set<string>();
    for (const row of rows) {
      for (const field of [row.para, row.cc, row.cco]) {
        if (field) {
          field.split(',').map(e => e.trim().toLowerCase()).filter(Boolean).forEach(e => emails.add(e));
        }
      }
    }
    return [...emails];
  },

  getComunicaciones(filtros: PaginacionFiltros): PaginacionResultado<{
    id: number; para: string; cc: string; cco: string; fecha_hora: string;
    asunto: string; cuerpo: string; ficheros_adjuntos: string
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.destinatario) {
      conditions.push("(para LIKE ? OR cc LIKE ? OR cco LIKE ?)");
      const q = `%${filtros.destinatario}%`;
      params.push(q, q, q);
    }
    if (filtros.fechaDesde) {
      conditions.push("fecha_hora >= ?");
      params.push(filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      conditions.push("fecha_hora <= ?");
      params.push(filtros.fechaHasta + ' 23:59:59');
    }
    if (filtros.correo) {
      conditions.push("(asunto LIKE ? OR cuerpo LIKE ? OR ficheros_adjuntos LIKE ?)");
      const q = `%${filtros.correo}%`;
      params.push(q, q, q);
    }
    if (filtros.tieneAdjuntos !== undefined && filtros.tieneAdjuntos !== '') {
      if (filtros.tieneAdjuntos === 'true' || filtros.tieneAdjuntos === true) {
        conditions.push("ficheros_adjuntos IS NOT NULL AND ficheros_adjuntos != '[]'");
      } else {
        conditions.push("(ficheros_adjuntos IS NULL OR ficheros_adjuntos = '[]')");
      }
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `SELECT * FROM historico_comunicaciones${where} ORDER BY fecha_hora DESC`;
    const countSql = `SELECT count(*) as total FROM historico_comunicaciones${where}`;
    const { sql, countParams, total, page, limit } = buildPaginacion(baseSql, countSql, params, filtros);
    const data = db.prepare(sql).all(...countParams, limit, (page - 1) * limit) as any[];
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getOperacionesConvenio(filtros: PaginacionFiltros): PaginacionResultado<{
    id: number; tipo_operacion: string; fecha_hora: string; convenio_id: number; referencia: string
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.tipoOperacion) {
      conditions.push("tipo_operacion = ?");
      params.push(filtros.tipoOperacion);
    }
    if (filtros.fechaDesde) {
      conditions.push("fecha_hora >= ?");
      params.push(filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      conditions.push("fecha_hora <= ?");
      params.push(filtros.fechaHasta + ' 23:59:59');
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `SELECT * FROM historico_operaciones_convenio${where} ORDER BY fecha_hora DESC`;
    const countSql = `SELECT count(*) as total FROM historico_operaciones_convenio${where}`;
    const { sql, countParams, total, page, limit } = buildPaginacion(baseSql, countSql, params, filtros);
    const data = db.prepare(sql).all(...countParams, limit, (page - 1) * limit) as any[];
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getOperacionesRelacion(filtros: PaginacionFiltros): PaginacionResultado<{
    id: number; tipo_operacion: string; fecha_hora: string; relacion_id: number; referencia: string
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.tipoOperacion) {
      conditions.push("tipo_operacion = ?");
      params.push(filtros.tipoOperacion);
    }
    if (filtros.fechaDesde) {
      conditions.push("fecha_hora >= ?");
      params.push(filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      conditions.push("fecha_hora <= ?");
      params.push(filtros.fechaHasta + ' 23:59:59');
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `SELECT * FROM historico_operaciones_relacion${where} ORDER BY fecha_hora DESC`;
    const countSql = `SELECT count(*) as total FROM historico_operaciones_relacion${where}`;
    const { sql, countParams, total, page, limit } = buildPaginacion(baseSql, countSql, params, filtros);
    const data = db.prepare(sql).all(...countParams, limit, (page - 1) * limit) as any[];
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getCambiosEstado(filtros: PaginacionFiltros): PaginacionResultado<{
    id: number; tipo_proceso: string; fecha_hora: string;
    estado_origen: string; estado_destino: string; entidad_id: number; referencia: string
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.tipoProceso) {
      conditions.push("tipo_proceso = ?");
      params.push(filtros.tipoProceso);
    }
    if (filtros.fechaDesde) {
      conditions.push("fecha_hora >= ?");
      params.push(filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      conditions.push("fecha_hora <= ?");
      params.push(filtros.fechaHasta + ' 23:59:59');
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `SELECT * FROM historico_cambios_estado${where} ORDER BY fecha_hora DESC`;
    const countSql = `SELECT count(*) as total FROM historico_cambios_estado${where}`;
    const { sql, countParams, total, page, limit } = buildPaginacion(baseSql, countSql, params, filtros);
    const data = db.prepare(sql).all(...countParams, limit, (page - 1) * limit) as any[];
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};

export const CentroDAO = {
  getAllByProfesor: (profesorId: number) => (db.prepare('SELECT * FROM centros_educativos WHERE profesorId = ?').all(profesorId) as any[]).map(c => ({
    ...c,
    codigoCentro: c.codigo_centro,
    festivos: c.festivos ? JSON.parse(c.festivos) : []
  })) as CentroEducativo[],
  getById: (id: number) => {
    const c = db.prepare('SELECT * FROM centros_educativos WHERE id = ?').get(id) as any;
    if (!c) return undefined;
    return {
      ...c,
      codigoCentro: c.codigo_centro,
      festivos: c.festivos ? JSON.parse(c.festivos) : []
    } as CentroEducativo;
  },
  create: (centro: CentroEducativo) => {
    const stmt = db.prepare(`
      INSERT INTO centros_educativos (profesorId, nombre, ciudad, telefono, email, codigo_centro, festivos)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(centro.profesorId, centro.nombre, centro.ciudad, centro.telefono, centro.email, centro.codigoCentro || null, JSON.stringify(centro.festivos || []));
    return info.lastInsertRowid;
  },
  update: (id: number, centro: CentroEducativo) => {
    const stmt = db.prepare(`
      UPDATE centros_educativos SET 
        nombre = ?, ciudad = ?, telefono = ?, email = ?, codigo_centro = ?, festivos = ?
      WHERE id = ?
    `);
    stmt.run(centro.nombre, centro.ciudad, centro.telefono, centro.email, centro.codigoCentro || null, JSON.stringify(centro.festivos || []), id);
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
    resultadosAprendizaje: d.resultadosAprendizaje ? JSON.parse(d.resultadosAprendizaje) : [],
    tutorias: d.tutorias ? JSON.parse(d.tutorias) : []
  })),
  getAllByCentro: (centroId: number) => (db.prepare('SELECT * FROM detalles_academicos WHERE centroId = ?').all(centroId) as any[]).map(d => ({
    ...d,
    resultadosAprendizaje: d.resultadosAprendizaje ? JSON.parse(d.resultadosAprendizaje) : [],
    tutorias: d.tutorias ? JSON.parse(d.tutorias) : []
  })),
  getById: (id: number) => {
    const d = db.prepare('SELECT * FROM detalles_academicos WHERE id = ?').get(id) as any;
    if (!d) return undefined;
    return {
      ...d,
      resultadosAprendizaje: d.resultadosAprendizaje ? JSON.parse(d.resultadosAprendizaje) : [],
      tutorias: d.tutorias ? JSON.parse(d.tutorias) : []
    } as DetalleAcademico;
  },
  create: (detalle: DetalleAcademico) => {
    const stmt = db.prepare(`
      INSERT INTO detalles_academicos (centroId, ciclo, codigo, nivel, grado, regimen, codigoGrupo, nombreCorto, resultadosAprendizaje, tutorias)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(detalle.centroId, detalle.ciclo, detalle.codigo, detalle.nivel, detalle.grado, detalle.regimen, detalle.codigoGrupo, detalle.nombreCorto || null, JSON.stringify(detalle.resultadosAprendizaje || []), JSON.stringify(detalle.tutorias || []));
    return info.lastInsertRowid;
  },
  update: (id: number, detalle: DetalleAcademico) => {
    const stmt = db.prepare(`
      UPDATE detalles_academicos SET 
        ciclo = ?, codigo = ?, nivel = ?, grado = ?, regimen = ?, codigoGrupo = ?, nombreCorto = ?, resultadosAprendizaje = ?, tutorias = ?
      WHERE id = ?
    `);
    stmt.run(detalle.ciclo, detalle.codigo, detalle.nivel, detalle.grado, detalle.regimen, detalle.codigoGrupo, detalle.nombreCorto || null, JSON.stringify(detalle.resultadosAprendizaje || []), JSON.stringify(detalle.tutorias || []), id);
  },
  delete: (id: number) => db.prepare('DELETE FROM detalles_academicos WHERE id = ?').run(id)
};

export const CursoDAO = {
  getAll: () => db.prepare('SELECT * FROM cursos').all() as Curso[],
  getById: (id: number) => db.prepare('SELECT * FROM cursos WHERE id = ?').get(id) as Curso | undefined,
  create: (curso: Curso) => {
    const stmt = db.prepare('INSERT INTO cursos (descripcion, fechaInicio, fechaFin) VALUES (?, ?, ?)');
    const info = stmt.run(curso.descripcion, curso.fechaInicio, curso.fechaFin);
    return info.lastInsertRowid;
  },
  update: (id: number, curso: Curso) => {
    const stmt = db.prepare('UPDATE cursos SET descripcion = ?, fechaInicio = ?, fechaFin = ? WHERE id = ?');
    stmt.run(curso.descripcion, curso.fechaInicio, curso.fechaFin, id);
  },
  delete: (id: number) => {
    const delRelaciones = db.prepare('DELETE FROM relaciones WHERE convenioId IN (SELECT id FROM convenios WHERE cursoId = ?)');
    const delAlumnos = db.prepare('DELETE FROM alumnos WHERE cursoId = ?');
    const delFestivosEmpresa = db.prepare('DELETE FROM configuracion WHERE tipo = ?');
    const delCurso = db.prepare('DELETE FROM cursos WHERE id = ?');
    db.transaction(() => {
      delRelaciones.run(id);
      delAlumnos.run(id);
      delFestivosEmpresa.run('festivos_empresa');
      delCurso.run(id);
    })();
  },
};

export const AlumnoDAO = {
  getAll: (cursoId?: number, detalleAcademicoId?: number) => {
    const subqueries = `
      (SELECT COUNT(*) FROM intereses i WHERE i.alumnoId = a.id AND i.interesado = 'alumno') as cvEnvioCount,
      (SELECT COUNT(*) FROM intereses i WHERE i.alumnoId = a.id AND i.interesado = 'empresa') as empresasInteresadasCount,
      EXISTS(
        SELECT 1 FROM intereses i1
        JOIN intereses i2 ON i1.alumnoId = i2.alumnoId AND i1.empresaId = i2.empresaId
        WHERE i1.alumnoId = a.id AND i1.interesado = 'alumno' AND i2.interesado = 'empresa'
      ) as tieneMatch
    `;
    const base = `SELECT a.*, ${subqueries} FROM alumnos a`;
    if (cursoId && detalleAcademicoId) return db.prepare(`${base} WHERE a.cursoId = ? AND a.detalleAcademicoId = ?`).all(cursoId, detalleAcademicoId) as Alumno[];
    if (cursoId) return db.prepare(`${base} WHERE a.cursoId = ?`).all(cursoId) as Alumno[];
    if (detalleAcademicoId) return db.prepare(`${base} WHERE a.detalleAcademicoId = ?`).all(detalleAcademicoId) as Alumno[];
    return db.prepare(base).all() as Alumno[];
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
  updateCV: (id: number, cvPath: string | null) => db.prepare('UPDATE alumnos SET cvPath = ? WHERE id = ?').run(cvPath, id),
  findByDNIEmailPhone: (dni: string, emailEduca: string, emailPersonal: string, tlfn: string, excludeId?: number) => {
    const stmt = db.prepare(`
      SELECT id, nombre, apellidos, dni, emailEduca, emailPersonal, tlfn FROM alumnos
      WHERE (dni = ? OR emailEduca = ? OR emailPersonal = ? OR tlfn = ?)
      ${excludeId ? 'AND id != ?' : ''}
    `);
    const params = [dni, emailEduca, emailPersonal, tlfn];
    if (excludeId) params.push(String(excludeId));
    return stmt.all(...params) as { id: number; nombre: string; apellidos: string; dni: string; emailEduca: string; emailPersonal: string; tlfn: string }[];
  }
};

export const EmailContactsDAO = {
  getAll: () => {
    const empresas = db.prepare('SELECT id, nombre, email FROM empresas').all() as { id: number; nombre: string; email: string }[];
    const tutores = db.prepare(`
      SELECT t.id, t.nombre, t.apellidos, t.email, e.nombre as empresaNombre
      FROM empresa_tutores t JOIN empresas e ON e.id = t.empresaId
    `).all() as { id: number; nombre: string; apellidos: string; email: string; empresaNombre: string }[];
    const alumnos = db.prepare('SELECT id, nombre, apellidos, emailEduca, emailPersonal FROM alumnos').all() as { id: number; nombre: string; apellidos: string; emailEduca: string; emailPersonal: string }[];
    const contactos = db.prepare('SELECT id, nombre, email, telefono FROM contactos ORDER BY nombre ASC').all() as Contacto[];
    const grupos = GrupoContactoDAO.getAllConMiembros();
    return { empresas, tutores, alumnos, contactos, grupos };
  },
};

export const ContactoDAO = {
  getAll: (): Contacto[] => {
    return db.prepare('SELECT * FROM contactos ORDER BY nombre ASC').all() as Contacto[];
  },
  getById: (id: number): Contacto | undefined => {
    return db.prepare('SELECT * FROM contactos WHERE id = ?').get(id) as Contacto | undefined;
  },
  create: (data: Omit<Contacto, 'id'>) => {
    const stmt = db.prepare('INSERT INTO contactos (nombre, email, telefono) VALUES (?, ?, ?)');
    const info = stmt.run(data.nombre, data.email, data.telefono);
    return info.lastInsertRowid;
  },
  update: (id: number, data: Partial<Contacto>) => {
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      params.push(value);
    }
    if (fields.length === 0) return;
    params.push(id);
    db.prepare(`UPDATE contactos SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  },
  delete: (id: number) => {
    db.prepare('DELETE FROM contactos WHERE id = ?').run(id);
  },
};

export const GrupoContactoDAO = {
  getAll: (): GrupoContacto[] => {
    return db.prepare('SELECT * FROM grupos_contactos ORDER BY nombre ASC').all() as GrupoContacto[];
  },
  getById: (id: number): GrupoContacto | undefined => {
    return db.prepare('SELECT * FROM grupos_contactos WHERE id = ?').get(id) as GrupoContacto | undefined;
  },
  resolveMiembros: (grupoId: number): GrupoMiembroResolved[] => {
    const miembros = db.prepare('SELECT * FROM grupo_miembros WHERE grupoId = ?').all(grupoId) as GrupoMiembro[];
    const resolved: GrupoMiembroResolved[] = [];
    for (const m of miembros) {
      let nombre = '';
      let email = '';
      if (m.tipoOrigen === 'contacto') {
        const c = db.prepare('SELECT nombre, email FROM contactos WHERE id = ?').get(m.origenId) as { nombre: string; email: string } | undefined;
        if (c) { nombre = c.nombre; email = c.email; }
      } else if (m.tipoOrigen === 'empresa') {
        const e = db.prepare('SELECT nombre, email FROM empresas WHERE id = ?').get(m.origenId) as { nombre: string; email: string } | undefined;
        if (e) { nombre = e.nombre; email = e.email; }
      } else if (m.tipoOrigen === 'estudiante') {
        const a = db.prepare('SELECT nombre, apellidos, emailEduca, emailPersonal FROM alumnos WHERE id = ?').get(m.origenId) as { nombre: string; apellidos: string; emailEduca: string; emailPersonal: string } | undefined;
        if (a) { nombre = `${a.nombre} ${a.apellidos}`; email = a.emailEduca || a.emailPersonal || ''; }
      } else if (m.tipoOrigen === 'tutor') {
        const t = db.prepare('SELECT nombre, apellidos, email FROM empresa_tutores WHERE id = ?').get(m.origenId) as { nombre: string; apellidos: string; email: string } | undefined;
        if (t) { nombre = `${t.nombre} ${t.apellidos}`; email = t.email; }
      }
      if (email) {
        resolved.push({ ...m, nombre, email });
      }
    }
    return resolved;
  },
  getAllConMiembros: (): GrupoContacto[] => {
    const grupos = GrupoContactoDAO.getAll();
    for (const g of grupos) {
      g.miembros = GrupoContactoDAO.resolveMiembros(g.id);
    }
    return grupos;
  },
  create: (data: { nombre: string; miembros: Array<{ tipoOrigen: string; origenId: number }> }) => {
    const stmt = db.prepare('INSERT INTO grupos_contactos (nombre) VALUES (?)');
    const info = stmt.run(data.nombre);
    const grupoId = info.lastInsertRowid;
    const insertMiembro = db.prepare('INSERT INTO grupo_miembros (grupoId, tipoOrigen, origenId) VALUES (?, ?, ?)');
    for (const m of data.miembros) {
      insertMiembro.run(grupoId, m.tipoOrigen, m.origenId);
    }
    return grupoId;
  },
  update: (id: number, data: { nombre?: string; miembros?: Array<{ tipoOrigen: string; origenId: number }> }) => {
    if (data.nombre !== undefined) {
      db.prepare('UPDATE grupos_contactos SET nombre = ? WHERE id = ?').run(data.nombre, id);
    }
    if (data.miembros !== undefined) {
      db.prepare('DELETE FROM grupo_miembros WHERE grupoId = ?').run(id);
      const insertMiembro = db.prepare('INSERT INTO grupo_miembros (grupoId, tipoOrigen, origenId) VALUES (?, ?, ?)');
      for (const m of data.miembros) {
        insertMiembro.run(id, m.tipoOrigen, m.origenId);
      }
    }
  },
  delete: (id: number) => {
    db.prepare('DELETE FROM grupo_miembros WHERE grupoId = ?').run(id);
    db.prepare('DELETE FROM grupos_contactos WHERE id = ?').run(id);
  },
};

export const EmpresaDAO = {
  getAll: () => db.prepare('SELECT * FROM empresas').all() as Empresa[],
  getById: (id: number) => db.prepare('SELECT * FROM empresas WHERE id = ?').get(id) as Empresa,
  create: (empresa: Empresa) => {
    const stmt = db.prepare('INSERT INTO empresas (nombre, direccion, ciudad, cif, email, tlfn, comentarios, personaContacto, comunidad, provincia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(empresa.nombre, empresa.direccion, empresa.ciudad, empresa.cif, empresa.email, empresa.tlfn, empresa.comentarios ?? null, empresa.personaContacto ?? null, empresa.comunidad ?? null, empresa.provincia ?? null);
    return info.lastInsertRowid;
  },
  update: (id: number, empresa: Empresa) => {
    const stmt = db.prepare('UPDATE empresas SET nombre = ?, direccion = ?, ciudad = ?, cif = ?, email = ?, tlfn = ?, comentarios = ?, personaContacto = ?, comunidad = ?, provincia = ? WHERE id = ?');
    stmt.run(empresa.nombre, empresa.direccion, empresa.ciudad, empresa.cif, empresa.email, empresa.tlfn, empresa.comentarios ?? null, empresa.personaContacto ?? null, empresa.comunidad ?? null, empresa.provincia ?? null, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM empresas WHERE id = ?').run(id),
  getLocalidadesConRelaciones: (): string[] => {
    const rows = db.prepare(`
      SELECT DISTINCT e.ciudad FROM empresas e
      JOIN convenios c ON e.id = c.empresaId
      JOIN relaciones r ON c.id = r.convenioId
      JOIN alumnos a ON a.relacionId = r.id
      WHERE e.ciudad IS NOT NULL AND e.ciudad != ''
      ORDER BY e.ciudad
    `).all() as { ciudad: string }[];
    return rows.map(r => r.ciudad);
  }
};

export const EmpresaFestivosDAO = {
  getAll: (profesorId: number): Record<string, string[]> => {
    const rows = db.prepare('SELECT clave, valor FROM configuracion WHERE profesorId = ? AND tipo = ?').all(profesorId, 'festivos_empresa') as { clave: string; valor: string }[];
    const result: Record<string, string[]> = {};
    for (const row of rows) {
      result[row.clave] = safeParse(row.valor, []);
    }
    return result;
  },
  getByCiudad: (profesorId: number, ciudad: string): string[] => {
    const row = db.prepare('SELECT valor FROM configuracion WHERE profesorId = ? AND tipo = ? AND clave = ?').get(profesorId, 'festivos_empresa', ciudad) as { valor: string } | undefined;
    return row ? safeParse(row.valor, []) : [];
  },
  setByCiudad: (profesorId: number, ciudad: string, festivos: string[]) => {
    const existing = db.prepare('SELECT id FROM configuracion WHERE profesorId = ? AND tipo = ? AND clave = ?').get(profesorId, 'festivos_empresa', ciudad) as any;
    if (existing) {
      db.prepare('UPDATE configuracion SET valor = ? WHERE id = ?').run(JSON.stringify(festivos), existing.id);
    } else {
      db.prepare('INSERT INTO configuracion (profesorId, tipo, clave, valor) VALUES (?, ?, ?, ?)').run(profesorId, 'festivos_empresa', ciudad, JSON.stringify(festivos));
    }
  },
  deleteByCiudad: (profesorId: number, ciudad: string) => {
    db.prepare('DELETE FROM configuracion WHERE profesorId = ? AND tipo = ? AND clave = ?').run(profesorId, 'festivos_empresa', ciudad);
  },
};

export const TutorEmpresaDAO = {
  getAllByEmpresa: (empresaId: number) => db.prepare('SELECT * FROM empresa_tutores WHERE empresaId = ?').all(empresaId) as TutorEmpresa[],
  getById: (id: number) => db.prepare('SELECT * FROM empresa_tutores WHERE id = ?').get(id) as TutorEmpresa,
  create: (tutor: TutorEmpresa) => {
    const stmt = db.prepare('INSERT INTO empresa_tutores (empresaId, nombre, apellidos, nif, email, tlfn) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(tutor.empresaId, tutor.nombre, tutor.apellidos, tutor.nif, tutor.email, tutor.tlfn);
    return info.lastInsertRowid;
  },
  update: (id: number, tutor: TutorEmpresa) => {
    const stmt = db.prepare('UPDATE empresa_tutores SET nombre = ?, apellidos = ?, nif = ?, email = ?, tlfn = ? WHERE id = ?');
    stmt.run(tutor.nombre, tutor.apellidos, tutor.nif, tutor.email, tutor.tlfn, id);
  },
  delete: (id: number) => db.prepare('DELETE FROM empresa_tutores WHERE id = ?').run(id)
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
    let query = "SELECT c.*, e.nombre as empresaNombre, e.ciudad as empresaCiudad, ce.nombre as centroNombre FROM convenios c JOIN empresas e ON c.empresaId = e.id LEFT JOIN centros_educativos ce ON c.centroId = ce.id";
    const params: any[] = [];
    const conditions: string[] = [];
    if (cursoId) { conditions.push('c.cursoId = ?'); params.push(cursoId); }
    if (centroId) { conditions.push('c.centroId = ?'); params.push(centroId); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    return db.prepare(query).all(...params) as (Convenio & { empresaNombre: string, empresaCiudad?: string, centroNombre?: string })[];
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
  delete: (id: number) => db.prepare('DELETE FROM convenios WHERE id = ?').run(id),
  getEmpresaIdsConConvenio: (): number[] => {
    return (db.prepare('SELECT DISTINCT empresaId FROM convenios').all() as { empresaId: number }[]).map(r => r.empresaId);
  },
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

    // Leer configuración de festivos
    const profesor = ProfesorDAO.get();
    let usarFestivos = true;
    let usarFestivosEmpresa = false;
    if (profesor?.id) {
      const config = ConfiguracionDAO.getConfig(profesor.id, 'festivos');
      usarFestivos = config.usar_festivos !== '0';
      usarFestivosEmpresa = config.usar_festivos_empresa === '1';
    }

    const alumnos = db.prepare(
      `SELECT id, nombre, apellidos, fechaInicio, fechaFin FROM alumnos a WHERE a.cursoId = ? ${filtroAlumno}`
    ).all(...paramsAlumno) as { id: number; nombre: string; apellidos: string; fechaInicio: string | null; fechaFin: string | null }[];

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
      SELECT r.id, r.horario, r.convenioId, a.id as alumnoId, a.fechaInicio as aluInicio, a.fechaFin as aluFin
      FROM relaciones r
      JOIN alumnos a ON a.relacionId = r.id
      WHERE a.cursoId = ? ${filtroAlumno}
    `).all(...paramsAlumno) as any[];

    // Build per-centro festivos map
    const convenioIds = [...new Set(relaciones.map(r => r.convenioId))];
    const centroFestivosMap: Record<number, Set<string>> = {};
    for (const convId of convenioIds) {
      const conv = db.prepare('SELECT centroId FROM convenios WHERE id = ?').get(convId) as any;
      if (conv?.centroId && !centroFestivosMap[conv.centroId]) {
        const centro = db.prepare('SELECT festivos FROM centros_educativos WHERE id = ?').get(conv.centroId) as any;
        const festivos: string[] = centro?.festivos ? JSON.parse(centro.festivos) : [];
        centroFestivosMap[conv.centroId] = new Set(festivos);
      }
    }
    // Map relacionId → centroId
    const relCentroMap: Record<number, number> = {};
    for (const r of relaciones) {
      const conv = db.prepare('SELECT centroId FROM convenios WHERE id = ?').get(r.convenioId) as any;
      if (conv) relCentroMap[r.id] = conv.centroId;
    }

    // Build empresa festivos map (por ciudad)
    const empresaFestivosByCiudad: Record<string, Set<string>> = {};
    if (usarFestivosEmpresa && profesor?.id) {
      const empresaFestivosRaw = EmpresaFestivosDAO.getAll(profesor.id);
      for (const [ciudad, fechas] of Object.entries(empresaFestivosRaw)) {
        empresaFestivosByCiudad[ciudad] = new Set(fechas);
      }
    }
    // Map relacionId → empresa ciudad
    const relEmpresaCiudadMap: Record<number, string> = {};
    for (const r of relaciones) {
      const conv = db.prepare('SELECT empresaId FROM convenios WHERE id = ?').get(r.convenioId) as any;
      if (conv) {
        const empresa = db.prepare('SELECT ciudad FROM empresas WHERE id = ?').get(conv.empresaId) as any;
        if (empresa?.ciudad) relEmpresaCiudadMap[r.id] = empresa.ciudad;
      }
    }

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

      const centroId = relCentroMap[rel.id];
      const festivosSkip = new Set(centroFestivosMap[centroId] || []);
      const empCiudad = relEmpresaCiudadMap[rel.id];
      const empFestivosSet = empCiudad ? empresaFestivosByCiudad[empCiudad] : undefined;
      if (empFestivosSet) {
        for (const f of empFestivosSet) festivosSkip.add(f);
      }

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
          const esFestivo = festivosSkip.has(toLocalDateStr(d));
          const skipCentro = usarFestivos && centroFestivosMap[centroId]?.has(toLocalDateStr(d));
          const skipEmpresa = usarFestivosEmpresa && empFestivosSet?.has(toLocalDateStr(d));
          if (diasSet.has(d.getDay()) && !skipCentro && !skipEmpresa) dias++;
          d.setDate(d.getDate() + 1);
        }

        const key = `${rel.alumnoId}_${mesKey}`;
        datos[key] = (datos[key] || 0) + dias;
      }
    }

    return { meses, alumnos, datos };
  }
};

export const PlantillaCorreoDAO = {
  getAll: (place?: string): PlantillaCorreoDB[] => {
    let sql = 'SELECT * FROM plantillas_correo';
    const params: any[] = [];
    if (place) {
      sql += ' WHERE (place = ? OR place = ?)';
      params.push(place, '');
    }
    sql += ' ORDER BY tipo DESC, id ASC';
    return db.prepare(sql).all(...params) as PlantillaCorreoDB[];
  },
  getById: (id: number): PlantillaCorreoDB | undefined => {
    return db.prepare('SELECT * FROM plantillas_correo WHERE id = ?').get(id) as PlantillaCorreoDB | undefined;
  },
  getByPlantillaId: (plantillaId: string): PlantillaCorreoDB | undefined => {
    return db.prepare('SELECT * FROM plantillas_correo WHERE plantillaId = ?').get(plantillaId) as PlantillaCorreoDB | undefined;
  },
  create: (data: Omit<PlantillaCorreoDB, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO plantillas_correo (plantillaId, name, description, subject, body, documents, recipientTarget, icon, color, place, tipo, grupo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(data.plantillaId, data.name, data.description, data.subject, data.body, data.documents, data.recipientTarget, data.icon, data.color, data.place, data.tipo, data.grupo || '');
    return info.lastInsertRowid;
  },
  update: (id: number, data: Partial<PlantillaCorreoDB>) => {
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      params.push(value);
    }
    if (fields.length === 0) return;
    params.push(id);
    db.prepare(`UPDATE plantillas_correo SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  },
  delete: (id: number) => {
    db.prepare('DELETE FROM plantillas_correo WHERE id = ? AND tipo = ?').run(id, 'personal');
  },
  count: (): number => {
    const row = db.prepare('SELECT COUNT(*) as count FROM plantillas_correo').get() as any;
    return row.count;
  },
};

export const MarcadorPersonalizadoDAO = {
  getAll: (): MarcadorPersonalizado[] => {
    return db.prepare('SELECT * FROM marcadores_personalizados ORDER BY nombre ASC').all() as MarcadorPersonalizado[];
  },
  getById: (id: number): MarcadorPersonalizado | undefined => {
    return db.prepare('SELECT * FROM marcadores_personalizados WHERE id = ?').get(id) as MarcadorPersonalizado | undefined;
  },
  create: (data: Omit<MarcadorPersonalizado, 'id'>) => {
    const stmt = db.prepare('INSERT INTO marcadores_personalizados (nombre, valor, descripcion) VALUES (?, ?, ?)');
    const info = stmt.run(data.nombre, data.valor, data.descripcion);
    return info.lastInsertRowid;
  },
  update: (id: number, data: Partial<MarcadorPersonalizado>) => {
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      params.push(value);
    }
    if (fields.length === 0) return;
    params.push(id);
    db.prepare(`UPDATE marcadores_personalizados SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  },
  delete: (id: number) => {
    db.prepare('DELETE FROM marcadores_personalizados WHERE id = ?').run(id);
  },
};

export const AvisosDAO = {
  getActivos: (): Aviso[] => {
    return db.prepare("SELECT * FROM avisos WHERE estado IN ('pendiente', 'pospuesto') ORDER BY created_at DESC").all() as Aviso[];
  },

  getPendientes: (): Aviso[] => {
    return db.prepare("SELECT * FROM avisos WHERE estado = 'pendiente' ORDER BY created_at DESC").all() as Aviso[];
  },

  getPospuestos: (): Aviso[] => {
    return db.prepare("SELECT * FROM avisos WHERE estado = 'pospuesto' ORDER BY created_at DESC").all() as Aviso[];
  },

  crear: (data: { fecha_aviso: string; asunto: string; descripcion: string; origen?: string; alumno_id?: number | null; tipo_aviso?: string | null }): number => {
    const stmt = db.prepare(`
      INSERT INTO avisos (fecha_aviso, asunto, descripcion, origen, estado, alumno_id, tipo_aviso)
      VALUES (?, ?, ?, ?, 'pendiente', ?, ?)
    `);
    const info = stmt.run(data.fecha_aviso, data.asunto, data.descripcion, data.origen || 'automatico', data.alumno_id ?? null, data.tipo_aviso ?? null);
    return Number(info.lastInsertRowid);
  },

  descartar: (id: number): void => {
    db.prepare("UPDATE avisos SET estado = 'descartado', pospuesto_en = NULL WHERE id = ?").run(id);
  },

  posponer: (id: number): void => {
    db.prepare("UPDATE avisos SET estado = 'pospuesto', pospuesto_en = datetime('now') WHERE id = ?").run(id);
  },

  reactivarVencidos: (): void => {
    db.prepare("UPDATE avisos SET estado = 'pendiente', pospuesto_en = NULL WHERE estado = 'pospuesto' AND pospuesto_en IS NOT NULL AND datetime(pospuesto_en) < datetime('now', '-24 hours')").run();
  },

  existeAutomatico: (alumnoId: number, tipoAviso: string): boolean => {
    const row = db.prepare("SELECT 1 FROM avisos WHERE origen = 'automatico' AND alumno_id = ? AND tipo_aviso = ? LIMIT 1").get(alumnoId, tipoAviso);
    return !!row;
  },

  generarAutomaticos: (profesorId: number): Aviso[] => {
    // 1. Reactivar pospuestos vencidos (>24h)
    AvisosDAO.reactivarVencidos();

    // 2. Penderizar pospuestos automáticos (reaparecen al arrancar)
    db.prepare("UPDATE avisos SET estado = 'pendiente', pospuesto_en = NULL WHERE origen = 'automatico' AND estado = 'pospuesto'").run();

    // 3. Obtener config
    const config = ConfiguracionDAO.getConfig(profesorId, 'avisos');
    const semanasInicio = parseInt(config.semanas_inicio || '1');
    const semanasInicioDocs = parseInt(config.semanas_inicio_documentos || '2');
    const semanasFin = parseInt(config.semanas_fin || '1');

    // 4. Obtener alumnos con fechaInicio y fechaFin
    const alumnos = db.prepare(`
      SELECT id, nombre, apellidos, fechaInicio, fechaFin,
             estadoPlanFormativo, estadoSeguimiento, estadoValoracion
      FROM alumnos
      WHERE fechaInicio IS NOT NULL AND fechaFin IS NOT NULL
    `).all() as any[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const alu of alumnos) {
      const fechaInicio = new Date(alu.fechaInicio + 'T00:00:00');
      const fechaFin = new Date(alu.fechaFin + 'T00:00:00');
      const diffInicioMs = today.getTime() - fechaInicio.getTime();
      const diffFinMs = fechaFin.getTime() - today.getTime();
      const diasDesdeInicio = Math.floor(diffInicioMs / (1000 * 60 * 60 * 24));
      const diasHastaFin = Math.floor(diffFinMs / (1000 * 60 * 60 * 24));

      const nombreCompleto = `${alu.nombre} ${alu.apellidos}`;

      // Alumnos a X semanas de empezar
      if (diasDesdeInicio >= semanasInicio * 7 && !AvisosDAO.existeAutomatico(alu.id, 'inicio')) {
        AvisosDAO.crear({
          fecha_aviso: today.toISOString().split('T')[0],
          asunto: `Alumno a ${semanasInicio} semana(s) de empezar`,
          descripcion: `${nombreCompleto} - Inició las prácticas el ${alu.fechaInicio}`,
          origen: 'automatico',
          alumno_id: alu.id,
          tipo_aviso: 'inicio',
        });
      }

      // Alumnos a X semanas de empezar con documentos no finalizados
      const tieneDocsPendientes = alu.estadoPlanFormativo !== 'COMPLETADO'
        || alu.estadoSeguimiento !== 'RECIBIDO'
        || alu.estadoValoracion !== 'RECIBIDO';

      if (diasDesdeInicio >= semanasInicioDocs * 7 && tieneDocsPendientes && !AvisosDAO.existeAutomatico(alu.id, 'inicio_documentos')) {
        AvisosDAO.crear({
          fecha_aviso: today.toISOString().split('T')[0],
          asunto: `Documentos pendientes a ${semanasInicioDocs} semana(s) de empezar`,
          descripcion: `${nombreCompleto} - Tiene documentos sin finalizar (Plan Formativo: ${alu.estadoPlanFormativo}, Seguimiento: ${alu.estadoSeguimiento}, Valoración: ${alu.estadoValoracion})`,
          origen: 'automatico',
          alumno_id: alu.id,
          tipo_aviso: 'inicio_documentos',
        });
      }

      // Alumnos a X semanas de terminar
      if (diasHastaFin >= semanasFin * 7 && diasHastaFin > 0 && !AvisosDAO.existeAutomatico(alu.id, 'fin')) {
        AvisosDAO.crear({
          fecha_aviso: today.toISOString().split('T')[0],
          asunto: `Alumno a ${semanasFin} semana(s) de terminar`,
          descripcion: `${nombreCompleto} - Finaliza las prácticas el ${alu.fechaFin}`,
          origen: 'automatico',
          alumno_id: alu.id,
          tipo_aviso: 'fin',
        });
      }
    }

    return AvisosDAO.getActivos();
  },
};

// ─────────────────────────────────────────
//  FFE - VALORACIONES FINALES
// ─────────────────────────────────────────

export const FFEValoracionFinalDAO = {
  getAll: (): FFEValoracionFinal[] => {
    return db.prepare('SELECT * FROM ffe_valoraciones_final ORDER BY orden ASC').all() as FFEValoracionFinal[];
  },
  create: (data: { codigo: string; valor: string; orden: number }): number => {
    const info = db.prepare('INSERT INTO ffe_valoraciones_final (codigo, valor, orden) VALUES (?, ?, ?)').run(data.codigo, data.valor, data.orden);
    return Number(info.lastInsertRowid);
  },
  update: (id: number, data: { codigo: string; valor: string; orden: number }): void => {
    db.prepare('UPDATE ffe_valoraciones_final SET codigo = ?, valor = ?, orden = ? WHERE id = ?').run(data.codigo, data.valor, data.orden, id);
  },
  delete: (id: number): void => {
    db.prepare('DELETE FROM ffe_valoraciones_final WHERE id = ?').run(id);
  },
};

// ─────────────────────────────────────────
//  FFE - MOTIVOS NO REALIZACIÓN
// ─────────────────────────────────────────

export const FFEMotivoNoRealizacionDAO = {
  getAll: (): FFEMotivoNoRealizacion[] => {
    return db.prepare('SELECT * FROM ffe_motivos_no_realizacion ORDER BY orden ASC').all() as FFEMotivoNoRealizacion[];
  },
  create: (data: { codigo: string; valor: string; orden: number }): number => {
    const info = db.prepare('INSERT INTO ffe_motivos_no_realizacion (codigo, valor, orden) VALUES (?, ?, ?)').run(data.codigo, data.valor, data.orden);
    return Number(info.lastInsertRowid);
  },
  update: (id: number, data: { codigo: string; valor: string; orden: number }): void => {
    db.prepare('UPDATE ffe_motivos_no_realizacion SET codigo = ?, valor = ?, orden = ? WHERE id = ?').run(data.codigo, data.valor, data.orden, id);
  },
  delete: (id: number): void => {
    db.prepare('DELETE FROM ffe_motivos_no_realizacion WHERE id = ?').run(id);
  },
};

// ─────────────────────────────────────────
//  FFE - EVALUACIONES
// ─────────────────────────────────────────

export const FFEEvaluacionDAO = {
  getByAlumno: (alumnoId: number): FFEEvaluacion | undefined => {
    return db.prepare('SELECT * FROM ffe_evaluaciones WHERE alumnoId = ?').get(alumnoId) as FFEEvaluacion | undefined;
  },
  getByAlumnoAndRelacion: (alumnoId: number, relacionId: number): FFEEvaluacion | undefined => {
    return db.prepare('SELECT * FROM ffe_evaluaciones WHERE alumnoId = ? AND relacionId = ?').get(alumnoId, relacionId) as FFEEvaluacion | undefined;
  },
  upsert: (alumnoId: number, relacionId: number | null, fechaEvaluacion: string | null, valoracionFinalId: number | null, motivoNoRealizacionId: number | null): void => {
    const existing = db.prepare('SELECT id FROM ffe_evaluaciones WHERE alumnoId = ? AND relacionId IS ?').get(alumnoId, relacionId ?? null) as { id: number } | undefined;
    if (existing) {
      db.prepare('UPDATE ffe_evaluaciones SET fechaEvaluacion = ?, valoracionFinalId = ?, motivoNoRealizacionId = ? WHERE id = ?').run(fechaEvaluacion, valoracionFinalId, motivoNoRealizacionId, existing.id);
    } else {
      db.prepare('INSERT INTO ffe_evaluaciones (alumnoId, relacionId, fechaEvaluacion, valoracionFinalId, motivoNoRealizacionId) VALUES (?, ?, ?, ?, ?)').run(alumnoId, relacionId, fechaEvaluacion, valoracionFinalId, motivoNoRealizacionId);
    }
  },
};

// ─────────────────────────────────────────
//  FFE - RA RESULTADOS
// ─────────────────────────────────────────

export const FFEResultadoRADAO = {
  getByAlumnoAndRelacion: (alumnoId: number, relacionId: number): FFEResultadoRA[] => {
    return db.prepare('SELECT * FROM ffe_ra_resultados WHERE alumnoId = ? AND relacionId = ?').all(alumnoId, relacionId) as FFEResultadoRA[];
  },
  batchSave: (alumnoId: number, relacionId: number, entries: Array<{ modulo: string; codigoRa: string; nombreRa: string; aprobado: boolean }>): void => {
    const del = db.prepare('DELETE FROM ffe_ra_resultados WHERE alumnoId = ? AND relacionId = ?');
    const ins = db.prepare('INSERT INTO ffe_ra_resultados (alumnoId, relacionId, modulo, codigoRa, nombreRa, aprobado) VALUES (?, ?, ?, ?, ?, ?)');
    const tx = db.transaction(() => {
      del.run(alumnoId, relacionId);
      for (const e of entries) {
        ins.run(alumnoId, relacionId, e.modulo, e.codigoRa, e.nombreRa, e.aprobado ? 1 : 0);
      }
    });
    tx();
  },
};

// ─────────────────────────────────────────
//  FFE - INFORME DE VALORACIÓN
// ─────────────────────────────────────────

export const FFEInformeDAO = {
  getInforme: (cursoId: number, fechaEvaluacion: string, detalleAcademicoId?: number): FFEInformeRow[] => {
    const evalDate = fechaEvaluacion ? new Date(fechaEvaluacion) : new Date();
    const rows = db.prepare(`
      SELECT
        a.id as alumnoId,
        a.nombre,
        a.apellidos,
        COALESCE(da.nivel, '') as nivel,
        a.totalHorasFFE,
        a.fechaInicio,
        a.fechaFin,
        a.relacionId
      FROM alumnos a
      LEFT JOIN detalles_academicos da ON da.id = a.detalleAcademicoId
      WHERE a.cursoId = ?
      ${detalleAcademicoId ? 'AND a.detalleAcademicoId = ?' : ''}
      ORDER BY a.apellidos ASC, a.nombre ASC
    `).all(cursoId, ...(detalleAcademicoId ? [detalleAcademicoId] : [])) as any[];

    return rows.map(r => {
      let resultadoFFE: string;
      let notaFinal: string;

      // Calculate horasRealizadas up to evalDate
      let horasRealizadas = 0;
      const total = Number(r.totalHorasFFE) || 0;
      const startDate = r.fechaInicio ? new Date(r.fechaInicio) : null;
      const endDate = r.fechaFin ? new Date(r.fechaFin) : null;

      if (startDate && endDate && endDate > startDate && total > 0) {
        const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        let daysElapsed = 0;
        if (evalDate > startDate) {
          daysElapsed = Math.min(
            (evalDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            totalDays
          );
        }
        const progress = daysElapsed / totalDays;
        const hoursInLevel = Math.round(total * progress);
        const isSecondYear = r.nivel === '2º';
        if (isSecondYear) {
          // 2nd year: total must sum to 500h; (500 - total) were done in 1st year
          const firstYearHours = Math.max(0, 500 - total);
          horasRealizadas = firstYearHours + hoursInLevel;
        } else {
          horasRealizadas = hoursInLevel;
        }
      } else {
        horasRealizadas = 0;
      }

      const evaluacion = db.prepare('SELECT * FROM ffe_evaluaciones WHERE alumnoId = ?').get(r.alumnoId) as FFEEvaluacion | undefined;

      if (evaluacion?.motivoNoRealizacionId) {
        const motivo = db.prepare('SELECT codigo FROM ffe_motivos_no_realizacion WHERE id = ?').get(evaluacion.motivoNoRealizacionId) as { codigo: string } | undefined;
        resultadoFFE = 'FFE No cursada';
        notaFinal = motivo?.codigo || '';
      } else if (r.relacionId) {
        const raResults = db.prepare('SELECT * FROM ffe_ra_resultados WHERE alumnoId = ? AND relacionId = ?').all(r.alumnoId, r.relacionId) as FFEResultadoRA[];
        const pendingRAs = raResults.filter(ra => !ra.aprobado);
        if (pendingRAs.length > 0) {
          const byModule = new Map<string, string[]>();
          for (const ra of pendingRAs) {
            const list = byModule.get(ra.modulo) || [];
            list.push(ra.codigoRa);
            byModule.set(ra.modulo, list);
          }
          resultadoFFE = Array.from(byModule.entries())
            .map(([modulo, ras]) => `${modulo} - ${ras.join(', ')}`)
            .join('\n');
        } else if (raResults.length > 0) {
          resultadoFFE = 'Todos los RA superados';
        } else {
          resultadoFFE = 'Sin evaluar';
        }
        if (evaluacion?.valoracionFinalId) {
          const vf = db.prepare('SELECT codigo FROM ffe_valoraciones_final WHERE id = ?').get(evaluacion.valoracionFinalId) as { codigo: string } | undefined;
          notaFinal = vf?.codigo || '';
        } else {
          notaFinal = '';
        }
      } else {
        resultadoFFE = 'FFE No cursada';
        notaFinal = evaluacion?.motivoNoRealizacionId
          ? (db.prepare('SELECT codigo FROM ffe_motivos_no_realizacion WHERE id = ?').get(evaluacion.motivoNoRealizacionId) as { codigo: string } | undefined)?.codigo || ''
          : '';
      }

      return {
        alumnoId: r.alumnoId,
        nombre: r.nombre,
        apellidos: r.apellidos,
        nivel: r.nivel,
        totalHorasFFE: r.totalHorasFFE,
        horasRealizadas,
        relacionId: r.relacionId,
        resultadoFFE,
        notaFinal,
      };
    });
  },
};

// ─────────────────────────────────────────
//  RECÁLCULO DE FECHAS
// ─────────────────────────────────────────

export function recalcularFechasAlumnos(profesorId: number): number {
  const config = ConfiguracionDAO.getConfig(profesorId, 'festivos');
  const usarFestivos = config.usar_festivos !== '0';
  const usarFestivosEmpresa = config.usar_festivos_empresa === '1';

  const alumnos = db.prepare(`
    SELECT a.id as alumnoId, a.fechaInicio, a.totalHorasFFE, a.relacionId,
           r.horario, r.convenioId
    FROM alumnos a
    JOIN relaciones r ON a.relacionId = r.id
    WHERE a.relacionId IS NOT NULL AND a.fechaInicio IS NOT NULL AND a.totalHorasFFE > 0
  `).all() as any[];

  // Build centro → festivos map
  const centroFestivosMap: Record<number, string[]> = {};
  for (const alumno of alumnos) {
    const conv = db.prepare('SELECT centroId FROM convenios WHERE id = ?').get(alumno.convenioId) as any;
    if (conv?.centroId && !centroFestivosMap[conv.centroId]) {
      const centro = db.prepare('SELECT festivos FROM centros_educativos WHERE id = ?').get(conv.centroId) as any;
      centroFestivosMap[conv.centroId] = centro?.festivos ? JSON.parse(centro.festivos) : [];
    }
  }

  // Build empresa festivos map by ciudad
  const empresaFestivosByCiudad: Record<string, string[]> = {};
  if (usarFestivosEmpresa) {
    const raw = EmpresaFestivosDAO.getAll(profesorId);
    for (const [ciudad, fechas] of Object.entries(raw)) {
      empresaFestivosByCiudad[ciudad] = fechas;
    }
  }

  // Map convenioId → empresa ciudad
  const empresaCiudadByConvenio: Record<number, string> = {};
  for (const alumno of alumnos) {
    if (empresaCiudadByConvenio[alumno.convenioId] !== undefined) continue;
    const conv = db.prepare('SELECT empresaId FROM convenios WHERE id = ?').get(alumno.convenioId) as any;
    if (conv) {
      const empresa = db.prepare('SELECT ciudad FROM empresas WHERE id = ?').get(conv.empresaId) as any;
      if (empresa?.ciudad) empresaCiudadByConvenio[alumno.convenioId] = empresa.ciudad;
    }
  }

  const formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  let contador = 0;
  const updateStmt = db.prepare('UPDATE alumnos SET fechaFin = ? WHERE id = ?');

  const transaction = db.transaction(() => {
    for (const alumno of alumnos) {
      const horario = safeParse(alumno.horario, {});
      if (!horario || Object.keys(horario).length === 0) continue;

      const conv = db.prepare('SELECT centroId FROM convenios WHERE id = ?').get(alumno.convenioId) as any;
      const centroFestivos: string[] = conv?.centroId ? (centroFestivosMap[conv.centroId] || []) : [];
      const empCiudad = empresaCiudadByConvenio[alumno.convenioId];
      const empFestivos: string[] = empCiudad ? (empresaFestivosByCiudad[empCiudad] || []) : [];

      const saltar = new Set<string>();
      if (usarFestivos) centroFestivos.forEach(f => saltar.add(f));
      if (usarFestivosEmpresa) empFestivos.forEach(f => saltar.add(f));

      const startParts = alumno.fechaInicio.split('-').map(Number);
      let current = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      let remainingHoras = alumno.totalHorasFFE;
      let iterations = 0;

      while (remainingHoras > 0 && iterations < 365) {
        const dateStr = formatDateLocal(current);
        const dayOfWeek = current.getDay();

        if (!saltar.has(dateStr)) {
          let dailyHoras = 0;
          switch (dayOfWeek) {
            case 1: dailyHoras = horario.lunes?.horas || 0; break;
            case 2: dailyHoras = horario.martes?.horas || 0; break;
            case 3: dailyHoras = horario.miercoles?.horas || 0; break;
            case 4: dailyHoras = horario.jueves?.horas || 0; break;
            case 5: dailyHoras = horario.viernes?.horas || 0; break;
            case 6: dailyHoras = horario.sabado?.horas || 0; break;
            case 0: dailyHoras = horario.domingo?.horas || 0; break;
          }
          remainingHoras -= dailyHoras;
        }

        if (remainingHoras > 0) current.setDate(current.getDate() + 1);
        iterations++;
      }

      const nuevaFechaFin = formatDateLocal(current);
      updateStmt.run(nuevaFechaFin, alumno.alumnoId);
      contador++;
    }
  });

  transaction();
  return contador;
}

