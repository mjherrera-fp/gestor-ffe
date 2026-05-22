import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';

// Recuperamos la ruta que configuramos en el servidor
const baseDir = process.env.PORTABLE_EXECUTABLE_DIR || process.cwd();
const dbPath = path.join(baseDir, 'ffe_management.db');

// Exportamos la instancia y un estado de bloqueo
export let db: any = null;
export let isDbEncrypted = false;

/**
 * Intento de conexión inicial (sin contraseña)
 */
export const initDB = () => {
  try {
    // Intentamos abrir la base de datos de forma normal
    const tempDb = new Database(dbPath);

    // Prueba de lectura: Si está cifrada, esto lanzará un error inmediatamente
    tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    // Si llegamos aquí, NO está cifrada o ya estaba abierta
    db = tempDb;
    isDbEncrypted = false;
    setupTables(); // Tu lógica de creación de tablas
    console.log("Base de datos abierta (Sin cifrado)");
  } catch (error: any) {
    // El código de error 26 o mensajes sobre "file is not a database" 
    // suelen indicar que está cifrada y falta la clave
    isDbEncrypted = true;
    db = null;
    console.log("Base de datos detectada como cifrada. Esperando clave...");
  }
};

/**
 * Desbloqueo manual con contraseña (llamado desde /api/auth/unlock)
 */
export const unlockDB = (password: string) => {
  const newDb = new Database(dbPath);

  // Aplicamos los PRAGMAS que ya tenías en tu código original
  newDb.pragma(`cipher='sqlcipher'`);
  newDb.pragma(`legacy=4`);
  newDb.pragma(`page_size=4096`);
  newDb.pragma(`key='${password}'`);

  try {
    // Validamos la clave
    newDb.prepare("SELECT count(*) FROM sqlite_master").run();
    db = newDb;
    isDbEncrypted = true; // Ahora sabemos que está cifrada
    setupTables();
  } catch (error) {
    newDb.close();
    throw new Error("Contraseña incorrecta");
  }
};

/**
 * Cierre físico para el botón de la cabecera
 */
export const lockDB = () => {
  if (db) {
    db.close();
    db = null;
    // Forzamos a que tras el cierre, el sistema sepa que debe pedir pass
    isDbEncrypted = true;
  }
};


function setupTables() {
  if (!db) return;
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
  CREATE TABLE IF NOT EXISTS profesores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    nif TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS centros_educativos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profesorId INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT NOT NULL,
    FOREIGN KEY(profesorId) REFERENCES profesores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL,
    festivos TEXT,
    tutorias TEXT
  );

  CREATE TABLE IF NOT EXISTS detalles_academicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centroId INTEGER NOT NULL,
    ciclo TEXT NOT NULL,
    codigo TEXT NOT NULL,
    nivel TEXT NOT NULL,
    grado TEXT NOT NULL,
    regimen TEXT NOT NULL,
    codigoGrupo TEXT NOT NULL,
    resultadosAprendizaje TEXT,
    FOREIGN KEY(centroId) REFERENCES centros_educativos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    cif TEXT NOT NULL,
    email TEXT NOT NULL,
    tlfn TEXT NOT NULL,
    comentarios TEXT
  );

  CREATE TABLE IF NOT EXISTS tutores_empresa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresaId INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    nif TEXT NOT NULL,
    email TEXT NOT NULL,
    tlfn TEXT NOT NULL,
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS empresa_estadisticas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresaId INTEGER NOT NULL,
    curso TEXT NOT NULL,
    numAlumnos INTEGER NOT NULL DEFAULT 0,
    contratados INTEGER NOT NULL DEFAULT 0,
    valoracion REAL,
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS convenios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numConvenio TEXT NOT NULL,
    fechaConvenio TEXT NOT NULL,
    estado TEXT NOT NULL,
    empresaId INTEGER NOT NULL,
    cursoId INTEGER,
    centroId INTEGER,
    tipoFirma TEXT NOT NULL DEFAULT 'SIN_ASIGNAR',
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY(cursoId) REFERENCES cursos(id) ON DELETE SET NULL,
    FOREIGN KEY(centroId) REFERENCES centros_educativos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS relaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    convenioId INTEGER NOT NULL,
    tutorEmpresaId INTEGER NOT NULL,
    numRelacion TEXT NOT NULL,
    horario TEXT NOT NULL,
    estado TEXT NOT NULL,
    firmaRelacion TEXT NOT NULL DEFAULT 'SIN_ASIGNAR',
    firmaPlanFormativo TEXT NOT NULL DEFAULT 'SIN_ASIGNAR',
    firmaSeguimiento TEXT NOT NULL DEFAULT 'SIN_ASIGNAR',
    firmaValoracion TEXT NOT NULL DEFAULT 'SIN_ASIGNAR',
    FOREIGN KEY (convenioId) REFERENCES convenios(id) ON DELETE CASCADE,
    FOREIGN KEY (tutorEmpresaId) REFERENCES tutores_empresa(id)
  );

  CREATE TABLE IF NOT EXISTS alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    dni TEXT NOT NULL,
    numSS TEXT NOT NULL,
    tlfn TEXT NOT NULL,
    emailEduca TEXT NOT NULL,
    emailPersonal TEXT NOT NULL,
    fechaNacimiento TEXT NOT NULL,
    cvPath TEXT,
    totalHorasFFE INTEGER NOT NULL,
    fechaInicio TEXT,
    fechaFin TEXT,
    estadoPlanFormativo TEXT NOT NULL DEFAULT 'PENDIENTE_ENVIAR_ESTUDIANTE',
    estadoSeguimiento TEXT NOT NULL DEFAULT 'PENDIENTE',
    estadoValoracion TEXT NOT NULL DEFAULT 'PENDIENTE',
    cursoId INTEGER,
    relacionId INTEGER,
    detalleAcademicoId INTEGER,
    FOREIGN KEY(cursoId) REFERENCES cursos(id),
    FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE SET NULL,
    FOREIGN KEY(detalleAcademicoId) REFERENCES detalles_academicos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS intereses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumnoId INTEGER NOT NULL,
    empresaId INTEGER NOT NULL,
    interesado TEXT NOT NULL,
    FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profesorId INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    clave TEXT NOT NULL,
    valor TEXT,
    FOREIGN KEY(profesorId) REFERENCES profesores(id) ON DELETE CASCADE,
    UNIQUE(profesorId, tipo, clave)
  );
