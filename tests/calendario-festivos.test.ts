import { describe, it, expect } from 'vitest';
import {
  alternarFestivo, aniosDelRango, celdasDeMes, celdasVaciasIniciales, claveDesdePartes,
  diasDelRango, diasEnMes, diaSemana, diasLaborablesEnRango, esClaveValida, esFinDeSemana,
  estaEnRango, estilosCelda, filtrarPorRango, festivosFueraDeRango, mesesDelRango,
  nombreDiaSemana, partes, rangoEsValido,
} from '../src/lib/calendarioFestivos.ts';

/**
 * El calendario de festivos se dibuja en meses apilados, asi que lo que se
 * comprueba aqui es que el recorrido de los dias cuadre con el calendario real:
 * cuantos dias tiene cada mes, en que dia de la semana cae el 1, y que el rango
 * del curso se traduzca en los meses correctos.
 *
 * Un curso academico tipico va de septiembre a junio, o sea que cruza el cambio
 * de ano: por eso se prueban sobre todo los casos que atraviesan el 31 de diciembre.
 */

// 2025-09-15 es lunes y 2026-06-30 es martes. Se comprueba contra un calendario
// conocido para detectar cualquier desplazamiento.
describe('partes y claves', () => {
  it('descompone una clave en sus partes', () => {
    expect(partes('2025-09-15')).toEqual({ anio: 2025, mes: 9, dia: 15 });
  });

  it('rechaza lo que no es una fecha', () => {
    expect(partes('')).toBeNull();
    expect(partes('2025-9-15')).toBeNull();     // mes sin cero delante
    expect(partes('15/09/2025')).toBeNull();   // separadores otros
    expect(partes('2025-13-01')).toBeNull();   // mes inexistente
    expect(partes('2025-02-30')).toBeNull();   // dia que no existe en febrero
    expect(partes('2025-09-32')).toBeNull();
  });

  it('acepta el 29 de febrero de un ano bisiesto y lo rechaza en el resto', () => {
    expect(esClaveValida('2028-02-29')).toBe(true);
    expect(esClaveValida('2027-02-29')).toBe(false);
    expect(esClaveValida('2026-02-29')).toBe(false);
  });

  it('construye la clave con el mes en base 1', () => {
    expect(claveDesdePartes(2025, 9, 5)).toBe('2025-09-05');
  });
});

describe('diasEnMes', () => {
  it('sabe cuantos dias tiene cada mes', () => {
    expect(diasEnMes(2025, 0)).toBe(31);   // enero
    expect(diasEnMes(2025, 1)).toBe(28);   // febrero 2025
    expect(diasEnMes(2024, 1)).toBe(29);   // febrero bisiesto
    expect(diasEnMes(2000, 1)).toBe(29);   // divisible entre 400: bisiesto
    expect(diasEnMes(1900, 1)).toBe(28);   // divisible entre 100 pero no 400
    expect(diasEnMes(2025, 3)).toBe(30);   // abril
    expect(diasEnMes(2025, 11)).toBe(31);  // diciembre
  });
});

