import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Profesor } from '../../types/index.ts';
import type { RangoCurso } from '../../lib/calendarioFestivos.ts';
import { FestivosModal } from '../../components/ui/FestivosModal.tsx';
import { Title } from '../../components/Title.tsx';
import localidades from '../../data/geo/localidades-madrid.json';

import { useCentros }          from './hooks/useCentros.ts';
import { CentrosEducativos }   from './components/CentrosEducativos.tsx';
import { CentroFormModal }     from './components/CentroFormModal.tsx';
import { DetalleFormModal }    from './components/DetalleFormModal.tsx';

interface Props {
  profesor: Profesor | null;
  onRefresh?: () => void;
  /** Rango del curso actual, o `null` si no hay ninguno. */
  rangoCurso?: RangoCurso | null;
  onIrACursos?: () => void;
}

export default function CentrosView({ profesor, onRefresh, rangoCurso, onIrACursos }: Props) {
  const ctx = useCentros(profesor, onRefresh);

  // El calendario de festivos se abre desde la tarjeta del centro, asi que el
  // slug de la localidad se deduce del centro que este abierto. Solo hace
  // falta para la importacion automatica.
  const slug = useMemo(() => {
    const ciudad = ctx.centroConFestivos?.ciudad;
    if (!ciudad) return null;
    const match = localidades.municipalities.find(m => m.name === ciudad);
    return match ? match.slug : null;
  }, [ctx.centroConFestivos]);

  return (
    <div>

      {/* ── MODAL: Confirmar eliminación ── */}
      {ctx.showDeleteConfirm && (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-surface-card rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative text-center p-8">
            <Title text="Cerrar">
              <button
                onClick={() => ctx.setShowDeleteConfirm(null)}
                className="absolute top-6 right-6 p-2 text-text-muted hover:text-text-main"
              >
                <Plus className="rotate-45 h-5 w-5" />
              </button>
            </Title>
            <div className="w-16 h-16 bg-danger-soft text-danger-strong rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-text-main mb-3">¿Estás seguro?</h3>
            <p className="text-sm text-text-muted font-medium mb-8">
              {ctx.showDeleteConfirm.type === 'centro'
                ? 'Esta acción eliminará el centro educativo y todos sus ciclos asociados de forma permanente.'
                : 'Esta acción eliminará el ciclo formativo de forma permanente.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => ctx.setShowDeleteConfirm(null)}
                className="flex-1 py-3 text-sm font-bold text-text-muted hover:bg-surface-hover rounded-xl border border-border-base"
              >
                Cancelar
              </button>
              <button
                onClick={ctx.handleConfirmDelete}
                className="flex-1 py-3 bg-danger text-white text-sm font-bold rounded-xl shadow-lg shadow-danger/20 hover:bg-danger/90"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA DE CENTROS Y CICLOS ── */}
      <CentrosEducativos
        centros={ctx.centros}
        loading={ctx.loadingCentros}
        profesorId={profesor?.id}
        onAddCentro={() => ctx.handleOpenCentroForm(null)}
        onEditCentro={ctx.handleOpenCentroForm}
        onEditFestivos={ctx.handleOpenFestivos}
        onDeleteCentro={id => ctx.setShowDeleteConfirm({ id, type: 'centro' })}
        onAddDetalle={centroId => ctx.handleOpenDetalleForm(centroId, null)}
        onEditDetalle={(centroId, detalle) => ctx.handleOpenDetalleForm(centroId, detalle)}
        onDeleteDetalle={id => ctx.setShowDeleteConfirm({ id, type: 'detalle' })}
      />

      {/* ── MODAL: Centro ── */}
      <CentroFormModal
        open={ctx.showCentroForm}
        editing={ctx.editingCentro}
        formData={ctx.centroFormData}
        onChange={ctx.setCentroFormData}
        onSubmit={ctx.handleSaveCentro}
        onClose={() => ctx.setShowCentroForm(false)}
      />

      {/* ── MODAL: Detalle Académico ── */}
      <DetalleFormModal
        open={ctx.showDetalleForm}
        editing={ctx.editingDetalle}
        formData={ctx.detalleFormData}
        onChange={ctx.setDetalleFormData}
        newRA={ctx.newRA}
        onNewRAChange={ctx.setNewRA}
        onAddRA={ctx.addRA}
        onRemoveRA={ctx.removeRA}
        onEditRA={ctx.startEditRA}
        onCancelEditRA={ctx.cancelEditRA}
        editingRAId={ctx.editingRAId}
        newTutoria={ctx.newTutoria}
        setNewTutoria={ctx.setNewTutoria}
        onAddTutoria={ctx.addTutoria}
        onRemoveTutoria={ctx.removeTutoria}
        onSubmit={ctx.handleSaveDetalle}
        onClose={() => ctx.setShowDetalleForm(false)}
      />

      {/* ── MODAL: Días festivos del centro ── */}
      <FestivosModal
        open={!!ctx.centroConFestivos}
        onClose={() => ctx.setCentroConFestivos(null)}
        titulo="Días festivos del centro"
        subtitulo={ctx.centroConFestivos?.nombre || 'Centro educativo'}
        rango={rangoCurso ?? null}
        festivos={ctx.centroConFestivos?.festivos || []}
        slug={slug}
        onIrACursos={onIrACursos}
        onSave={ctx.handleSaveFestivos}
      />
    </div>
  );
}
