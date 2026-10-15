import React from 'react';
import {
  celdasDeMes, celdasVaciasIniciales, esFinDeSemana, estaEnRango, mesesDelRango,
  CLASE_CELDA, DIAS_SEMANA, estilosCelda, NOMBRES_MES, type RangoCurso,
} from '../../lib/calendarioFestivos.ts';
import { formatDate } from '../../lib/dateUtils.ts';

interface CalendarioFestivosProps {
  rango: RangoCurso;
  festivos: Set<string>;
  /** Sin `onToggle` el calendario es de solo lectura: se ve pero no se marca. */
  onToggle?: (clave: string) => void;
  /**
   * Dias lectivos del alumno, para teñirlos de verde. Es opcional porque al
   * definir los festivos de un centro o de una empresa no hay nadie a quien
   * atribuir los dias que quedan: solo interesa lo contrario, los que se caen.
   */
  asiste?: Set<string>;
}

/**
 * Meses del curso en rejilla, varios por fila hasta ocupar el ancho.
 *
 * Lo que hay que leer aqui es "que dias estan marcados", no un calendario
 * legible dia a dia. Por eso los meses van pequenos y en bloque, y el alto
 * depende de cuantas filas hagan falta, no de cuantos meses tenga el curso: uno
 * de septiembre a junio son diez meses, que entran en dos o tres filas.
 *
 * Solo pinta: el estado de los dias vive en el modal que la contiene, que es
 * quien decide que hacer al pulsar. Un dia fuera del rango se muestra atenuado
 * pero no es pulsable, para que se vea la forma del mes sin sugerir que se
 * puede marcar.
 *
 * El rango no tiene por que ser el del curso: al editar los dias de un alumno
 * es su periodo, de fecha inicio a fecha fin estimada, que es lo unico que le
 * afecta.
 */
export function CalendarioFestivos({ rango, festivos, onToggle, asiste }: CalendarioFestivosProps) {
  const meses = mesesDelRango(rango).map(({ anio, mes }) => ({
    anio, mes,
    celdas: celdasDeMes(anio, mes),
    vacias: celdasVaciasIniciales(anio, mes),
  }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
      {meses.map(({ anio, mes, celdas, vacias }) => (
        <section
          key={`${anio}-${mes}`}
          className="rounded-xl border border-border-base bg-surface-subtle/60 p-2.5"
        >
          <h4 className="text-[11px] font-bold text-text-main text-center mb-1.5 truncate">
            {NOMBRES_MES[mes]} {anio}
          </h4>

          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {DIAS_SEMANA.map(d => (
              <div
                key={d}
                className={`text-center text-[9px] font-bold uppercase ${
                  d === 'S' || d === 'D' ? 'text-danger/60' : 'text-text-muted'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: vacias }).map((_, i) => (
              <div key={`vacio-${i}`} />
            ))}
            {celdas.map(({ clave, dia }) => {
              const marcado = festivos.has(clave);
              const va = asiste?.has(clave) ?? false;
              const habilitado = estaEnRango(clave, rango);
              const estilo = estilosCelda({
                marcado,
                asiste: va,
                dentro: habilitado,
                finDeSemana: esFinDeSemana(clave),
                limite: clave === rango.inicio || clave === rango.fin,
              });

              return (
                <button
                  key={clave}
                  type="button"
                  disabled={!habilitado}
                  onClick={() => onToggle?.(clave)}
                  title={[
                    formatDate(clave),
                    marcado ? 'no asiste' : va ? 'va a la empresa' : '',
                    habilitado ? '' : 'fuera del periodo',
                  ].filter(Boolean).join(' · ')}
                  className={[
                    CLASE_CELDA,
                    'aspect-square',
                    estilo.peso,
                    // El hover va en el mismo color que la celda: si un dia
                    // lectivo se ilumina en azul al pasar por encima, parece que
                    // va a cambiar a festivo, que es justo lo contrario de lo
                    // que significa.
                    onToggle && habilitado && !marcado
                      ? va ? 'hover:bg-success/25' : 'hover:bg-primary-light hover:text-primary'
                      : '',
                    !habilitado || !onToggle ? 'cursor-default' : '',
                    estilo.contorno,
                    estilo.color,
                  ].join(' ')}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
