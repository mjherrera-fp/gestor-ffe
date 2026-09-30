import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from '../src/lib/dateUtils.ts';

/**
 * `formatDate` se usa en toda la interfaz y en todos los documentos, asi que
 * su contrato importa mas de lo que parece.
 *
 * Lo que se fija aqui son dos decisiones. La primera, que las fechas salen en
 * `dd/MM/yyyy`, que es la convencion de la aplicacion. La segunda, y mas
 * importante, que se parte la cadena de texto en vez de construir un `Date`.
 * Una cadena 'YYYY-MM-DD' se interpreta por especificacion como medianoche UTC,
 * de modo que `new Date(iso).getDate()` devuelve el dia anterior en cualquier
 * huso por detras de UTC. Una fecha guardada en la base de datos no puede
 * cambiar de dia segun la maquina donde se abre el documento.
 */
describe('formatDate', () => {
  it('formatea una fecha solo-fecha en dd/MM/yyyy', () => {
    expect(formatDate('2025-09-15')).toBe('15/09/2025');
  });

  it('rellena con ceros el dia y el mes que de un solo digito', () => {
    expect(formatDate('2025-01-05')).toBe('05/01/2025');
    expect(formatDate('2025-12-31')).toBe('31/12/2025');
  });

  it('no cambia de dia con independencia del huso horario', () => {
    // Este es el motivo de partir la cadena. Con `new Date(iso)` seguido de
    // getters locales, un usuario en un huso negativo veria el dia anterior.
    // Al no usar `Date` en ningun momento, el resultado es el mismo en todas
    // partes, y el test sigue valiendo sin manipulate el reloj del proceso.
    const casos = [
      '2025-01-01', // Cambio de ano: el error seria mas visible
      '2025-03-30', // Dia en que muchos paises cambian de huso
      '2025-06-15',
      '2025-10-26', // Dia en que se repite la hora
      '2025-12-31', // Fin de ano
    ];
    for (const iso of casos) {
      const [anio, mes, dia] = iso.split('-');
      expect(formatDate(iso)).toBe(`${dia}/${mes}/${anio}`);
    }
  });

  it('ignora la hora cuando la fecha viene con timestamp', () => {
    expect(formatDate('2025-09-15 14:30:00')).toBe('15/09/2025');
    expect(formatDate('2025-09-15T14:30:00')).toBe('15/09/2025');
  });

  // Antes estos valores llegaban a los documentos como 'Invalid Date':
  // `new Date('')` es una fecha invalida y `toLocaleDateString` la imprime
  // tal cual. Un alumno sin fecha de inicio es un caso real: al desvincularlo
  // de una relacion sus fechas se ponen a NULL.
  it('devuelve cadena vacia en vez de Invalid Date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('devuelve cadena vacia ante texto que no es una fecha', () => {
    expect(formatDate('no es una fecha')).toBe('');
    expect(formatDate('15/09/2025')).toBe('');
    expect(formatDate('2025')).toBe('');
  });

  it('rechaza meses y dias fuera de rango', () => {
    expect(formatDate('2025-13-01')).toBe('');
    expect(formatDate('2025-00-10')).toBe('');
    expect(formatDate('2025-01-32')).toBe('');
  });
});

/**
 * `formatDateTime` es distinto a proposito: las marcas de tiempo de SQLite se
 * guardan en UTC y aqui interesa verlas en hora local, que es como las ha
 * escrito el usuario. Por eso si usa `Date` y por eso no se toca al arreglar
 * `formatDate`.
 */
describe('formatDateTime', () => {
  // El resultado depende del huso de la maquina, asi que el valor esperado se
  // calcula con el mismo `Date` que usa la funcion. Comprobar una hora fija
  // haria fallar el test en cuanto alguien lo ejecutase fuera de su zona.
  const esperado = (iso: string): string => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    const [hh, mm, ss = 0] = iso.slice(11).split(':').map(Number);
    const f = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(f.getDate())}/${p(f.getMonth() + 1)}/${f.getFullYear()} ${p(f.getHours())}:${p(f.getMinutes())}:${p(f.getSeconds())}`;
  };

  it('convierte un timestamp UTC a dd/MM/yyyy HH:mm:ss local', () => {
    expect(formatDateTime('2025-09-15 14:30:00')).toBe(esperado('2025-09-15 14:30:00'));
  });

  it('rellena los segundos ausentes con cero', () => {
    expect(formatDateTime('2025-09-15 14:30')).toBe(esperado('2025-09-15 14:30:00'));
    expect(formatDateTime('2025-09-15 14:30')).toMatch(/:00$/);
  });

  it('devuelve cadena vacia ante valores vacios', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });

  it('devuelve la entrada tal cual si no trae hora', () => {
    expect(formatDateTime('2025-09-15')).toBe('2025-09-15');
  });
});
