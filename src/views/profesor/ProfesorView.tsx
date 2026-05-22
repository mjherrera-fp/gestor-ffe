import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Profesor } from '../../types/index.ts';

import { useProfesor }          from './hooks/useProfesor.ts';
import { ProfesorForm }         from './components/ProfesorForm.tsx';
import { CentrosEducativos }    from './components/CentrosEducativos.tsx';
import { CentroFormModal }      from './components/CentroFormModal.tsx';
import { DetalleFormModal }     from './components/DetalleFormModal.tsx';

interface Props {
  profesor: Profesor | null;
  onUpdate: (profesor: Profesor) => void;
  onRefresh?: () => void;
}

export const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
export const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';


export default function ProfesorView({ profesor, onUpdate, onRefresh }: Props) {
  const ctx = useProfesor(profesor, onUpdate, onRefresh);

  return (
    <div className="space-y-12">

      {/* ── MODAL: Confirmar eliminación ── */}
      {ctx.showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative text-center p-8">
            <button
              onClick={() => ctx.setShowDeleteConfirm(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600"
            >
              <Plus className="rotate-45 h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              {ctx.showDeleteConfirm.type === 'centro'
                ? 'Esta acción eliminará el centro educativo y todos sus ciclos asociados de forma permanente.'
                : 'Esta acción eliminará el ciclo formativo de forma permanente.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => ctx.setShowDeleteConfirm(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={ctx.handleConfirmDelete}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORMULARIO PERFIL ── */}
      <ProfesorForm
        formData={ctx.formData}
        setFormData={ctx.setFormData}
        saving={ctx.saving}
        success={ctx.success}
        onSubmit={ctx.handleSubmitProfesor}
      />

      {/* ── CENTROS EDUCATIVOS ── */}
      <CentrosEducativos
        centros={ctx.centros}
        loading={ctx.loadingCentros}
        profesorId={profesor?.id}
        onAddCentro={() => ctx.handleOpenCentroForm(null)}
        onEditCentro={ctx.handleOpenCentroForm}
        onDeleteCentro={id => ctx.setShowDeleteConfirm({ id, type: 'centro' })}
        onAddDetalle={centroId => ctx.handleOpenDetalleForm(centroId, null)}
        onEditDetalle={(centroId, detalle) => ctx.handleOpenDetalleForm(centroId, detalle)}
        onDeleteDetalle={id => ctx.setShowDeleteConfirm({ id, type: 'detalle' })}
      />

      {/* ── MODAL: Centro ── */}
      {ctx.showCentroForm && (
        <CentroFormModal
          editing={ctx.editingCentro}
          formData={ctx.centroFormData}
          onChange={ctx.setCentroFormData}
          newFestivo={ctx.newFestivo}
          setNewFestivo={ctx.setNewFestivo}
          onAddFestivo={ctx.addFestivo}
          onRemoveFestivo={ctx.removeFestivo}
          onSubmit={ctx.handleSaveCentro}
          onClose={() => ctx.setShowCentroForm(false)}
        />
      )}

      {/* ── MODAL: Detalle Académico ── */}
      {ctx.showDetalleForm && (
        <DetalleFormModal
          editing={ctx.editingDetalle}
          formData={ctx.detalleFormData}
          onChange={ctx.setDetalleFormData}
          newRA={ctx.newRA}
          onNewRAChange={ctx.setNewRA}
          onAddRA={ctx.addRA}
          onRemoveRA={ctx.removeRA}
          newTutoria={ctx.newTutoria}
          setNewTutoria={ctx.setNewTutoria}
          onAddTutoria={ctx.addTutoria}
          onRemoveTutoria={ctx.removeTutoria}
          onSubmit={ctx.handleSaveDetalle}
          onClose={() => ctx.setShowDetalleForm(false)}
        />
      )}
    </div>
  );
}