describe('diaSemana', () => {
  it('cuenta del lunes (1) al domingo (7)', () => {
    // 2025-09-15 lunes ... 2025-09-21 domingo
    const semana = ['2025-09-15', '2025-09-16', '2025-09-17', '2025-09-18',
                    '2025-09-19', '2025-09-20', '2025-09-21'];
    expect(semana.map(diaSemana)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('reconoce fines de semana', () => {
    expect(esFinDeSemana('2025-09-20')).toBe(true);  // sabado
    expect(esFinDeSemana('2025-09-21')).toBe(true);  // domingo
    expect(esFinDeSemana('2025-09-19')).toBe(false); // viernes
    expect(esFinDeSemana('no-es-fecha')).toBe(false);
  });
});

describe('rangoEsValido', () => {
  it('exige dos fechas reales y en orden', () => {
    expect(rangoEsValido({ inicio: '2025-09-01', fin: '2026-06-30' })).toBe(true);
    expect(rangoEsValido({ inicio: '2025-09-01', fin: '2025-09-01' })).toBe(true); // un solo dia
    expect(rangoEsValido({ inicio: '2026-06-30', fin: '2025-09-01' })).toBe(false); // invertido
    expect(rangoEsValido({ inicio: '', fin: '2025-09-01' })).toBe(false);
    expect(rangoEsValido({ inicio: 'basura', fin: 'otro-basura' })).toBe(false);
    expect(rangoEsValido(null)).toBe(false);
    expect(rangoEsValido(undefined)).toBe(false);
  });
});

describe('mesesDelRango', () => {
  it('devuelve un unico mes si el rango cae entero en el', () => {
    const meses = mesesDelRango({ inicio: '2025-03-04', fin: '2025-03-28' });
    expect(meses).toEqual([{ anio: 2025, mes: 2 }]);
  });

  it('recorre los diez meses de un curso de septiembre a junio', () => {
    const meses = mesesDelRango({ inicio: '2025-09-15', fin: '2026-06-30' });
    expect(meses).toEqual([
      { anio: 2025, mes: 8 },  { anio: 2025, mes: 9 },  { anio: 2025, mes: 10 },
      { anio: 2025, mes: 11 }, { anio: 2026, mes: 0 },  { anio: 2026, mes: 1 },
      { anio: 2026, mes: 2 },  { anio: 2026, mes: 3 },  { anio: 2026, mes: 4 },
      { anio: 2026, mes: 5 },
    ]);
  });

  it('incluye los dos extremos cuando caen en meses distintos', () => {
    const meses = mesesDelRango({ inicio: '2025-09-30', fin: '2025-10-01' });
    expect(meses).toEqual([{ anio: 2025, mes: 8 }, { anio: 2025, mes: 9 }]);
  });

  it('no da meses para rangos imposibles', () => {
    expect(mesesDelRango({ inicio: '2026-06-30', fin: '2025-09-01' })).toEqual([]);
    expect(mesesDelRango({ inicio: '', fin: '' })).toEqual([]);
    expect(mesesDelRango(null)).toEqual([]);
  });
});

describe('celdasDeMes y celdasVaciasIniciales', () => {
  it('devuelve un dia por cada dia del mes, en orden', () => {
    const celdas = celdasDeMes(2025, 8); // septiembre 2025
    expect(celdas).toHaveLength(30);
    expect(celdas[0]).toEqual({ clave: '2025-09-01', dia: 1, diaSemana: 1 });
    expect(celdas[29]).toEqual({ clave: '2025-09-30', dia: 30, diaSemana: 2 });
  });

  it('no se salta dias en la cuenta', () => {
    const claves = celdasDeMes(2026, 1).map(c => c.clave); // febrero 2026
    expect(claves[0]).toBe('2026-02-01');
    expect(claves[claves.length - 1]).toBe('2026-02-28');
    expect(new Set(claves).size).toBe(28);
  });

  it('cuenta bien febrero en un ano bisiesto', () => {
    expect(celdasDeMes(2028, 1)).toHaveLength(29);
  });

  it('indica cuantas celdas vacias hay que poner para alinear el dia 1', () => {
    // Con la semana empezando en lunes, el desplazamiento del dia 1 es
    // exactamente su posicion: lunes 0, martes 1, ... domingo 6.
    expect(celdasVaciasIniciales(2025, 8)).toBe(0);  // 1 sep 2025, lunes
    expect(celdasVaciasIniciales(2025, 9)).toBe(2);  // 1 oct 2025, miercoles
    expect(celdasVaciasIniciales(2025, 10)).toBe(5); // 1 nov 2025, sabado
    expect(celdasVaciasIniciales(2025, 11)).toBe(0); // 1 dic 2025, lunes
    expect(celdasVaciasIniciales(2026, 0)).toBe(3);  // 1 ene 2026, jueves
    expect(celdasVaciasIniciales(2026, 1)).toBe(6);  // 1 feb 2026, domingo
    expect(celdasVaciasIniciales(2026, 5)).toBe(0);  // 1 jun 2026, lunes
  });
});

describe('aniosDelRango', () => {
  it('cubre los dos anos naturales de un curso', () => {
    expect(aniosDelRango({ inicio: '2025-09-15', fin: '2026-06-30' })).toEqual([2025, 2026]);
  });

  it('devuelve un solo ano si el curso no cambia de ano', () => {
    expect(aniosDelRango({ inicio: '2025-01-10', fin: '2025-12-31' })).toEqual([2025]);
  });

  it('no da anos para rangos imposibles', () => {
    expect(aniosDelRango(null)).toEqual([]);
  });
});

describe('estaEnRango', () => {
  const rango = { inicio: '2025-09-15', fin: '2026-06-30' };

  it('incluye los dos extremos del curso', () => {
    expect(estaEnRango('2025-09-15', rango)).toBe(true);
    expect(estaEnRango('2026-06-30', rango)).toBe(true);
  });

  it('excluye lo que cae antes o despues', () => {
    expect(estaEnRango('2025-09-14', rango)).toBe(false);
    expect(estaEnRango('2026-07-01', rango)).toBe(false);
    expect(estaEnRango('2027-01-01', rango)).toBe(false);
  });

  it('devuelve false ante fechas invalidas o sin rango', () => {
    expect(estaEnRango('basura', rango)).toBe(false);
    expect(estaEnRango('2025-10-01', null)).toBe(false);
  });
});

describe('alternarFestivo', () => {
  it('anade si no estaba y quita si estaba', () => {
    expect(alternarFestivo([], '2025-10-12')).toEqual(['2025-10-12']);
    expect(alternarFestivo(['2025-10-12'], '2025-10-12')).toEqual([]);
  });

  it('mantiene el orden cronologico', () => {
    const invertido = ['2026-01-01', '2025-10-12', '2025-12-06'];
    expect(alternarFestivo(invertido, '2025-11-03')).toEqual([
      '2025-10-12', '2025-11-03', '2025-12-06', '2026-01-01',
    ]);
  });

  it('elimina duplicados heredados antes de alternar', () => {
    // Una lista con repeticiones no debe crear mas duplicados al alternar.
    expect(alternarFestivo(['2025-10-12', '2025-10-12'], '2025-11-03')).toEqual([
      '2025-10-12', '2025-11-03',
    ]);
  });

  it('no muta el array recibido', () => {
    const original = ['2025-10-12'];
    alternarFestivo(original, '2025-11-03');
    expect(original).toEqual(['2025-10-12']);
  });
});

describe('filtrarPorRango', () => {
  const rango = { inicio: '2025-09-15', fin: '2026-06-30' };

  it('deja solo lo que cae dentro, en orden y sin duplicados', () => {
    const entrada = ['2026-07-01', '2025-10-12', '2025-09-14', '2026-01-01', '2025-10-12'];
    expect(filtrarPorRango(entrada, rango)).toEqual(['2025-10-12', '2026-01-01']);
  });

  it('conserva los dos limites del curso', () => {
    expect(filtrarPorRango(['2025-09-15', '2026-06-30'], rango)).toEqual([
      '2025-09-15', '2026-06-30',
    ]);
  });

  it('descarta tambien las fechas que no son fechas', () => {
    expect(filtrarPorRango(['basura', '2025-10-12'], rango)).toEqual(['2025-10-12']);
  });

  it('no deja pasar nada si el rango no es valido', () => {
    expect(filtrarPorRango(['2025-10-12'], null)).toEqual([]);
    expect(filtrarPorRango(['2025-10-12'], { inicio: '2026-06-30', fin: '2025-09-01' })).toEqual([]);
  });
});

describe('festivosFueraDeRango', () => {
  const rango = { inicio: '2025-09-15', fin: '2026-06-30' };

  it('cuenta los que se perderian al guardar', () => {
    expect(festivosFueraDeRango(['2025-10-12', '2024-01-01', '2027-05-05'], rango)).toBe(2);
  });

  it('no cuenta dos veces el mismo dia repetido', () => {
    expect(festivosFueraDeRango(['2024-01-01', '2024-01-01'], rango)).toBe(1);
  });

  it('devuelve cero cuando todo esta dentro', () => {
    expect(festivosFueraDeRango(['2025-10-12', '2026-01-01'], rango)).toBe(0);
  });
});

describe('nombreDiaSemana', () => {
  it('devuelve el nombre con el que el horario nombra los dias', () => {
    expect(nombreDiaSemana('2025-09-15')).toBe('lunes');
    expect(nombreDiaSemana('2025-09-16')).toBe('martes');
    expect(nombreDiaSemana('2025-09-17')).toBe('miercoles');
    expect(nombreDiaSemana('2025-09-18')).toBe('jueves');
    expect(nombreDiaSemana('2025-09-19')).toBe('viernes');
    expect(nombreDiaSemana('2025-09-20')).toBe('sabado');
    expect(nombreDiaSemana('2025-09-21')).toBe('domingo');
  });

  it('devuelve null si la clave no es una fecha', () => {
    expect(nombreDiaSemana('basura')).toBeNull();
  });
});

describe('diasDelRango', () => {
  it('devuelve cada dia del rango, en orden y con los dos extremos', () => {
    const dias = diasDelRango({ inicio: '2025-09-29', fin: '2025-10-02' });
    expect(dias).toEqual(['2025-09-29', '2025-09-30', '2025-10-01', '2025-10-02']);
  });

  it('un rango de un solo dia devuelve ese dia', () => {
    expect(diasDelRango({ inicio: '2025-10-12', fin: '2025-10-12' })).toEqual(['2025-10-12']);
  });

  it('no se salta el cambio de ano ni el de mes', () => {
    const diciembre = diasDelRango({ inicio: '2025-12-30', fin: '2026-01-02' });
    expect(diciembre).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
  });

  it('cuenta bien los dias de febrero en un ano bisiesto', () => {
    // 2028 es bisiesto, 2027 no. Si el recorrido sumase dias con la hora local,
    // el cambio de hora de verano de marzo de uno y otro ano lo descuadraria.
    expect(diasDelRango({ inicio: '2028-02-28', fin: '2028-03-01' })).toEqual([
      '2028-02-28', '2028-02-29', '2028-03-01',
    ]);
    expect(diasDelRango({ inicio: '2027-02-28', fin: '2027-03-01' })).toEqual([
      '2027-02-28', '2027-03-01',
    ]);
  });

  it('un curso de septiembre a junio son los dias que tiene, sin repeticiones', () => {
    const dias = diasDelRango({ inicio: '2025-09-15', fin: '2026-06-30' });
    expect(new Set(dias).size).toBe(dias.length);
    expect(dias[0]).toBe('2025-09-15');
    expect(dias[dias.length - 1]).toBe('2026-06-30');
    // 15 de septiembre a 30 de junio, ambos incluidos.
    expect(dias).toHaveLength(289);
  });

  it('no da dias para rangos imposibles', () => {
    expect(diasDelRango({ inicio: '2026-06-30', fin: '2025-09-01' })).toEqual([]);
    expect(diasDelRango({ inicio: '', fin: '' })).toEqual([]);
    expect(diasDelRango(null)).toEqual([]);
  });
});

/**
 * El "dia que va a la empresa" sale del horario de la relacion y no de un
 * calendario generico: si el convenio trabaja los sabados, el sabado cuenta
 * como dia de trabajo, y si no, no.
 */
describe('diasLaborablesEnRango', () => {
  const LAV = new Set(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
  const semana = { inicio: '2025-09-15', fin: '2025-09-21' };  // lunes a domingo

  it('son los dias con horas del horario, dentro del periodo', () => {
    const laborables = diasLaborablesEnRango(semana, LAV);
    expect([...laborables].sort()).toEqual([
      '2025-09-15', '2025-09-16', '2025-09-17', '2025-09-18', '2025-09-19',
    ]);
  });

  it('incluye el sabado si el horario tiene horas ahi, pero no el domingo', () => {
    const conSabado = new Set([...LAV, 'sabado']);
    const laborables = diasLaborablesEnRango(semana, conSabado);
    expect(laborables.has('2025-09-20')).toBe(true);
    expect(laborables.has('2025-09-21')).toBe(false);
  });

  it('un horario sin horas en ningun dia no labora ninguno', () => {
    expect(diasLaborablesEnRango(semana, new Set()).size).toBe(0);
  });

  it('no labora nada sin periodo valido', () => {
    expect(diasLaborablesEnRango({ inicio: '2026-06-30', fin: '2025-09-01' }, LAV).size).toBe(0);
    expect(diasLaborablesEnRango(null, LAV).size).toBe(0);
  });

  /**
   * El editor de dias recalcula estos laborables sobre el periodo estimado del
   * alumno, que se mueve con cada dia que marca. Estas pruebas fijan que el
   * conjunto responde al periodo y no se queda anclado al primero que vio: si se
   * quedara, al desmarcar un festivo el fin se adelantaria pero los dias de la
   * cola seguirian en verde, y el contador de dias que ira a la empresa
   * subiria en vez de bajar.
   */
  it('se acorta con el periodo, sin dejar dias sueltos por ahi', () => {
    const largo = diasLaborablesEnRango({ inicio: '2025-09-15', fin: '2025-09-21' }, LAV);
    const corto = diasLaborablesEnRango({ inicio: '2025-09-15', fin: '2025-09-17' }, LAV);

    expect(largo.size).toBe(5);
    expect(corto.size).toBe(3);
    // Todo lo que queda en el corto estaba en el largo: acortar solo puede
    // quitar dias, nunca cambiarlos.
    expect([...corto].every(d => largo.has(d))).toBe(true);
    expect(corto.has('2025-09-19')).toBe(false);
  });

  it('se alarga con el periodo, y los dias nuevos se anaden', () => {
    const corto = diasLaborablesEnRango({ inicio: '2025-09-15', fin: '2025-09-17' }, LAV);
    const largo = diasLaborablesEnRango({ inicio: '2025-09-15', fin: '2025-09-19' }, LAV);

    expect([...largo].filter(d => !corto.has(d))).toEqual(['2025-09-18', '2025-09-19']);
  });

  it('menos los marcados deja los dias que el alumno asiste, que son los que van en verde', () => {
    // Es la cuenta que se muestra en la leyenda.
    const laborables = diasLaborablesEnRango(semana, LAV);
    const marcados = new Set(['2025-09-16', '2025-09-18']);   // martes y jueves
    const asiste = new Set([...laborables].filter(d => !marcados.has(d)));

    expect(asiste.size).toBe(3);
    expect([...asiste].sort()).toEqual(['2025-09-15', '2025-09-17', '2025-09-19']);
    // Un festivo en un dia sin horario no resta nada: de ese dia no se iba a ir
    // igualmente, asi que el total no llega a todos los dias del periodo.
    expect(asiste.size + marcados.size).toBeLessThan(diasDelRango(semana).length);
  });
});

/**
 * `estilosCelda` la usan las celdas del calendario y las muestras de la
 * leyenda, asi que estas pruebas son tambien la garantia de que la leyenda no
 * se separa de lo que pinta el calendario: si cambia el aspecto de un estado,
 * cambia en los dos sitios por definicion.
 */
describe('estilosCelda', () => {
  const base = { marcado: false, asiste: false, dentro: true, finDeSemana: false, limite: false };

  it('el festivo gana con relleno y texto legible en los dos temas', () => {
    const e = estilosCelda({ ...base, marcado: true });
    expect(e.color).toBe('bg-danger-soft text-danger-strong');
    expect(e.peso).toBe('font-bold');
  });

  it('el festivo gana aunque el dia sea fin de semana o limite del curso', () => {
    const festivoDeSabado = estilosCelda({ ...base, marcado: true, finDeSemana: true });
    const festivoEnElLimite = estilosCelda({ ...base, marcado: true, limite: true });
    expect(festivoDeSabado.color).toBe('bg-danger-soft text-danger-strong');
    expect(festivoEnElLimite.color).toBe('bg-danger-soft text-danger-strong');
    // El limite se dibuja aparte, para que las dos señales coexistan.
    expect(festivoEnElLimite.contorno).not.toBe('');
  });

  it('un festivo guardado que cae fuera del curso se sigue viendo como festivo', () => {
    // Es un caso real: al guardar se descartan los dias fuera de rango, pero
    // hasta entonces un festivo de un curso anterior sigue marcado. Se ve, para
    // que el usuario vea que hay algo que se va a perder.
    const e = estilosCelda({ ...base, dentro: false, marcado: true });
    expect(e.color).toBe('bg-danger-soft text-danger-strong');
  });

  it('fuera del curso gana a fin de semana', () => {
    const e = estilosCelda({ ...base, dentro: false, finDeSemana: true });
    expect(e.color).toBe('text-text-muted/30');
  });

  it('el limite del curso no toca el color del numero', () => {
    const e = estilosCelda({ ...base, limite: true });
    expect(e.contorno).toContain('outline-primary');
    expect(e.color).toBe('text-text-main');
  });

  it('un dia normal no lleva relleno ni contorno', () => {
    const e = estilosCelda(base);
    expect(e.contorno).toBe('');
    expect(e.peso).toBe('font-medium');
    expect(e.color).toBe('text-text-main');
  });

  it('el fin de semana solo cambia el color del numero', () => {
    expect(estilosCelda({ ...base, finDeSemana: true }).color).toBe('text-danger/70');
  });

  it('el dia lectivo va en verde con el par del festivo, para que se lea en los dos temas', () => {
    // El par es el simetrico del festivo: relleno suave y texto fuerte. Con
    // verde solido, en tema oscuro el texto blanco encima seria ilegible, que
    // es justo el problema que el rojo ya tenia y por eso usa relleno.
    const e = estilosCelda({ ...base, asiste: true });
    expect(e.color).toBe('bg-success-soft text-success-strong');
    expect(e.peso).toBe('font-bold');
  });

  it('el dia lectivo gana a fin de semana, porque el horario manda sobre el dia de la semana', () => {
    // Un convenio que trabaja los sabados tiene sabados lectivos, y el verde
    // tiene que ganar al rojo atenuado del fin de semana.
    expect(estilosCelda({ ...base, asiste: true, finDeSemana: true }).color)
      .toBe('bg-success-soft text-success-strong');
  });

  it('el festivo le gana al dia lectivo: no puede ser las dos cosas', () => {
    // El verde se calcula como laborables menos marcados, asi que en el
    // calendario real nunca coinciden. Se fija el orden de todos modos, porque
    // si un dia se marcara y a la vez se considerara laborable, tiene que verse
    // como festivo: es el estado que se puede quitar.
    expect(estilosCelda({ ...base, asiste: true, marcado: true }).color)
      .toBe('bg-danger-soft text-danger-strong');
  });

  it('fuera del periodo gana al dia lectivo', () => {
    // Un dia laborable que no se esta editando se apaga igual que cualquier otro.
    expect(estilosCelda({ ...base, asiste: true, dentro: false }).color)
      .toBe('text-text-muted/30');
  });
});
