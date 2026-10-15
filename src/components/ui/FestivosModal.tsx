import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarPlus, ExternalLink, Loader2, Trash2, X } from 'lucide-react';
import { Title } from '../Title.tsx';
import { Modal } from './Modal.tsx';
import { CalendarioFestivos } from './CalendarioFestivos.tsx';
import { formatDate } from '../../lib/dateUtils.ts';
import {
  alternarFestivo, aniosDelRango, CLASE_CELDA, diasLaborablesEnRango, estilosCelda,
  filtrarPorRango, festivosFueraDeRango, rangoEsValido, type EstadoCelda, type RangoCurso,
} from '../../lib/calendarioFestivos.ts';

/**
 * Leyenda: una celda de muestra por estado, con un dia dentro.
 *
 * Cada muestra se pinta con `estilosCelda`, la misma funcion que decide el
 * aspecto de las celdas de verdad, y lleva un numero dentro para que se vea el
 * color de la cifra y no solo el fondo del recuadro. La leyenda no elige ningun
 * color propio: si el calendario cambia, cambia con el.
 *
 * `total` es el numero de dias de ese estado en el periodo editado, y se pinta
 * entre parentesis al lado de la etiqueta. Es la respuesta a la pregunta que
 * uno se hace al abrir esto: cuantos dias se pierde y cuantos trabaja. Solo
 * tienen sentido los que se pueden contar sobre el rango que se esta viendo, de
 * ahi que el resto de entradas lo dejen a null.
 */
interface EntradaLeyenda {
  etiqueta: string;
  estado: EstadoCelda;
  total?: number;
}

interface FestivosModalProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  /**
   * El periodo que se pinta y en el que se puede marcar.
   *
   * Para el centro y para la empresa es el curso entero, y `null` si todavia no
   * hay ningun curso creado. Para los dias de un alumno es su periodo, de
   * fecha inicio a fecha fin estimada: los meses anteriores o posteriores no le
   * afectan, asi que no se enseñan.
   */
  rango: RangoCurso | null;
  festivos: string[];
  /** Obligatorio salvo en `soloLectura`, donde no hay nada que guardar. */
  onSave?: (festivos: string[]) => void;
  /**
   * Slug de la localidad en calendariosnacionales.com. Lo resuelve quien abre
   * el modal, porque el centro educativo y la empresa sacan el slug de listas
   * distintas. Sin slug no se ofrece la importacion automatica.
   */
  slug?: string | null;
  /** Lleva a la seccion Cursos, para el caso de que no haya curso. */
  onIrACursos?: () => void;
  /**
   * Texto del boton de guardar. Por defecto "Guardar Festivos", que es lo que
   * encaja al editar el centro o la empresa; al editar los dias de un alumno
   * concreta "Guardar dias", porque no guarda los festivos del convenio entero.
   */
  textoGuardar?: string;
  /**
   * Z-index del overlay. El modal de relacion va dentro de otro modal, y sin
   * subirlo el editor de dias se dibujaria por debajo del que lo contiene.
   */
  zIndex?: number;
  /**
   * Dias de la semana con horas en el horario, por nombre ('lunes'...).
   *
   * Se pasan los nombres y no las fechas laborables porque el periodo cambia
   * mientras se edita: quien lo expande a fechas es el modal, sobre el rango que
   * se esta viendo. Si se expandieran aqui, se quedarian ancladas al periodo
   * guardado y los dias de la cola se quedarian en verde cuando el alumno ya
   * habria terminado antes.
   *
   * Si viene, el modal ademas de teñir en verde los dias que el alumno trabaja
   * y de contarlos en la leyenda, en lugar de solo marcar los que no asiste.
   *
   * Es lo que hace falta para responder "cuantos dias ira a la empresa": un
   * festivo se cuenta, pero un dia lectivo se deduce de los laborables menos los
   * que no asiste.
   */
  diasConHoras?: Set<string>;
  /**
   * Si al guardar se descartan los dias marcados que caen fuera del rango.
   *
   * Por defecto si, y es lo correcto al definir los festivos del curso: lo que
   * cae fuera pertenece a un curso anterior y no debe sobrevivir al guardado.
   *
   * Al editar los dias de un alumno tiene que ser `false`, porque su rango no
   * es el curso entero sino su periodo. Los dias que se marques y caigan fuera
   * de el se guardan igualmente: son la lista efectiva de todo el curso, que es
   * contra la que se calcula el desvio, y recortarla aqui convertiria en `QUITAR`
   * cada festivo que el alumno tenga despues de acabar. Esos dias no estarian mal
   * guardados, estarian haciendo que la fecha fin se acortase.
   */
  descartarFueraDeRango?: boolean;
  /**
   * Como llamar a lo que acota el rango, para las etiquetas de la leyenda. Por
   * defecto "curso"; al editar un alumno, "periodo".
   */
  nombreRango?: string;
  /**
   * Deducir, para el alumno, lo que se veria si se guardaran estos dias.
   *
   * Se lleva el calculo quien abre el modal porque es quien sabe cuantas horas
   * tiene el alumno y con que horario, que es lo que decide cuando termina. El
   * editor no guarda nada: solo pinta lo que le devuelven, y el guardado sigue
   * siendo el de `onSave`.
   *
   * De lo que devuelve se usa `fechaFin` para mover la rejilla, y no solo para
   * mostrarla: el periodo del alumno se acorta o se alarga segun los dias que
   * lleva marcados, y el calendario tiene que ir con el.
   *
   * Que sea devuelto y no escrito en el padre es a proposito: si el editor
   * actualizase al alumno al vuelo, cancelar dejaria la fecha cambiada y las
   * horas movidas sin que nadie lo hubiera pedido.
   */
  previewAlumno?: (festivos: string[]) => PreviewAlumno;
  /**
   * Solo enseña los dias, sin poder tocarlos. Es lo que se abre desde el
   * listado de relaciones al pulsar las fechas de un alumno: se consulta su
   * calendario, pero se edita desde el formulario de la relacion.
   */
  soloLectura?: boolean;
}

