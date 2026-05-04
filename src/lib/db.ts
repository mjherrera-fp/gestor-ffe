import Database from 'better-sqlite3';

const db = new Database('ffe_management.db');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize schema
db.exec('PRAGMA foreign_keys = OFF;');

const tablesToDrop = new Set<string>();

const tableInfoConvenios = db.prepare("PRAGMA table_info(convenios)").all() as any[];
if (tableInfoConvenios.length > 0) {
  const hasEmpresaId = tableInfoConvenios.some(col => col.name === 'empresaId');
  const hasCentroIdConvenio = tableInfoConvenios.some(col => col.name === 'centroId');
  if (!hasEmpresaId || !hasCentroIdConvenio) {
    tablesToDrop.add('relaciones_alumnos');
    tablesToDrop.add('convenios');
  }
}

const tableInfoDetalles = db.prepare("PRAGMA table_info(detalles_academicos)").all() as any[];
if (tableInfoDetalles.length > 0) {
  const hasRADetalles = tableInfoDetalles.some(col => col.name === 'resultadosAprendizaje');
  if (!hasRADetalles) {
    tablesToDrop.add('alumnos');
    tablesToDrop.add('detalles_academicos');
  }
}

const tableInfoCursos = db.prepare("PRAGMA table_info(cursos)").all() as any[];
if (tableInfoCursos.length > 0) {
  const hasRA = tableInfoCursos.some(col => col.name === 'resultadosAprendizaje');
  if (hasRA) {
    tablesToDrop.add('relaciones_alumnos');
    tablesToDrop.add('convenios');
    tablesToDrop.add('alumnos');
    tablesToDrop.add('cursos');
  }
}

tablesToDrop.forEach(table => {
  db.exec(`DROP TABLE IF EXISTS ${table}`);
});

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

  CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL,
    archivado INTEGER DEFAULT 0,
    festivos TEXT
  );

  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    cif TEXT NOT NULL,
    email TEXT NOT NULL,
    tlfn TEXT NOT NULL
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

  CREATE TABLE IF NOT EXISTS convenios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numConvenio TEXT NOT NULL,
    fechaConvenio TEXT NOT NULL,
    estado TEXT NOT NULL,
    empresaId INTEGER NOT NULL,
    cursoId INTEGER NOT NULL,
    centroId INTEGER,
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY(cursoId) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY(centroId) REFERENCES centros_educativos(id) ON DELETE SET NULL
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
    cursoId INTEGER,
    detalleAcademicoId INTEGER,
    horasPendientesFFE INTEGER DEFAULT 0,
    FOREIGN KEY(cursoId) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY(detalleAcademicoId) REFERENCES detalles_academicos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS relaciones_alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumnosRelacion TEXT NOT NULL,
    convenioId INTEGER NOT NULL,
    numRelacion TEXT NOT NULL,
    tutorEmpresaId INTEGER NOT NULL,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL,
    horario TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Pendiente de enviar a empresa',
    FOREIGN KEY(convenioId) REFERENCES convenios(id) ON DELETE CASCADE,
    FOREIGN KEY(tutorEmpresaId) REFERENCES tutores_empresa(id)
  );

  CREATE TABLE IF NOT EXISTS intereses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumnoId INTEGER NOT NULL,
    empresaId INTEGER NOT NULL,
    interesado TEXT NOT NULL, -- 'alumno' or 'empresa'
    FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE
  );
`);

export default db;
