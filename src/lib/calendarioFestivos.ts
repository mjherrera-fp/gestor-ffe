/**
 * Aritmetica del calendario de dias festivos.
 *
 * Todo aqui se calcula con `Date.UTC` y se lee con los getters `getUTC*`. Una
 * fecha en formato ISO solo-fecha ('2025-09-15') se interpreta como medianoche
 * UTC por especificacion, de modo que leerla con `getDate()` (hora local)
 * devuelve el dia anterior en cualquier huso por detras de UTC. Una rejilla de
 * calendario no puede depender de en que maquina se abre, asi que aqui no se
 * usa nunca la hora local.
 *
 * Las claves son cadenas 'YYYY-MM-DD'. En ese formato el orden lexicografico
 * coincide con el cronologico, asi que comparar o ordenar claves es comparar o
 * ordenar fechas.
 */

export interface RangoCurso {
  /** 'YYYY-MM-DD', primer dia del curso. */
  inicio: string;
  /** 'YYYY-MM-DD', ultimo dia del curso. */
  fin: string;
}

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Cabecera de los dias de la semana. Una letra por dia porque los meses van
 * pequenos: es la convencion habitual y el orden L M X J V S D no se repite
 * dentro de la semana. 'X' es miercoles y 'J' jueves, que en castellano
 * comparte letra con martes.
 *
 * La semana arranca en lunes, como es habitual en Espana.
 */
export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Los mismos dias con el nombre que usa `HorarioSemanal`, en el mismo orden de
 * lunes a domingo. Es lo que permite pasar de una clave 'YYYY-MM-DD' al dia de
 * la semana que mira el horario de la relacion, sin traducir a mano.
 */
export const NOMBRES_DIA = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
] as const;

/** Un mes del curso, con `mes` en base 0 para poder indexar `NOMBRES_MES`. */
export interface MesRango {
  anio: number;
  mes: number;
}

export interface CeldaMes {
  /** 'YYYY-MM-DD'. */
  clave: string;
  /** Dia del mes, de 1 a 31. */
  dia: number;
  /** Posicion en la semana, de 1 (lunes) a 7 (domingo). */
  diaSemana: number;
}

const RE_CLAVE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Partes de una fecha, o `null` si la clave no existe en el calendario. */
export function partes(iso: string): { anio: number; mes: number; dia: number } | null {
  const m = RE_CLAVE.exec(iso || '');
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12) return null;
  if (dia < 1 || dia > diasEnMes(anio, mes - 1)) return null;
  return { anio, mes, dia };
}

export const esClaveValida = (iso: string): boolean => partes(iso) !== null;

