import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, CheckCircle2, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { DetalleAcademico, ResultadoAprendizaje } from '../../../types/index.ts';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Title } from '../../../components/Title.tsx';

/**
 * Resultados de aprendizaje de un ciclo, en su propia pantalla.
 *
 * Salen del formulario del ciclo porque son una lista larga y con su propia
 * vida: se edita a menudo, se consulta desde el resto de la aplicacion y no
 * tiene nada que ver con los datos del ciclo que la rodean. Mezclada en aquel
 * formulario ocupaba mas de la mitad de su alto y habia que desplegar para
 * llegar al botón de guardar.
 *
 * Solo se abre sobre un ciclo ya creado. Antes de crearlo no hay fila a la que
 * escribir: los RA viajan guardados en la propia fila del ciclo, asi que hasta
 * que existe no hay donde ponerlos.
 *
 * El borrador es de aqui. Nada se escribe en el ciclo hasta pulsar Guardar, y
 * mientras tanto la ficha que hay detras no cambia: si se cancela, el contador
 * sigue diciendo los RA que hay de verdad.
 */

const COMPARADOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const RA_VACIO: Partial<ResultadoAprendizaje> = {
  modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '',
};

/** Los campos sin los que un RA no se puede distinguir de otro ni medir. */
const OBLIGATORIOS: Array<[keyof ResultadoAprendizaje, string]> = [
  ['modulo', 'Nombre del módulo'],
  ['codigo', 'Código del módulo'],
  ['ra', 'ID del RA'],
  ['nombre', 'Nombre del RA'],
];

const inputClass =
  'w-full bg-surface-card border border-border-base rounded-lg px-3 py-2 text-[10px] font-bold text-text-main outline-none focus:border-primary transition-colors';

interface ResultadosAprendizajeModalProps {
  open: boolean;
  /** El ciclo cuyos RA se editan. `null` cuando no hay ninguno abierto. */
  detalle: DetalleAcademico | null;
  saving: boolean;
  onSave: (resultados: ResultadoAprendizaje[]) => void;
  onClose: () => void;
}

