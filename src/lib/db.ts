import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'fs';
import path from 'path';
import {PlantillaCorreoDB} from '../types/email.ts';

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

    try {
      // Prueba de lectura: Si está cifrada, esto lanzará un error inmediatamente
      tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    } catch (error: any) {
      // Solo consideramos que está cifrada si el archivo tiene contenido real.
      // Un archivo recién creado (0 bytes) es una instalación nueva, no una DB cifrada.
      let fileSize = 0;
      try { fileSize = fs.statSync(dbPath).size; } catch {}
      if (fileSize > 0) {
        // El código de error 26 o mensajes sobre "file is not a database"
        // suelen indicar que está cifrada y falta la clave
        tempDb.close();
        db = null;
        isDbEncrypted = true;
        console.log("Base de datos detectada como cifrada. Esperando clave...");
        return;
      }
    }

    // Instalación nueva (archivo vacío) o DB sin cifrar: abrimos con normalidad
    db = tempDb;
    isDbEncrypted = false;
    setupTables(); // Tu lógica de creación de tablas
    console.log("Base de datos abierta (Sin cifrado)");
  } catch (error: any) {
    // Un fallo real (por ejemplo, un error de migración) no debe
    // enmascararse como si la base de datos estuviera cifrada
    console.error("Error al inicializar la base de datos:", error);
    throw error;
  }
};

/**
 * Desbloqueo manual con contraseña (llamado desde /api/auth/unlock)
 */