`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS historico_comunicaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      para TEXT, cc TEXT, cco TEXT,
      fecha_hora TEXT NOT NULL DEFAULT (datetime('now')),
      asunto TEXT, cuerpo TEXT,
      ficheros_adjuntos TEXT
    );

    CREATE TABLE IF NOT EXISTS historico_operaciones_convenio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_operacion TEXT NOT NULL,
      fecha_hora TEXT NOT NULL DEFAULT (datetime('now')),
      convenio_id INTEGER,
      referencia TEXT
    );

    CREATE TABLE IF NOT EXISTS historico_operaciones_relacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_operacion TEXT NOT NULL,
      fecha_hora TEXT NOT NULL DEFAULT (datetime('now')),
      relacion_id INTEGER,
      referencia TEXT
    );

    CREATE TABLE IF NOT EXISTS historico_cambios_estado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_proceso TEXT NOT NULL,
      fecha_hora TEXT NOT NULL DEFAULT (datetime('now')),
      estado_origen TEXT NOT NULL,
      estado_destino TEXT NOT NULL,
      entidad_id INTEGER,
      referencia TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS avisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_aviso TEXT NOT NULL,
      asunto TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      origen TEXT NOT NULL DEFAULT 'automatico',
      estado TEXT NOT NULL DEFAULT 'pendiente',
      alumno_id INTEGER,
      tipo_aviso TEXT,
      pospuesto_en TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migración: añadir columnas nuevas a tablas existentes
  try { db.exec("ALTER TABLE relaciones ADD COLUMN firmaRelacion TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'"); } catch {}
  try { db.exec("ALTER TABLE relaciones ADD COLUMN firmaPlanFormativo TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'"); } catch {}
  try { db.exec("ALTER TABLE relaciones ADD COLUMN firmaSeguimiento TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'"); } catch {}
  try { db.exec("ALTER TABLE relaciones ADD COLUMN firmaValoracion TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'"); } catch {}
  try { db.exec("ALTER TABLE convenios ADD COLUMN tipoFirma TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'"); } catch {}
  try { db.exec("ALTER TABLE profesores ADD COLUMN send_delay_ms INTEGER DEFAULT 1500"); } catch {}
}

// Ejecutamos el intento inicial al importar el módulo
initDB();
export default db;