export function ResultadosAprendizajeModal({
  open, detalle, saving, onSave, onClose,
}: ResultadosAprendizajeModalProps) {
  const [ras, setRas] = useState<ResultadoAprendizaje[]>([]);
  const [borrador, setBorrador] = useState<Partial<ResultadoAprendizaje>>(RA_VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [faltan, setFaltan] = useState<string[]>([]);

  // El borrador se carga al abrir, no en cada cambio de `detalle`. El padre
  // pasa una lista nueva en cada render, y depender de ella aqui borraria lo
  // que se lleva escrito en cuanto el padre se repintara.
  useEffect(() => {
    if (!open) return;
    setRas(detalle?.resultadosAprendizaje || []);
    setBorrador(RA_VACIO);
    setEditandoId(null);
    setFaltan([]);
  }, [open, detalle?.id]);

  // Se ordena una copia, como en el resto de la aplicacion: el orden guardado
  // es el de insercion, y se ordena al pintar para no reescribir la fila cada
  // vez que se anade un RA.
  const ordenados = useMemo(
    () => [...ras].sort((a, b) =>
      COMPARADOR.compare(a.codigo, b.codigo)
      || COMPARADOR.compare(a.ra, b.ra)
      || COMPARADOR.compare(a.modulo, b.modulo)
    ),
    [ras]
  );

  const comprobar = (campos: Partial<ResultadoAprendizaje>) => {
    const ausentes = OBLIGATORIOS
      .filter(([campo]) => !String(campos[campo] ?? '').trim())
      .map(([, etiqueta]) => etiqueta);
    setFaltan(ausentes);
    return ausentes.length === 0;
  };

  const confirmarBorrador = () => {
    if (!comprobar(borrador)) return;

    if (editandoId) {
      setRas(prev => prev.map(ra => (ra.id === editandoId
        ? {
            ...ra,
            modulo: borrador.modulo!.trim(),
            codigo: borrador.codigo!.trim(),
            ra: borrador.ra!.trim(),
            nombre: borrador.nombre!.trim(),
            impartidoEmpresa: borrador.impartidoEmpresa || false,
            actividadFormativa: borrador.actividadFormativa,
          }
        : ra)));
      setEditandoId(null);
    } else {
      setRas(prev => [...prev, {
        id: crypto.randomUUID(),
        modulo: borrador.modulo!.trim(),
        codigo: borrador.codigo!.trim(),
        ra: borrador.ra!.trim(),
        nombre: borrador.nombre!.trim(),
        impartidoEmpresa: borrador.impartidoEmpresa || false,
        actividadFormativa: borrador.actividadFormativa,
      }]);
    }
    setBorrador(RA_VACIO);
    setFaltan([]);
  };

  const editar = (ra: ResultadoAprendizaje) => {
    setEditandoId(ra.id);
    setBorrador({
      modulo: ra.modulo, codigo: ra.codigo, ra: ra.ra, nombre: ra.nombre,
      impartidoEmpresa: ra.impartidoEmpresa || false, actividadFormativa: ra.actividadFormativa,
    });
    setFaltan([]);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setBorrador(RA_VACIO);
    setFaltan([]);
  };

  const quitar = (id: string) => {
    setRas(prev => prev.filter(ra => ra.id !== id));
    if (editandoId === id) cancelarEdicion();
  };

  const marca = (campo: keyof ResultadoAprendizaje) =>
    faltan.includes(OBLIGATORIOS.find(([c]) => c === campo)![1]);
  const bordeError = 'border-red-400 ring-2 ring-red-200';

  /**
   * Hay un RA a medio escribir o una edicion sin aplicar.
   *
   * El guardado de abajo escribe la lista que hay, no el formulario, asi que
   * pulsar el con algo escrito se llevaria por delante lo que se acaba de
   * teclear sin avisar. Mientras haya borrador, el guardado se queda
   * bloqueado: hay que anadirlo o cancelar la edicion antes de cerrar.
   */
  const hayBorrador =
    OBLIGATORIOS.some(([campo]) => String(borrador[campo] ?? '').trim())
    || !!borrador.actividadFormativa?.trim();

  return (
    <Modal open={open} onClose={onClose} maxWidth="3xl" backdropClass="bg-overlay backdrop-blur-md" cardClass="rounded-4xl">
      <div className="p-8 border-b border-border-base flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-text-main tracking-tight">Resultados de Aprendizaje</h3>
            <p className="text-xs text-text-muted truncate">{detalle?.ciclo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-light text-primary border border-primary-light">
            {ras.length} RA
          </span>
          <Title text="Cerrar">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </Title>
        </div>
      </div>

      <form
        className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-190px)] custom-scrollbar flex-1"
        onSubmit={e => {
          e.preventDefault();
          // El boton esta bloqueado con borrador pendiente, pero el Enter en un
          // campo tambien lanza el formulario: la misma comprobacion evita que
          // esa via se lleve por delante lo tecleado.
          if (hayBorrador) return;
          onSave(ras);
        }}
      >
        <div className="bg-surface-subtle/50 rounded-xl p-4 border border-border-base/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-text-main uppercase tracking-wider">
              {editandoId ? 'Editando un RA' : 'Nuevo RA'}
            </h4>
            {editandoId && (
              <Title text="Cancelar edición">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="flex items-center gap-1 text-[9px] font-black text-text-muted uppercase tracking-wider hover:text-danger transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </Title>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <input
                className={`${inputClass} ${marca('modulo') ? bordeError : ''}`}
                value={borrador.modulo ?? ''}
                onChange={e => setBorrador({ ...borrador, modulo: e.target.value })}
                placeholder="Nombre del módulo"
              />
              {marca('modulo') && <p className="text-red-500 text-[9px] mt-1 italic font-medium">Falta el módulo</p>}
            </div>
            <div>
              <input
                className={`${inputClass} ${marca('codigo') ? bordeError : ''}`}
                value={borrador.codigo ?? ''}
                onChange={e => setBorrador({ ...borrador, codigo: e.target.value })}
                placeholder="Cód. del módulo"
              />
              {marca('codigo') && <p className="text-red-500 text-[9px] mt-1 italic font-medium">Falta el código</p>}
            </div>
            <div>
              <input
                className={`${inputClass} ${marca('ra') ? bordeError : ''}`}
                value={borrador.ra ?? ''}
                onChange={e => setBorrador({ ...borrador, ra: e.target.value })}
                placeholder="ID RA (Ej: RA1)"
              />
              {marca('ra') && <p className="text-red-500 text-[9px] mt-1 italic font-medium">Falta el ID</p>}
            </div>
          </div>

          <div>
            <input
              className={`${inputClass} ${marca('nombre') ? bordeError : ''}`}
              value={borrador.nombre ?? ''}
              onChange={e => setBorrador({ ...borrador, nombre: e.target.value })}
              placeholder="Nombre descriptivo del RA"
            />
            {marca('nombre') && <p className="text-red-500 text-[9px] mt-1 italic font-medium">Falta el nombre</p>}
          </div>

          <textarea
            className={`${inputClass} resize-none h-16`}
            value={borrador.actividadFormativa ?? ''}
            onChange={e => setBorrador({ ...borrador, actividadFormativa: e.target.value })}
            placeholder="Ejemplo de Actividad Formativa (opcional)..."
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-surface-card border border-border-base rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 rounded border-border-base text-primary focus:ring-primary"
                checked={!!borrador.impartidoEmpresa}
                onChange={e => setBorrador({ ...borrador, impartidoEmpresa: e.target.checked })}
              />
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight">Íntegro empresa</span>
            </label>
            <button
              type="button"
              onClick={confirmarBorrador}
              className={`${editandoId ? 'bg-success/90 hover:bg-success' : 'bg-primary hover:bg-primary/90'} text-white px-4 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all flex items-center gap-1`}
            >
              {editandoId ? <CheckCircle className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {editandoId ? 'Actualizar' : 'Añadir RA'}
            </button>
          </div>

          {hayBorrador && (
            <p className="text-[9px] font-bold text-warning-strong uppercase tracking-wider italic">
              {editandoId
                ? 'Tienes una edicion sin aplicar: actualizala o cancelala para poder guardar.'
                : 'Tienes un RA sin anadir: anadelo o borralo para poder guardar.'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {ordenados.length === 0 ? (
            <div className="text-center py-10 bg-surface-subtle/30 border border-dashed border-border-base rounded-xl">
              <Target className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest italic opacity-60">
                Este ciclo todavía no tiene RA
              </p>
              <p className="text-[10px] text-text-muted mt-2 max-w-sm mx-auto leading-relaxed">
                Los RA son los que se evalúan en el plan formativo, la ficha de seguimiento y la
                valoración final. El ciclo se puede crear sin ellos y añadirlos más tarde.
              </p>
            </div>
          ) : (
            ordenados.map(ra => (
              <div
                key={ra.id}
                className={`bg-surface-card border rounded-lg p-3 shadow-sm flex items-start justify-between gap-3 group ${editandoId === ra.id ? 'border-primary ring-2 ring-primary/10' : 'border-border-base'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[8px] font-black text-primary uppercase bg-primary-light px-1.5 py-0.5 rounded border border-primary-light">
                      {ra.codigo} - {ra.modulo}: {ra.ra}
                    </span>
                    {ra.impartidoEmpresa && (
                      <span className="text-[8px] font-black text-success uppercase bg-success-soft px-1.5 py-0.5 rounded border border-success/20 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Empresa
                      </span>
                    )}
                  </div>
                  <h5 className="text-[10px] font-black text-text-main leading-tight">{ra.nombre}</h5>
                  {ra.actividadFormativa && (
                    <p className="text-[9px] text-text-muted mt-1 italic line-clamp-2 leading-tight">
                      {ra.actividadFormativa}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Title text="Editar RA">
                    <button
                      type="button"
                      onClick={() => editar(ra)}
                      className="p-1.5 text-text-muted hover:text-primary rounded-md hover:bg-primary-light transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </Title>
                  <Title text="Eliminar RA">
                    <button
                      type="button"
                      onClick={() => quitar(ra.id)}
                      className="p-1.5 text-text-muted hover:text-danger rounded-md hover:bg-danger-soft transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Title>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-base">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || hayBorrador}
            title={hayBorrador ? 'Anade o cancela el RA del formulario antes de guardar' : undefined}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