export const unlockDB = (password: string) => {
  // El formato de cifrado es cipher='sqlcipher' + legacy=4 + page_size=4096.
  // Lo intentamos en primer lugar; como respaldo se prueba solo con el key
  // (por si alguna instalación quedó cifrada con los defaults del addon).
  const configs: Array<Array<string>> = [
    [`cipher='sqlcipher'`, `legacy=4`, `page_size=4096`, `key='${password}'`],
    [`key='${password}'`],
  ];

  for (const pragmas of configs) {
    let newDb: any = null;
    try {
      newDb = new Database(dbPath);
      for (const p of pragmas) newDb.pragma(p);
      // Validamos la clave
      newDb.prepare("SELECT count(*) FROM sqlite_master").run();
      db = newDb;
      isDbEncrypted = true; // Ahora sabemos que está cifrada
      setupTables();
      return;
    } catch (error) {
      if (newDb) {
        try { newDb.close(); } catch {}
      }
    }
  }
  throw new Error("Contraseña incorrecta");
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


function getColumnNames(db: any, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

function hasColumn(db: any, table: string, column: string): boolean {
  return getColumnNames(db, table).includes(column);
}

function ensureColumn(db: any, table: string, column: string, ddl: string): void {
  if (!hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function dropColumnIfExists(db: any, table: string, column: string): void {
  if (hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

// Migraciones de esquema ordenadas. SCHEMA_MIGRATIONS[i] migra de versión i a i+1.
// Las migraciones deben ser idempotentes: en bases nuevas el esquema base ya trae
// los cambios y aquí quedan como no-op; en instalaciones antiguas reconcilian el esquema.
const SCHEMA_MIGRATIONS: Array<(db: any) => void> = [
  // v0 -> v1: reconciliar esquema de instalaciones existentes
  (db) => {
    ensureColumn(db, 'relaciones', 'firmaRelacion', "firmaRelacion TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'");
    ensureColumn(db, 'relaciones', 'firmaPlanFormativo', "firmaPlanFormativo TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'");
    ensureColumn(db, 'relaciones', 'firmaSeguimiento', "firmaSeguimiento TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'");
    ensureColumn(db, 'relaciones', 'firmaValoracion', "firmaValoracion TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'");
    ensureColumn(db, 'convenios', 'tipoFirma', "tipoFirma TEXT NOT NULL DEFAULT 'SIN_ASIGNAR'");
    ensureColumn(db, 'profesores', 'send_delay_ms', 'send_delay_ms INTEGER DEFAULT 1500');
    ensureColumn(db, 'plantillas_correo', 'grupo', "grupo TEXT NOT NULL DEFAULT ''");

    db.exec("UPDATE plantillas_correo SET grupo = 'varios-registros' WHERE grupo = 'enviar-todo'");
    db.exec("UPDATE plantillas_correo SET grupo = 'registro-individual' WHERE grupo = 'documento'");

    ensureColumn(db, 'centros_educativos', 'festivos', 'festivos TEXT');
    ensureColumn(db, 'detalles_academicos', 'tutorias', 'tutorias TEXT');
    ensureColumn(db, 'detalles_academicos', 'nombreCorto', 'nombreCorto TEXT');
    ensureColumn(db, 'centros_educativos', 'codigo_centro', 'codigo_centro TEXT');
    dropColumnIfExists(db, 'cursos', 'festivos');
    dropColumnIfExists(db, 'cursos', 'tutorias');
    ensureColumn(db, 'empresas', 'personaContacto', 'personaContacto TEXT');
    ensureColumn(db, 'empresas', 'comunidad', 'comunidad TEXT');
    ensureColumn(db, 'empresas', 'provincia', 'provincia TEXT');
    ensureColumn(db, 'alumnos', 'comunicacionDAT', 'comunicacionDAT INTEGER REFERENCES comunicaciones_dat(id) ON DELETE SET NULL');

    // Instalaciones antiguas con la tabla tutores_empresa: la base ya crea
    // empresa_tutores, así que fusionamos los datos y descartamos la tabla vieja
    const tutoresEmpresa = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tutores_empresa'").get();
    if (tutoresEmpresa) {
      db.exec(`INSERT OR IGNORE INTO empresa_tutores (id, empresaId, nombre, apellidos, nif, email, tlfn)
        SELECT id, empresaId, nombre, apellidos, nif, email, tlfn FROM tutores_empresa`);
      db.exec("DROP TABLE tutores_empresa");
    }
  },
  // v1 -> v2: autosanación de columnas que la migración v0->v1 pudo dejar
  // sin aplicar si la versión de esquema quedó adelantada (p. ej. instalaciones
  // que marcaron user_version=1 sin completar el ALTER TABLE).
  (db) => {
    ensureColumn(db, 'alumnos', 'comunicacionDAT', 'comunicacionDAT INTEGER REFERENCES comunicaciones_dat(id) ON DELETE SET NULL');
  },
  // v2 -> v3: días no lectivos personalizados por alumno.
  //
  // El DDL es el mismo que crea `setupTables`, y ambos son idempotentes, como
  // exigen las migraciones: en una base nueva esta entrada no hace nada porque
  // la tabla ya existe, y en una antigua la crea. `IF NOT EXISTS` sobre la
  // tabla y sobre el indice es lo que hace la entrada segura en los dos casos.
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS alumnos_festivos_personalizados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alumnoId INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('QUITAR','ANADIR')),
        FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE,
        UNIQUE (alumnoId, fecha)
      );
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_alumnos_festivos_personalizados_alumno
        ON alumnos_festivos_personalizados (alumnoId);
    `);
  },
  // v3 -> v4: comentario libre por alumno para anotar casos particulares.
  (db) => {
    ensureColumn(db, 'alumnos', 'comentario', 'comentario TEXT');
  },
  // v4 -> v5: enlaces personalizados (Configuracion -> Enlaces). Mismo DDL
  // idempotente que en setupTables.
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS enlaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        url TEXT NOT NULL,
        orden INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
];

const CURRENT_SCHEMA_VERSION = SCHEMA_MIGRATIONS.length;

function runMigrations() {
  if (!db) return;
  const current = Number(db.pragma('user_version', { simple: true }) ?? 0);
  if (current >= CURRENT_SCHEMA_VERSION) return;

  console.log(`Migraciones de esquema pendientes: v${current} -> v${CURRENT_SCHEMA_VERSION}`);

  try {
    fs.copyFileSync(dbPath, `${dbPath}.bak`);
  } catch (e) {
    console.warn('No se pudo crear el backup antes de migrar la BBDD:', e);
  }

  db.exec('PRAGMA foreign_keys = OFF');
  try {
    for (let v = current; v < CURRENT_SCHEMA_VERSION; v++) {
      db.exec('BEGIN IMMEDIATE');
      try {
        SCHEMA_MIGRATIONS[v](db);
        db.exec(`PRAGMA user_version = ${v + 1}`);
        db.exec('COMMIT');
        console.log(`Migración de esquema aplicada: v${v} -> v${v + 1}`);
      } catch (e) {
        db.exec('ROLLBACK');
        console.error(`Error en la migración v${v} -> v${v + 1}:`, e);
        throw e;
      }
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

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
    codigo_centro TEXT,
    FOREIGN KEY(profesorId) REFERENCES profesores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL
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
    nombreCorto TEXT,
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

  CREATE TABLE IF NOT EXISTS empresa_tutores (
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

  CREATE TABLE IF NOT EXISTS doc_convenio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    convenioId INTEGER NOT NULL,
    nombreFichero TEXT NOT NULL,
    contenido TEXT NOT NULL,
    comentario TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    fechaSubida TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(convenioId) REFERENCES convenios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS doc_relacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relacionId INTEGER NOT NULL,
    nombreFichero TEXT NOT NULL,
    contenido TEXT NOT NULL,
    comentario TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    fechaSubida TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS doc_planes_formativos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relacionId INTEGER NOT NULL,
    alumnoId INTEGER NOT NULL,
    nombreFichero TEXT NOT NULL,
    contenido TEXT NOT NULL,
    comentario TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    fechaSubida TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE CASCADE,
    FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS doc_seguimiento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relacionId INTEGER NOT NULL,
    alumnoId INTEGER NOT NULL,
    nombreFichero TEXT NOT NULL,
    contenido TEXT NOT NULL,
    comentario TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    fechaSubida TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE CASCADE,
    FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS doc_valoracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relacionId INTEGER NOT NULL,
    alumnoId INTEGER NOT NULL,
    nombreFichero TEXT NOT NULL,
    contenido TEXT NOT NULL,
    comentario TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    fechaSubida TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE CASCADE,
    FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE
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
    FOREIGN KEY (tutorEmpresaId) REFERENCES empresa_tutores(id)
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
    estadoPlanFormativo TEXT,
    estadoSeguimiento TEXT,
    estadoValoracion TEXT,
    cursoId INTEGER,
    relacionId INTEGER,
    detalleAcademicoId INTEGER,
    comentario TEXT,
    FOREIGN KEY(cursoId) REFERENCES cursos(id),
    FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE SET NULL,
    FOREIGN KEY(detalleAcademicoId) REFERENCES detalles_academicos(id) ON DELETE SET NULL
  );

  -- Desvio de cada alumno respecto a los dias no lectivos que hereda del centro
  -- y de la empresa. No se guarda su lista completa de dias, solo en que se
  -- diferencia de la heredada: 'QUITAR' es un festivo que el alumno si asiste y
  -- 'ANADIR' un dia en el que no asiste aunque no sea festivo.
  --
  -- El CASCADE limpia estas filas solo al borrar el curso, porque es
  -- CursoDAO.delete y replaceAll los que borran los alumnos. Un alumno que sale
  -- de una relacion conserva las suyas; las borra el propio guardado de la
  -- relacion, igual que hace con fechaInicio y fechaFin.
  CREATE TABLE IF NOT EXISTS alumnos_festivos_personalizados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumnoId INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('QUITAR','ANADIR')),
    FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE,
    UNIQUE (alumnoId, fecha)
  );

  CREATE INDEX IF NOT EXISTS idx_alumnos_festivos_personalizados_alumno
    ON alumnos_festivos_personalizados (alumnoId);

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
    CREATE TABLE IF NOT EXISTS ffe_valoraciones_final (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      valor TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ffe_motivos_no_realizacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      valor TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ffe_evaluaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumnoId INTEGER NOT NULL,
      relacionId INTEGER,
      fechaEvaluacion TEXT,
      valoracionFinalId INTEGER,
      motivoNoRealizacionId INTEGER,
      FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE,
      FOREIGN KEY(valoracionFinalId) REFERENCES ffe_valoraciones_final(id),
      FOREIGN KEY(motivoNoRealizacionId) REFERENCES ffe_motivos_no_realizacion(id),
      UNIQUE(alumnoId, relacionId)
    );

    CREATE TABLE IF NOT EXISTS ffe_ra_resultados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumnoId INTEGER NOT NULL,
      relacionId INTEGER NOT NULL,
      modulo TEXT NOT NULL,
      codigoRa TEXT NOT NULL,
      nombreRa TEXT NOT NULL,
      aprobado INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(alumnoId) REFERENCES alumnos(id) ON DELETE CASCADE,
      FOREIGN KEY(relacionId) REFERENCES relaciones(id) ON DELETE CASCADE,
      UNIQUE(alumnoId, relacionId, modulo, codigoRa)
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

    CREATE TABLE IF NOT EXISTS historico_anulaciones_ffe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumno_id INTEGER,
      nombre_alumno TEXT NOT NULL,
      apellidos_alumno TEXT NOT NULL,
      dni_alumno TEXT NOT NULL,
      total_horas_original INTEGER NOT NULL,
      horas_realizadas INTEGER NOT NULL,
      total_horas_nuevo INTEGER NOT NULL,
      empresa TEXT,
      cif TEXT,
      tutor TEXT,
      ref_relacion TEXT,
      fecha_inicio TEXT,
      fecha_anulacion TEXT NOT NULL,
      motivo TEXT,
      fecha_hora TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(alumno_id) REFERENCES alumnos(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comunicaciones_dat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE_ENVIAR_DIRECTOR',
      detalleAcademicoId INTEGER,
      FOREIGN KEY(detalleAcademicoId) REFERENCES detalles_academicos(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS doc_comunicaciones_dat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comunicacionDatId INTEGER NOT NULL,
      nombreFichero TEXT NOT NULL,
      contenido TEXT NOT NULL,
      comentario TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      fechaSubida TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(comunicacionDatId) REFERENCES comunicaciones_dat(id) ON DELETE CASCADE
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
    -- Enlaces del profesor que se listan en la cabecera (GF-75).
    CREATE TABLE IF NOT EXISTS enlaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      url TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 0
    );

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS plantillas_correo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plantillaId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      documents TEXT NOT NULL DEFAULT '[]',
      recipientTarget TEXT NOT NULL DEFAULT 'ninguno',
      icon TEXT NOT NULL DEFAULT 'file-text',
      color TEXT NOT NULL DEFAULT 'slate',
      place TEXT NOT NULL DEFAULT 'relaciones',
        tipo TEXT NOT NULL DEFAULT 'sistema',
        grupo TEXT NOT NULL DEFAULT ''
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS marcadores_personalizados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL DEFAULT '',
      descripcion TEXT NOT NULL DEFAULT ''
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS contactos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT NOT NULL DEFAULT ''
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS grupos_contactos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS grupo_miembros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupoId INTEGER NOT NULL REFERENCES grupos_contactos(id) ON DELETE CASCADE,
      tipoOrigen TEXT NOT NULL,
      origenId INTEGER NOT NULL
    );
  `);

// Migraciones de esquema versionadas (PRAGMA user_version)
  runMigrations();

  // Plantilla de correo de Convenios. Se declara fuera porque hace falta tanto
  // en el seed de instalaciones nuevas como en la migración de las que ya
  // tienen la tabla creada: si el texto viviera en los dos sitios, la primera
  // vez que se retoque la plantilla se actualizaría una y la otra se quedaría
  // con el texto viejo para siempre.
  //
  // `documents` pide el documento del convenio. El cuerpo no dice "adjuntamos"
  // a propósito: el adjunto solo sale si el profesor ha subido alguna versión
  // al gestor documental, y un texto que anuncie un adjunto que no está es
  // peor que no mencionarlo.
  const plantillaConvenio = {
    plantillaId: 'convenio',
    name: 'Envío de convenio',
    description: 'Comunicar el convenio a la empresa',
    subject: 'Convenio de prácticas {{convenio.numConvenio}}',
    body: '<p>Estimado/a, {{empresa.personaContacto}}</p>\n<p>Nos dirigimos a ustedes desde el {{centro.nombre}} para comunicarles los datos del convenio de prácticas del curso {{curso.descripcion}}.</p>\n<ul>\n<li><strong>Nº de convenio:</strong> {{convenio.numConvenio}}</li>\n<li><strong>Fecha del convenio:</strong> {{convenio.fechaConvenio}}</li>\n</ul>\n<p>Rogamos confirmen la recepción de este correo y, si fuera necesario, nos indiquen cualquier corrección.</p>\n<p>Agradecemos de antemano su colaboración.</p>\n<p>Atentamente,</p>',
    documents: JSON.stringify(['convenio']),
    recipientTarget: 'empresa',
    icon: 'send',
    color: 'blue',
    place: 'convenio',
    tipo: 'sistema',
    grupo: 'registro-individual',
  } as Omit<PlantillaCorreoDB, 'id'>;

  // Seed: migrar plantillas si la tabla está vacía
  const count = db.prepare("SELECT COUNT(*) as count FROM plantillas_correo").get() as any;
  if (count.count === 0) {
    const seedData: Omit<PlantillaCorreoDB, 'id'>[] = [
      { plantillaId: 'relacion', name: 'Envío de relación', description: 'Anexo de relación → Email de la empresa', subject: 'Documento de relación', body: '<p>Estimado/a {{empresa.personaContacto}},</p>\n<p>Adjuntamos el anexo de relación de alumnos correspondiente al periodo de Formación en Empresa (FFE).</p>\n<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado. Tenga en cuenta que es importante que el documento esté correctamente rellenado y firmado para poder proceder con el proceso.</p>\n<p>Es importante que el documento esté correctamente rellenado y firmado para poder proceder con el proceso. Con respecto a la firma, tenga en cuenta que:</p>\n<ul>\n<li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>\n<li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>\n</ul>\n<p>Agradecemos de antemano su colaboración.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['relacion']), recipientTarget: 'empresa', icon: 'documento', color: 'blue', place: 'relaciones', tipo: 'sistema', grupo: 'varios-registros' },
      { plantillaId: 'plan', name: 'Envío de planes formativos', description: 'Plan formativo → Estudiante (según estado) o Tutor', subject: 'Plan formativo', body: '<p>Estimado/a, {{alumnoTutor}}</p>\n<p>Adjuntamos el plan formativo correspondiente a la fase de formación en empresa.</p>\n<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado.</p>\n<p>Recuerden que es importante que el plan esté correctamente rellenado y firmado para poder proceder con el proceso. Con respecto a la firma, tenga en cuenta que:</p>\n<ul>\n<li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>\n<li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>\n</ul>\n<p>Atentamente,</p>', documents: JSON.stringify(['plan']), recipientTarget: 'estudiante_conditional', icon: 'plan', color: 'emerald', place: 'relaciones', tipo: 'sistema', grupo: 'varios-registros' },
      { plantillaId: 'inicio', name: 'Inicio de las FFE', description: 'Seguimiento + Valoración + Calendario + Carta → Tutor de la empresa', subject: 'Inicio de las FFE', body: '<p>Estimado/a {{tutor.nombre}} {{tutor.apellidos}},</p>\n<p>Este email es para recordar que en los próximos días dará comienzo la Fase de Formación en Empresas (FFE) para nuestros alumnos {{nombreApellidosAlumnos}}.</p>\n<p>Según los convenios firmados su centro de trabajo es en {{empresa.direccion}}.</p>\n<p>Estará/n allí al inicio de la jornada, y preguntará/n directamente por ti. Aprovecho el email, para adjuntar:</p>\n<ul>\n<li>Carta de inicio de las FFE</li>\n<li>Calendario/s</li>\n<li>Fichas de seguimiento y valoración</li>\n</ul>\n<p>Por último, también me gustaría recordar un par de detalles, el primero, que como tutor cualquier duda, problema o inconveniente que surja durante el periodo de FFE, estoy a vuestra entera disposición. Y segundo, que los alumnos/as en FFE son estudiantes en periodo formativo y que por tanto necesitan asesoramiento y guía en las actividades a desarrollar en la empresa.</p>\n<p>Agradecemos de antemano su colaboración.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['seguimiento', 'valoracion', 'calendario', 'carta']), recipientTarget: 'tutor', icon: 'inicio', color: 'amber', place: 'relaciones', tipo: 'sistema', grupo: 'varios-registros' },
      { plantillaId: 'fin', name: 'Fin de las FFE', description: 'Seguimiento + Valoración → Tutor de la empresa', subject: 'Fin de las FFE', body: '<p>Estimado/a {{tutor.nombre}} {{tutor.apellidos}},</p>\n<p>Próximamente finalizará el periodo de FFE de nuestros alumnos/as en su empresa y necesitamos que se rellene y se firme los siguientes documentos:</p>\n<ul>\n<li>Ficha de seguimiento</li>\n<li>Valoración de las FFE</li>\n</ul>\n<p>Por favor, rellenad la información que sea necesaria en los documentos adjuntos ante de la firma. En el seguimiento aparece precargado en la columna "actividad formativa desarrollada", si queréis podéis poner actividades específicas desarrolladas por el alumno/a, pero es <strong>muy importante que guarden relación con los RA</strong> que están especificados en el documento. Si no sabéis de que va ese RA preguntad al alumno/a.</p>\n<p>Con respecto a la firma es muy importante que se siga cierto protocolo:</p>\n<ul>\n<li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>\n<li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>\n</ul>\n<p>Es muy importante la entrega de esta documentación, <strong>sin esta documentación debidamente cumplimentada y firmada no podrán titular nuestros alumnos/as</strong>.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['seguimiento', 'valoracion']), recipientTarget: 'tutor', icon: 'fin', color: 'purple', place: 'relaciones', tipo: 'sistema', grupo: 'varios-registros' },
      { plantillaId: 'nuevo-contacto', name: 'Nuevo contacto', description: 'Empresas nuevas sin convenio', subject: 'Presentación del Programa de Formación en Centros de Trabajo (FCT)', body: '<p>Estimado/a {{@contacto}},</p>\n<p>Mi nombre es {{profesor.nombre}} {{profesor.apellidos}} y me dirijo a usted como profesor del {{centro.nombre}} para explorar la posibilidad de que su empresa colabore con nosotros acogiendo a estudiantes para realizar la fase de formación en empresa (FFE). Esta FFE están reguladas por la Ley de Formación Profesional y son un requisito indispensable para que los estudiantes completen su formación académica.</p>\n<p>La FFE están diseñadas para que los estudiantes continúen su formación en el ámbito laboral, obteniendo así una experiencia formativa en un entorno de trabajo real.</p>\n<p>Confiamos en que esta colaboración no solo será una oportunidad de aprendizaje valiosa para nuestros alumnos, sino también una manera de que su empresa tenga acceso a jóvenes con motivación, energía y conocimientos actualizados que seguro serán útiles en su organización.</p>\n<p>Nos encantaría poder concertar una reunión o llamada para hablar en más detalle sobre esta posibilidad y resolver cualquier duda que pudiera tener. </p>\n<p>Agradezco de antemano su atención y quedo a la espera de su respuesta.</p>\n<p>Un cordial saludo. Atentamente,</p>', documents: JSON.stringify([]), recipientTarget: 'empresa', icon: 'contacto', color: 'blue', place: 'empresa', tipo: 'sistema', grupo: 'varios-registros' },
      { plantillaId: 'nueva-colaboracion', name: 'Nueva colaboración', description: 'Empresas con convenio existente', subject: 'Colaboración para FCT', body: '<p>Estimado/a {{@contacto}},</p>\n<p>Desde el {{centro.nombre}} os contactamos para explorar la posibilidad, un curso más, de colaborar para el programa de Formación en Empresas (FFE) del curso {{curso.descripcion}}.</p>\n<p>Queremos seguir colaborando con vosotros porque consideramos que vuestra empresa es un excelente lugar para que nuestros estudiantes realicen sus prácticas formativas.</p>\n<p>Necesitamos saber, lo antes posible, si estáis dispuestos a seguir colaborando, y de ser así, que previsión de plazas tendríais.</p>\n<p>Si necesitáis más información, no dudéis en contactarnos.</p>\n<p>Quedamos a la espera de su respuesta.</p>\n<p>Atentamente,</p>', documents: JSON.stringify([]), recipientTarget: 'empresa', icon: 'colaboracion', color: 'emerald', place: 'empresa', tipo: 'sistema', grupo: 'varios-registros' },
      { plantillaId: 'seg', name: 'Envío de seguimiento', description: 'Seguimiento → Tutor de la empresa', subject: 'Seguimiento FFE', body: '<p>Estimado/a, {{empresa.personaContacto}}</p>\n<p>Adjuntamos la ficha de seguimiento correspondiente a la fase de formación en empresa.</p>\n<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado.</p>\n<p>Recuerden que es importante que el seguimiento esté correctamente rellenado y firmado para poder proceder con el proceso. Con respecto a la firma, tenga en cuenta que:</p>\n<ul>\n<li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>\n<li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>\n</ul>\n<p>Agradecemos de antemano su colaboración.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['seguimiento']), recipientTarget: 'tutor', icon: 'seguimiento', color: 'blue', place: 'relaciones', tipo: 'sistema', grupo: 'registro-individual' },
      { plantillaId: 'val', name: 'Envío de valoración', description: 'Valoración → Tutor de la empresa', subject: 'Valoración FFE', body: '<p>Estimado/a, {{empresa.personaContacto}}</p>\n<p>Adjuntamos la ficha de valoración correspondiente a la fase de formación en empresa.</p>\n<p>Rogamos revisen el documento detenidamente y si todo está en orden, nos lo devuelvan firmado.</p>\n<p>Con respecto a la firma, tenga en cuenta que:</p>\n<ul>\n<li>Si la <strong>firma es manual</strong>, se debe imprimir el documento, firmarlo y a poder ser sellarlo y entregárselo al alumno/a antes de la finalización de las prácticas para que nos lo entregue cuando venga al centro.</li>\n<li>Si la <strong>firma es mediante certificado digital</strong>, bastaría con firmar el documento y enviármelo a mi por correo.</li>\n</ul>\n<p>Agradecemos de antemano su colaboración.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['valoracion']), recipientTarget: 'tutor', icon: 'valoracion', color: 'purple', place: 'relaciones', tipo: 'sistema', grupo: 'registro-individual' },
      { plantillaId: 'carta-inicio', name: 'Envío de carta de inicio', description: 'Carta de inicio → Empresa', subject: 'Carta de inicio de las FFE', body: '<p>Estimado/a, {{empresa.personaContacto}}</p>\n<p>Adjuntamos la carta de inicio correspondiente a la fase de formación en empresa.</p>\n<p>En esta carta se especifican aspectos importantes relacionados con el inicio de las FFE, por lo que rogamos revisen el documento detenidamente.</p>\n<p>Agradecemos de antemano su colaboración.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['carta']), recipientTarget: 'empresa', icon: 'carta', color: 'amber', place: 'relaciones', tipo: 'sistema', grupo: 'registro-individual' },
      { plantillaId: 'cal', name: 'Envío de calendario', description: 'Calendario → Estudiante', subject: 'Calendario FFE', body: '<p>Estimado/a, {{empresa.personaContacto}}</p>\n<p>Adjuntamos el calendario correspondiente a la fase de formación en empresa.</p>\n<p>Rogamos revisen el documento detenidamente.</p>\n<p>Atentamente,</p>', documents: JSON.stringify(['calendario']), recipientTarget: 'estudiante_conditional', icon: 'calendario', color: 'green', place: 'relaciones', tipo: 'sistema', grupo: 'registro-individual' },
      { plantillaId: 'envio-cv', name: 'Envío de CV', description: 'Adjuntar CV del alumno a la empresa', subject: 'Candidatura para prácticas en empresa', body: '<p>Estimados señores:</p><p>Adjunto les remito mi currículum vitae para su consideración.</p><p>Quedo a su disposición para cualquier aclaración.</p><p>Atentamente,</p>', documents: JSON.stringify([]), recipientTarget: 'empresa', icon: 'send', color: 'blue', place: 'alumno', tipo: 'sistema', grupo: 'varios-registros' },
      plantillaConvenio,
      { plantillaId: 'otros', name: 'Otros', description: 'Correo libre sin plantilla predefinida ni documentos adjuntos', subject: '', body: '', documents: JSON.stringify([]), recipientTarget: 'ninguno', icon: 'otros', color: 'slate', place: '', tipo: 'sistema', grupo: 'varios-registros' },
    ];
    const stmt = db.prepare(`INSERT INTO plantillas_correo (plantillaId, name, description, subject, body, documents, recipientTarget, icon, color, place, tipo, grupo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of seedData) {
      stmt.run(p.plantillaId, p.name, p.description, p.subject, p.body, p.documents, p.recipientTarget, p.icon, p.color, p.place, p.tipo, p.grupo || '');
    }
    console.log("Seed: plantillas_correo migradas a DB");
  }
  db.prepare("UPDATE plantillas_correo SET place = '' WHERE plantillaId = 'otros' AND place != ''").run();

  // Asegurar que la plantilla Envío de CV existe (migración para instalaciones existentes)
  db.prepare(`INSERT OR IGNORE INTO plantillas_correo (plantillaId, name, description, subject, body, documents, recipientTarget, icon, color, place, tipo, grupo)
    VALUES ('envio-cv', 'Envío de CV', 'Adjuntar CV del alumno a la empresa', 'Candidatura para prácticas en empresa', '<p>Estimados señores:</p><p>Adjunto les remito mi currículum vitae para su consideración.</p><p>Quedo a su disposición para cualquier aclaración.</p><p>Atentamente,</p>', '[]', 'empresa', 'send', 'blue', 'alumno', 'sistema', 'varios-registros')`).run();

  // Asegurar que la plantilla Envío de convenio existe (migración para
  // instalaciones existentes). `INSERT OR IGNORE` porque plantillaId es único: si
  // el profesor ya la editó, su texto gana y no se pisa con el del código.
  db.prepare(`INSERT OR IGNORE INTO plantillas_correo (plantillaId, name, description, subject, body, documents, recipientTarget, icon, color, place, tipo, grupo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      plantillaConvenio.plantillaId, plantillaConvenio.name, plantillaConvenio.description,
      plantillaConvenio.subject, plantillaConvenio.body, plantillaConvenio.documents,
      plantillaConvenio.recipientTarget, plantillaConvenio.icon, plantillaConvenio.color,
      plantillaConvenio.place, plantillaConvenio.tipo, plantillaConvenio.grupo,
    );

  // A las instalaciones donde la plantilla de convenio ya existía se les pone el
  // adjunto, pero solo si siguen sin adjuntos. El `INSERT OR IGNORE` de arriba no
  // sirve para esto: no pisa la fila que ya está, y el `documents` que trae el
  // código solo lo leen las bases nuevas. La condición deja la fila tranquila si
  // alguien ya la configuró, en vez de borrarle lo que haya puesto.
  db.prepare("UPDATE plantillas_correo SET documents = ? WHERE plantillaId = 'convenio' AND documents = '[]'")
    .run(plantillaConvenio.documents);

  // Seed: valoraciones finales FFE
  const vfCount = db.prepare("SELECT COUNT(*) as count FROM ffe_valoraciones_final").get() as any;
  if (vfCount.count === 0) {
    const vfStmt = db.prepare("INSERT INTO ffe_valoraciones_final (codigo, valor, orden) VALUES (?, ?, ?)");
    vfStmt.run('APROBADO', 'Aprobado', 1);
    vfStmt.run('R-FFE1', 'Repite FFE 1º', 2);
    vfStmt.run('R-FFE2', 'Repite la FFE 2º', 3);
    console.log("Seed: ffe_valoraciones_final");
  }

  // Seed: motivos no realización FFE
  const mnCount = db.prepare("SELECT COUNT(*) as count FROM ffe_motivos_no_realizacion").get() as any;
  if (mnCount.count === 0) {
    const mnStmt = db.prepare("INSERT INTO ffe_motivos_no_realizacion (codigo, valor, orden) VALUES (?, ?, ?)");
    mnStmt.run('Ex-T', 'Exención total', 1);
    mnStmt.run('0A', 'No promocionó a FFE', 2);
    mnStmt.run('0B', 'No ha cursado FFE, por causa justificada (los aplazamientos deben estar solicitados y justificados debidamente por el propio alumno)', 3);
    mnStmt.run('0C', 'No ha cursado FFE por falta de puestos formativos', 4);
    console.log("Seed: ffe_motivos_no_realizacion");
  }
}

// Ejecutamos el intento inicial al importar el módulo
initDB();

// Cierre limpio de la BBDD al salir: evita el crash nativo del addon
// (RemoveEnvironmentCleanupHook) durante el teardown del proceso.
const closeDbOnExit = () => {
  if (db) {
    try { db.close(); } catch {}
    db = null;
  }
};

process.on('SIGTERM', () => { closeDbOnExit(); process.exit(0); });
process.on('SIGINT', () => { closeDbOnExit(); process.exit(0); });
process.on('exit', closeDbOnExit);

export default db;