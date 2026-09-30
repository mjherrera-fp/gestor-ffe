import type { FestivoPersonalizado, TipoFestivoPersonalizado } from '../types/index.ts';

/**
 * Días no lectivos de un alumno, a partir de los que hereda y de sus preferencias.
 *
 * Un alumno no tiene una lista propia de días no lectivos: hereda los del centro
 * educativo y los de la ciudad de la empresa, y sobre esa lista la interfaz le
 * deja hacer dos cosas, una por cada sentido:
 *
 *   - Quitar un festivo heredado porque ese alumno sí asiste. El día deja de
 *     descontarse, se acumulan horas y la fecha fin se acorta.
 *   - Añadir un día en el que no asiste aunque no sea festivo. Se descuenta y la
 *     fecha fin se retrasa.
 *
 * Aquí vive el álgebra de esas dos operaciones. Es un módulo puro, sin React ni
 * acceso a la base de datos, porque lo usan tanto el renderer como `server.ts`:
 * el cálculo de la fecha fin se hace en los dos lados y no pueden discrepar.
 *
 * Lo que se guarda es el desvío (`QUITAR`/`ANADIR`) y no la lista efectiva. Si el
 * profesor añade un festivo al centro más adelante, el alumno lo recibe sin que
 * haya que reescribir sus filas, y una preferencia ya expresada sigue valiendo.
 */

/** Los días no lectivos que hereda el alumno, antes de sus preferencias. */
export type FestivosHeredados = {
  centro: string[];
  usarCentro: boolean;
  empresa: string[];
  usarEmpresa: boolean;
};

/**
 * Une los dos orígenes heredados respetando los dos interruptores.
 *
 * Los interruptores son globales (`usar_festivos` y `usar_festivos_empresa` en la
 * configuración del profesor) y se aplican aquí, no en el llamante, para que
 * frontend y servidor los lean en el mismo sitio.
 */
export function festivosHeredados({ centro, usarCentro, empresa, usarEmpresa }: FestivosHeredados): string[] {
  const set = new Set<string>();
  if (usarCentro) for (const f of centro) set.add(f);
  if (usarEmpresa) for (const f of empresa) set.add(f);
  return [...set].sort();
}

/**
 * Aplica el desvío del alumno sobre la lista heredada y devuelve los días no
 * lectivos que le tocan de verdad.
 *
 * Es la función que hay que usar para saltar días en cualquier cálculo, y para
 * pintar el calendario del alumno. Un mismo día no puede estar a la vez en las
 * dos listas, así que `ANADIR` gana sobre `QUITAR`.
 */
export function aplicarPersonalizados(heredados: string[], personalizados?: FestivoPersonalizado[]): string[] {
  if (!personalizados || personalizados.length === 0) return [...new Set(heredados)].sort();

  const fechas = (tipo: TipoFestivoPersonalizado) =>
    new Set(personalizados.filter(p => p.tipo === tipo).map(p => p.fecha));

  const quitar = fechas('QUITAR');
  const anadir = fechas('ANADIR');

  // Empezar por los heredados y quitar los `QUITAR` deja que un `ANADIR` sobre
  // un día heredado sobreviva, que es lo correcto: el alumno no asiste.
  const resultado = new Set(heredados.filter(f => !quitar.has(f)));
  for (const f of anadir) resultado.add(f);
  return [...resultado].sort();
}

/**
 * Traduce la lista que devuelve el editor a filas de desvío.
 *
 * El editor trabaja con la lista efectiva, que es cómodo de mostrar: se ve el
 * conjunto completo y se desmarca lo que corresponda. Aquí se deshace esa
 * edición para guardar solo la diferencia respecto a lo heredado.
 */
export function deltaPersonalizados(heredados: string[], efectivos: string[]): FestivoPersonalizado[] {
  const heredado = new Set(heredados);
  const efectivo = new Set(efectivos);

  const quitar: string[] = [];
  const anadir: string[] = [];
  for (const f of efectivo) if (!heredado.has(f)) anadir.push(f);
  for (const f of heredado) if (!efectivo.has(f)) quitar.push(f);

  return [
    ...quitar.sort().map(fecha => ({ fecha, tipo: 'QUITAR' as const })),
    ...anadir.sort().map(fecha => ({ fecha, tipo: 'ANADIR' as const })),
  ];
}

/**
 * El conjunto de días a saltar, listo para los bucles que suman horas.
 *
 * Recibe un `Set` porque los llamantes del servidor ya lo tienen: el conjunto
 * heredado se calcula y se cachea una vez por convenio, y de ahí sale el mismo
 * `Set` para todos los alumnos de ese convenio. Aplicar las preferencias de un
 * alumno no debe invalidar esa cache, así que se deriva un `Set` nuevo solo
 * cuando el alumno tiene alguna, y se devuelve la misma instancia cuando no.
 *
 * Devolver la instancia original importa: estos bucles se ejecutan por alumno y
 * por documento, y reservar un `Set` nuevo en cada llamada es trabajo tirar para
 * nada en el caso común, que es el alumno sin días propios.
 */
export function conjuntoSaltar(base: Set<string>, personalizados?: FestivoPersonalizado[]): Set<string> {
  if (!personalizados || personalizados.length === 0) return base;

  const quitar = new Set(personalizados.filter(p => p.tipo === 'QUITAR').map(p => p.fecha));
  const resultado = new Set<string>();
  for (const f of base) if (!quitar.has(f)) resultado.add(f);
  for (const p of personalizados) if (p.tipo === 'ANADIR') resultado.add(p.fecha);
  return resultado;
}