/** Lo que el editor enseña mientras se tocan los dias de un alumno. */
export interface PreviewAlumno {
  /** 'YYYY-MM-DD', o `null` si el horario no da para llegar a las horas. */
  fechaFin: string | null;
  /** Dias que se apartan de los festivos del convenio. */
  diasPropios: number;
}

/**
 * Editor de dias festivos sobre el calendario de un curso o de un alumno.
 *
 * Es el unico sitio donde se editan festivos, tanto los del centro educativo
 * como los de la empresa por localidad. No guarda nada por su cuenta: propone
 * el resultado a `onSave`, que es quien decide a donde va y quien cierra el
 * modal. En el centro, `onSave` hace el PUT y cierra solo si ha ido bien; en
 * configuracion, va a la lista de pendientes del formulario de configuracion
 * de festivos.
 */
export function FestivosModal({
  open, onClose, titulo, subtitulo, rango, festivos, onSave, slug, onIrACursos,
  textoGuardar = 'Guardar Festivos', zIndex, diasConHoras, descartarFueraDeRango = true,
  nombreRango = 'curso', previewAlumno, soloLectura = false,
}: FestivosModalProps) {
  const [dates, setDates] = useState<string[]>(festivos);
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState<string>('');
  const [errorImport, setErrorImport] = useState<string>('');
  const [preview, setPreview] = useState<PreviewAlumno | null>(null);

  // El borrador se resincroniza al ABRIR, no en cada cambio de `festivos`.
  // Quien lo abre suele pasar un array literal (`festivos || []`), que cambia
  // de identidad en cada render del padre: depender de el aqui borraria los
  // cambios del usuario a mitad de la edicion.
  const refFestivos = useRef(festivos);
  refFestivos.current = festivos;

  // Por lo mismo, el calculo de la previsualizacion se guarda en una ref y no
  // en el array de dependencias. Si fuera una dependencia, el padre suele
  // passar un arrow function nuevo en cada render, el efecto se reejecutaria,
  // pondria el estado otra vez, y el modal entraria en un bucle de renders.
  const refPreview = useRef(previewAlumno);
  refPreview.current = previewAlumno;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDates([...refFestivos.current]);
    setMensaje('');
    setErrorImport('');
    // El calendario arranca en el primer dia del curso, no donde se dejo la
    // ultima vez: es el punto de partida de quien abre el modal.
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open]);

  // Se recalcula en cada pulsacion, no solo al abrir. Es lo que hace que al
  // marcar un dia se vea cuantos dias se pierden y hasta cuando llega, y que
  // al desmarcar se vea lo que se recupera, sin tener que confirmar nada.
  useEffect(() => {
    if (!open) return;
    if (!refPreview.current) { setPreview(null); return; }
    setPreview(refPreview.current(dates));
  }, [open, dates]);

  const hayCurso = rangoEsValido(rango);
  const fueraDeRango = hayCurso && descartarFueraDeRango ? festivosFueraDeRango(dates, rango) : 0;

  /**
   * El periodo que se esta viendo, que no es el guardado.
   *
   * Al marcar un dia el alumno tarda mas en acabar, y al desmarcarlo menos. Si
   * la rejilla se midiera sobre el periodo guardado, el calendario y la fecha
   * fin estimada contarian dos cosas distintas: desmarcar un festivo pondria ese
   * dia en verde y dejaria en verde toda la cola que el alumno ya no iba a
   * alcanzar, y el contador de dias que ira a la empresa subiria en vez de
   * bajar. Marcarlo al reves tampoco se notaria, porque los dias nuevos caerian
   * fuera de la rejilla y no se verian aparecer.
   *
   * Con el rango vivo las dos cosas van a una: la rejilla se acorta cuando el
   * fin se adelanta y se alarga cuando se retrasa, y el verde aparece y desaparece
   * con ella.
   */
  const rangoVivo = useMemo(() => {
    if (!rango) return null;
    const fin = preview?.fechaFin || rango.fin;
    const candidato = { inicio: rango.inicio, fin };
    // Si la previsualizacion no llegara a una fecha usable se muestra el
    // guardado, antes que dejar la rejilla vacia a mitad de la edicion.
    return rangoEsValido(candidato) ? candidato : rango;
  }, [rango, preview?.fechaFin]);

  const rangoVisible = hayCurso ? rangoVivo : null;

  // Los laborables se expanden aqui y no en quien abre el modal, porque el
  // periodo se esta moviendo: expandirlos fuera los dejaria anclados al momento
  // en que se abrio el editor.
  const laborables = useMemo(
    () => (diasConHoras && rangoVisible ? diasLaborablesEnRango(rangoVisible, diasConHoras) : undefined),
    [diasConHoras, rangoVisible]
  );

  // Lo que se ve y lo que se cuenta son los dias del rango que se esta viendo.
  // Al definir los festivos del curso el rango es el curso y esto no cambia nada.
  // Al editar los dias de un alumno, su lista efectiva es la de todo el curso pero
  // lo unico que le afecta es su periodo: sin esto se contarian, y se darian por
  // quitables, dias que para el ya no existen.
  const marcados = useMemo(
    () => (rangoVisible ? filtrarPorRango(dates, rangoVisible) : dates),
    [dates, rangoVisible]
  );
  const marcadosSet = useMemo(() => new Set(marcados), [marcados]);

  // Se recalcula desde `marcadosSet` en cada pulsacion, no se guarda: si el
  // verde se calculara al abrir, marcar un dia nuevo no restaria ninguno de los
  // que el alumno asiste, y el numero de la leyenda no responderia a lo que se ve
  // justo encima.
  //
  // Un dia va a la empresa si el horario tiene horas ese dia y el alumno no lo
  // tiene marcado. Las dos condiciones: un festivo en un dia sin horario no
  // resta nada, porque ya no se iba a ir ese dia.
  const asiste = useMemo(
    () => (laborables
      ? new Set([...laborables].filter(d => !marcadosSet.has(d)))
      : undefined),
    [laborables, marcadosSet]
  );

  const handleToggle = (clave: string) => {
    setDates(prev => alternarFestivo(prev, clave));
  };

  // Solo se resalta cuando la fecha que se va a guardar es distinta de la que
  // hay guardada. Se compara con la guardada y no con el ultimo dia pintado,
  // porque es contra la guardada contra la que se decide si lo que se ve es un
  // cambio o ya estaba asi.
  const cambiaFin = !!preview && !!rango && (preview.fechaFin ?? null) !== rango.fin;

  const leyenda: EntradaLeyenda[] = [
    { etiqueta: 'Festivo', estado: { marcado: true, asiste: false, dentro: true, finDeSemana: false, limite: false }, total: marcados.length },
  ];
  if (asiste) {
    leyenda.push({
      etiqueta: 'Va a la empresa',
      estado: { marcado: false, asiste: true, dentro: true, finDeSemana: false, limite: false },
      total: asiste.size,
    });
  }
  leyenda.push(
    {
      etiqueta: `Límite del ${nombreRango}`,
      estado: { marcado: false, asiste: false, dentro: true, finDeSemana: false, limite: true },
    },
    {
      etiqueta: 'Fin de semana',
      estado: { marcado: false, asiste: false, dentro: true, finDeSemana: true, limite: false },
    },
    {
      etiqueta: `Fuera del ${nombreRango}`,
      estado: { marcado: false, asiste: false, dentro: false, finDeSemana: false, limite: false },
    },
  );

  const handleImportar = async () => {
    if (!slug || !rango) return;
    const anios = aniosDelRango(rango);
    if (anios.length === 0) return;

    setImportando(true);
    setMensaje('');
    setErrorImport('');
    try {
      const res = await fetch(
        `/api/festivos/obtener?slug=${encodeURIComponent(slug)}&year=${anios[0]}&yearFin=${anios[anios.length - 1]}`
      );
      if (!res.ok) throw new Error('respuesta');
      const data = await res.json();
      const obtenidas: string[] = Array.isArray(data.fechas) ? data.fechas : [];

      // La API devuelve el ano natural entero, que no coincide con el curso. Un
      // curso 2025-2026 arrastra tambien los festivos de enero de 2025, que
      // fueron antes de empezar, y los de agosto de 2026, que seran despues de
      // acabar. De los 26 que devuelve la API, solo 12 caen dentro.
      const enRango = filtrarPorRango(obtenidas, rango);
      const nuevas = enRango.filter(f => !dates.includes(f));

      setDates(prev => [...new Set([...prev, ...enRango])].sort());
      setMensaje(
        nuevas.length > 0
          ? `Se han añadido ${nuevas.length} día${nuevas.length === 1 ? '' : 's'} festivo${nuevas.length === 1 ? '' : 's'}. Revisa que sean correctos antes de guardar.`
          : 'No hay nuevos días festivos en el calendario del curso.'
      );
    } catch {
      setErrorImport('No se pudieron obtener los días festivos.');
    } finally {
      setImportando(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rango || !onSave) return;
    onSave(descartarFueraDeRango ? filtrarPorRango(dates, rango) : dates);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="6xl"
      zIndex={zIndex ?? 60}
      backdropClass="bg-overlay backdrop-blur-md"
      cardClass="rounded-4xl"
    >
      <div className="px-6 py-5 bg-surface-subtle border-b border-border-base flex items-start justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-danger-soft text-danger shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-text-main uppercase tracking-widest text-xs">
              {titulo}
            </h3>
            <p className="text-sm text-text-muted mt-0.5 truncate">{subtitulo}</p>
          </div>
        </div>
        <Title text="Cerrar">
          <button onClick={onClose} className="text-text-muted hover:text-text-main shrink-0">
            <X className="h-5 w-5" />
          </button>
        </Title>
      </div>

      {!hayCurso ? (
        <div className="p-8 space-y-4">
          <div className="bg-warning-soft text-warning-strong rounded-xl p-4 border border-warning/20 text-sm">
            <p className="font-semibold">Necesitas un curso para definir los días festivos.</p>
            <p className="mt-1 text-xs">
              Los festivos se cuentan sobre las fechas del curso, así que no se pueden situar en el
              calendario hasta que exista uno. Los festivos son datos del curso: al crear uno nuevo
              hay que volver a definirlos.
            </p>
          </div>
          {onIrACursos && (
            <button
              type="button"
              onClick={onIrACursos}
              className="w-full bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Ir a Cursos
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
          {/* Acciones */}
          <div className="px-6 py-3 border-b border-border-base flex flex-wrap items-center justify-between gap-3 shrink-0">
            <span className="text-sm font-semibold text-text-main">
              {marcados.length} día{marcados.length === 1 ? '' : 's'} {soloLectura ? 'no lectivo' : 'marcado'}{marcados.length === 1 ? '' : 's'}
              {rangoVisible && (
                <span className="ml-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {formatDate(rangoVisible.inicio)} — {formatDate(rangoVisible.fin)}
                </span>
              )}
              {preview && (
                // El rango es el periodo guardado y no se mueve: es la rejilla que
                // se esta editando. La fecha fin estimada es lo que cambia al
                // tocar los dias, y se enseña aparte para que se distinga de la
                // que se acabaria guardando si se cancelara ahora mismo.
                <span className="ml-3 pl-3 border-l border-border-base text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                  <span className="text-text-muted">Fin estimado</span>
                  <span className={cambiaFin ? 'text-primary' : 'text-text-main'}>
                    {preview.fechaFin ? formatDate(preview.fechaFin) : '—'}
                  </span>
                  {cambiaFin && rango && (
                    <span className="text-text-muted normal-case tracking-normal">
                      (antes {formatDate(rango.fin)})
                    </span>
                  )}
                  <span className="text-text-muted">
                    · {preview.diasPropios} día{preview.diasPropios === 1 ? '' : 's'} propio{preview.diasPropios === 1 ? '' : 's'}
                  </span>
                </span>
              )}
            </span>
            {!soloLectura && <div className="flex items-center gap-2">
              {slug && (
                <button
                  type="button"
                  disabled={importando}
                  onClick={handleImportar}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-border-base rounded-lg text-xs font-semibold text-text-muted hover:bg-surface-hover hover:text-text-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importando
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CalendarPlus className="h-3.5 w-3.5" />}
                  {importando ? 'Obteniendo...' : 'Obtener festivos'}
                </button>
              )}
              <button
                type="button"
                disabled={dates.length === 0}
                onClick={() => setDates([])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-danger/20 rounded-lg text-xs font-semibold text-danger hover:bg-danger-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Borrar todos
              </button>
            </div>}
          </div>

          {/* Leyenda y avisos */}
          <div className="px-6 py-2.5 border-b border-border-base flex flex-wrap items-center gap-x-5 gap-y-1.5 shrink-0">
            {leyenda.map(({ etiqueta, estado, total }) => {
              const estilo = estilosCelda(estado);
              return (
                <span
                  key={etiqueta}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider"
                >
                  <span
                    aria-hidden="true"
                    className={[
                      CLASE_CELDA,
                      'w-6 h-6 shrink-0',
                      estilo.peso,
                      estilo.contorno,
                      estilo.color,
                    ].join(' ')}
                  >
                    1
                  </span>
                  {etiqueta}
                  {total !== undefined && (
                    <span className="text-text-main">({total})</span>
                  )}
                </span>
              );
            })}
            {slug && (
              <a
                href="https://calendariosnacionales.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[10px] font-bold text-text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                calendariosnacionales.com <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          {(mensaje || errorImport || fueraDeRango > 0) && (
            <div className="px-6 py-2.5 border-b border-border-base space-y-1.5 shrink-0">
              {errorImport && (
                <p className="text-xs font-semibold text-danger">{errorImport}</p>
              )}
              {mensaje && (
                <p className="text-xs text-info-strong">{mensaje}</p>
              )}
              {fueraDeRango > 0 && (
                <p className="text-xs font-semibold text-warning-strong">
                  {fueraDeRango} día{fueraDeRango === 1 ? '' : 's'} festivo{fueraDeRango === 1 ? '' : 's'} guardado{fueraDeRango === 1 ? '' : 's'} queda
                  {fueraDeRango === 1 ? '' : 'n'} fuera del curso y se descartará
                  {fueraDeRango === 1 ? '' : 'n'} al guardar.
                </p>
              )}
            </div>
          )}

          {/* Calendario */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            <CalendarioFestivos
              rango={rangoVisible ?? rango}
              festivos={marcadosSet}
              onToggle={soloLectura ? undefined : handleToggle}
              asiste={asiste}
            />
          </div>

          {/* Días marcados */}
          <div className="px-6 py-3 border-t border-border-base shrink-0">
            {marcados.length === 0 ? (
              <p className="text-xs text-text-muted italic">No hay días festivos marcados.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {marcados.map(d => (
                  <div
                    key={d}
                    className="flex items-center gap-2 bg-danger-soft border border-danger/20 pl-3 pr-1 py-1 rounded-full text-xs font-medium text-danger-strong"
                  >
                    {formatDate(d)}
                    {!soloLectura && <Title text={`Quitar ${formatDate(d)}`}>
                      <button
                        type="button"
                        onClick={() => handleToggle(d)}
                        className="p-1 hover:bg-danger/20 rounded-full text-danger transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Title>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border-base flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-hover text-text-main py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-surface-strong transition-all"
            >
              {soloLectura ? 'Cerrar' : 'Cancelar'}
            </button>
            {!soloLectura && (
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {textoGuardar}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