/** Construye la clave 'YYYY-MM-DD' a partir de mes en base 1. */
export const claveDesdePartes = (anio: number, mes: number, dia: number): string =>
  `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;

/** Cuantos dias tiene el mes `mes` (base 0) del ano `anio`. El dia 0 del mes siguiente es el ultimo. */
export function diasEnMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
}

/** Dia de la semana de una clave, de 1 (lunes) a 7 (domingo). */
export function diaSemana(iso: string): number | null {
  const p = partes(iso);
  if (!p) return null;
  // `getUTCDay` da 0 para domingo; se rota para que el lunes sea el 1.
  return ((new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay() + 6) % 7) + 1;
}

export const esFinDeSemana = (iso: string): boolean => {
  const d = diaSemana(iso);
  return d !== null && d >= 6;
};

/** Nombre del dia de la semana ('lunes'...'domingo'), o `null` si no hay fecha. */
export function nombreDiaSemana(iso: string): typeof NOMBRES_DIA[number] | null {
  const d = diaSemana(iso);
  return d === null ? null : NOMBRES_DIA[d - 1];
}

/** El rango es utilizable si ambas fechas existen y el inicio no es posterior al fin. */
export function rangoEsValido(rango: RangoCurso | null | undefined): rango is RangoCurso {
  if (!rango) return false;
  if (!esClaveValida(rango.inicio) || !esClaveValida(rango.fin)) return false;
  return rango.inicio <= rango.fin;
}

/** Todos los meses que cubre el rango, del primero al ultimo, ambos incluidos. */
export function mesesDelRango(rango: RangoCurso | null | undefined): MesRango[] {
  if (!rangoEsValido(rango)) return [];
  const desde = partes(rango.inicio)!;
  const hasta = partes(rango.fin)!;
  const meses: MesRango[] = [];
  let anio = desde.anio;
  let mes = desde.mes - 1;
  // El bucle avanza siempre hacia delante: como el rango ya se ha validado,
  // `anio`/`mes` solo puede igualar o superar los de `hasta`, y sale al llegar.
  for (;;) {
    meses.push({ anio, mes });
    if (anio === hasta.anio && mes === hasta.mes - 1) break;
    mes += 1;
    if (mes > 11) { mes = 0; anio += 1; }
  }
  return meses;
}

/** Los dias del mes `mes` (base 0), en orden, con su posicion semanal. */
export function celdasDeMes(anio: number, mes: number): CeldaMes[] {
  const total = diasEnMes(anio, mes);
  const celdas: CeldaMes[] = [];
  for (let dia = 1; dia <= total; dia++) {
    const clave = claveDesdePartes(anio, mes + 1, dia);
    celdas.push({ clave, dia, diaSemana: diaSemana(clave)! });
  }
  return celdas;
}

/** Cuantas celdas vacias hay que anteponer para alinear el dia 1 con su dia de la semana. */
export const celdasVaciasIniciales = (anio: number, mes: number): number =>
  diaSemana(claveDesdePartes(anio, mes + 1, 1))! - 1;

/** Anios naturales que atraviesa el rango. Un curso 2025-2026 da [2025, 2026]. */
export function aniosDelRango(rango: RangoCurso | null | undefined): number[] {
  if (!rangoEsValido(rango)) return [];
  const desde = partes(rango.inicio)!.anio;
  const hasta = partes(rango.fin)!.anio;
  const anios: number[] = [];
  for (let a = desde; a <= hasta; a++) anios.push(a);
  return anios;
}

/** Si la clave cae dentro del rango, extremos incluidos. */
export function estaEnRango(iso: string, rango: RangoCurso | null | undefined): boolean {
  if (!rangoEsValido(rango)) return false;
  if (!esClaveValida(iso)) return false;
  return iso >= rango.inicio && iso <= rango.fin;
}

/**
 * Todas las claves de los dias del rango, en orden, extremos incluidos.
 *
 * Son las que se necesitan para contar sobre un periodo: cuantos dias hay sin
 * festive, cuantos va el alumno a la empresa, y demas. Recorre en UTC, igual
 * que el resto del archivo, para que el conteo no dependa del huso de quien
 * abre el calendario. Un curso entero son unos 365 elementos, que es una
 * cantidad Hopcroft para la que no hace falta ninguna optimizacion.
 */
export function diasDelRango(rango: RangoCurso | null | undefined): string[] {
  if (!rangoEsValido(rango)) return [];
  const desde = partes(rango.inicio)!;
  const hasta = partes(rango.fin)!;
  const dias: string[] = [];
  // Se avanza con `Date.UTC` y se lee con `getUTC*`, de modo que sumar un dia
  // siempre suma 24h exactas: con la hora local, un cambio de hora de verano
  // meteria o saltaria un dia.
  const actual = Date.UTC(desde.anio, desde.mes - 1, desde.dia);
  const tope = Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia);
  for (let t = actual; t <= tope; t += 86_400_000) {
    const f = new Date(t);
    dias.push(claveDesdePartes(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()));
  }
  return dias;
}

/**
 * Los dias del rango que caen en un dia de la semana con horas.
 *
 * Es el lado positivo de los dias: sobre el papel el alumno asiste a todos los
 * laborables y pierde los que esten marcados, y de ahi sale cuantos ira. El
 * horario entra como el conjunto de nombres de dia (`lunes`...`domingo`) y no
 * como el de `HorarioSemanal`, que es cosa de la relacion y no del calendario.
 *
 * Se calcula sobre el rango que se le pase, que en el editor de un alumno es su
 * periodo estimado y por tanto cambia segun los dias que lleva marcados.
 */
export function diasLaborablesEnRango(
  rango: RangoCurso | null | undefined,
  diasConHoras: Set<string>
): Set<string> {
  const laborables = new Set<string>();
  if (!rangoEsValido(rango)) return laborables;
  for (const iso of diasDelRango(rango)) {
    const nombre = nombreDiaSemana(iso);
    if (nombre !== null && diasConHoras.has(nombre)) laborables.add(iso);
  }
  return laborables;
}

/** Anade la fecha si no estaba, o la quita si estaba. Siempre deduplica y ordena. */
export function alternarFestivo(festivos: string[], iso: string): string[] {
  const sinDuplicados = [...new Set(festivos)];
  const siguiente = sinDuplicados.includes(iso)
    ? sinDuplicados.filter(f => f !== iso)
    : [...sinDuplicados, iso];
  return siguiente.sort();
}

/**
 * Se queda solo con las fechas validas que caen dentro del rango.
 *
 * Los festivos son datos del curso: al borrarlo o sustituirlo se limpian
 * (ver `limpiarFestivos` en dao.ts), asi que lo que queda fuera del rango
 * procede de un curso anterior o de un curso mal definido, y no debe
 * sobrevivir al guardado.
 */
export function filtrarPorRango(festivos: string[], rango: RangoCurso | null | undefined): string[] {
  if (!rangoEsValido(rango)) return [];
  return [...new Set(festivos)].filter(f => estaEnRango(f, rango)).sort();
}

/** Cuantos de los festivos guardados se van a quedar fuera al guardar. */
export const festivosFueraDeRango = (festivos: string[], rango: RangoCurso | null | undefined): number =>
  new Set(festivos.filter(f => !estaEnRango(f, rango))).size;

/** Los cinco estados visuales que puede tener una celda del calendario. */
export interface EstadoCelda {
  marcado: boolean;
  /**
   * Dia lectivo: el alumno va a la empresa. Solo tiene sentido cuando se edita
   * el calendario de un alumno, donde ademas de los dias que no asiste
   * interesa ver cuales si. Al definir los festivos de un centro no se pinta.
   */
  asiste: boolean;
  dentro: boolean;
  finDeSemana: boolean;
  limite: boolean;
}

/** Geometria comun a las celdas del calendario y a las muestras de la leyenda. */
export const CLASE_CELDA =
  'rounded text-[10px] leading-none flex items-center justify-center transition-colors duration-150';

/**
 * Clases de una celda del calendario, decididas en un solo sitio.
 *
 * La leyenda del modal pinta celdas de muestra con estas mismas clases. Es
 * justo por tenerlas duplicadas a mano por lo que la leyenda se desincronizo
 * del calendario: mostraba un anillo donde el calendario no ponia ninguno. Si
 * el resaltado cambia aqui, cambia a la vez en los dos sitios.
 *
 * Se devuelven sueltas en vez de una sola cadena porque `color` y `contorno`
 * son propiedades distintas y quien las usa puede pegarles encima lo suyo sin
 * que una pise a la otra: un dia festivo en la frontera del curso lleva las
 * dos.
 */
export function estilosCelda({ marcado, asiste, dentro, finDeSemana, limite }: EstadoCelda) {
  // Una sola clase de color por celda. Apilar dos utilidades de color en el
  // mismo elemento no vale: ambas tienen la misma especificidad, asi que gana
  // la que Tailwind coloque despues en la hoja de estilos, no la que se
  // escriba despues aqui.
  //
  // El festivo va con relleno `danger-soft` y texto `danger-strong`, no rojo
  // solido: en tema oscuro `--color-danger` es un rojo claro y un texto blanco
  // encima seria ilegible. Ese par si se lee en los dos temas. El verde de los
  // dias lectivos usa el mismo par simetrico.
  //
  // El orden es el orden de lo que se quiere poder distinguir: primero si el
  // dia se pierde, despues si esta fuera de donde se edita, y solo entonces si
  // es lectivo. Un festivo que cae en fin de semana o en el limite sigue
  // siendo festivo, asi que lo rojo no se pierde por ganar otra cosa.
  const color = marcado
    ? 'bg-danger-soft text-danger-strong'
    : !dentro
      ? 'text-text-muted/30'
      : asiste
        ? 'bg-success-soft text-success-strong'
        : finDeSemana
          ? 'text-danger/70'
          : 'text-text-main';

  return {
    color,
    peso: marcado || asiste ? 'font-bold' : 'font-medium',
    contorno: limite ? 'outline-2 outline-primary outline-offset-[-2px]' : '',
  };
}
