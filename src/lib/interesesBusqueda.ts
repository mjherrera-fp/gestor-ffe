/**
 * Busqueda del listado de alumnos de Intereses: por alumno o por empresa.
 *
 * Si el texto coincide con una empresa, salen los alumnos relacionados con
 * ella: los que le han enviado el CV (interes del alumno), los que la empresa
 * ha solicitado (interes de la empresa) y, por tanto, los match (los dos). Para
 * cada alumno se devuelve por que empresas sale, para poder decirlo en la
 * lista: si no, un alumno que no se llama como lo buscado parece un error.
 */

export interface InteresBusqueda {
  alumnoId: number;
  empresaId: number;
  interesado: 'alumno' | 'empresa';
}

export interface CoincidenciaEmpresa {
  empresaId: number;
  nombre: string;
  /** El alumno le ha enviado el CV. */
  envio: boolean;
  /** La empresa ha solicitado al alumno. */
  solicitud: boolean;
}

export interface ResultadoBusqueda {
  coincide: boolean;
  /** Empresas por las que sale el alumno; vacio si sale por su nombre o no hay busqueda. */
  porEmpresas: CoincidenciaEmpresa[];
}

/** Minusculas y sin tildes, para que "jose" encuentre "José". */
export const normalizarBusqueda = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Las empresas cuyo nombre contiene el texto. Se calcula una vez por busqueda
 * y se reutiliza para todos los alumnos.
 */
export function empresasQueCoinciden(
  empresas: { id?: number; nombre: string }[],
  texto: string
): Map<number, string> {
  const q = normalizarBusqueda(texto);
  const resultado = new Map<number, string>();
  if (!q) return resultado;
  for (const e of empresas) {
    if (e.id !== undefined && normalizarBusqueda(e.nombre).includes(q)) resultado.set(e.id, e.nombre);
  }
  return resultado;
}

/**
 * Si un alumno entra en la busqueda, y por que empresas.
 *
 * `empresas` es lo que devuelve `empresasQueCoinciden` para el mismo texto.
 */
export function buscarAlumno(
  alumno: { id?: number; nombre: string; apellidos: string },
  texto: string,
  intereses: InteresBusqueda[],
  empresas: Map<number, string>
): ResultadoBusqueda {
  const q = normalizarBusqueda(texto);
  if (!q) return { coincide: true, porEmpresas: [] };

  const nombreCompleto = normalizarBusqueda(`${alumno.nombre} ${alumno.apellidos}`);
  const porNombre = nombreCompleto.includes(q)
    || normalizarBusqueda(`${alumno.apellidos} ${alumno.nombre}`).includes(q);

  const porEmpresa = new Map<number, CoincidenciaEmpresa>();
  for (const i of intereses) {
    if (i.alumnoId !== alumno.id || !empresas.has(i.empresaId)) continue;
    const c = porEmpresa.get(i.empresaId)
      ?? { empresaId: i.empresaId, nombre: empresas.get(i.empresaId)!, envio: false, solicitud: false };
    if (i.interesado === 'alumno') c.envio = true;
    else c.solicitud = true;
    porEmpresa.set(i.empresaId, c);
  }

  const porEmpresas = [...porEmpresa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { coincide: porNombre || porEmpresas.length > 0, porEmpresas: porNombre ? [] : porEmpresas };
}
