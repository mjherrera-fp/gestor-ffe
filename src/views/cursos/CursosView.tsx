import React from 'react';
import { History, AlertTriangle, Plus } from 'lucide-react';
import { Curso } from '../../types/index.ts';

import { useCursos }            from './hooks/useCursos.ts';
import { ConfirmActionModal }   from './components/ConfirmActionModal.tsx';
import { CursoFormModal }       from './components/CursoFormModal.tsx';
import { CursosMobileList }     from './components/CursosMobileList.tsx';
import { CursosTable }          from './components/CursosTable.tsx';

interface Props {
  cursos: Curso[];
  onUpdate: () => void;
}

export default function CursosView({ cursos, onUpdate }: Props) {
  const ctx = useCursos(cursos, onUpdate);

  return (
    <div className="space-y-6">

      {/* ── MODAL: Confirmar acción ── */}
      {ctx.confirmingAction && (
        <ConfirmActionModal
          action={ctx.confirmingAction}
          onConfirm={ctx.handleConfirmAction}
          onCancel={() => ctx.setConfirmingAction(null)}
        />
      )}

      {/* ── CABECERA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">
          Cursos Académicos
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => ctx.setShowArchived(!ctx.showArchived)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${
              ctx.showArchived
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {ctx.showArchived ? 'Ver Solo Activos' : 'Ver Todos (Inc. Archivados)'}
          </button>
          <button
            onClick={ctx.handleOpenNew}
            className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo Curso
          </button>
        </div>
      </div>

      {/* ── MODAL: Formulario ── */}
      {ctx.showForm && (
        <CursoFormModal
          editing={ctx.editing}
          formData={ctx.formData}
          setFormData={ctx.setFormData}
          newFestivo={ctx.newFestivo}
          setNewFestivo={ctx.setNewFestivo}
          onAddFestivo={ctx.addFestivo}
          onRemoveFestivo={ctx.removeFestivo}
          newTutoria={ctx.newTutoria}
          setNewTutoria={ctx.setNewTutoria}
          onAddTutoria={ctx.addTutoria}
          onRemoveTutoria={ctx.removeTutoria}
          onSubmit={ctx.handleSubmit}
          onClose={() => ctx.setShowForm(false)}
        />
      )}

      {/* ── TABLA / LISTADO ── */}
      <div className="bg-white rounded-xl border border-border-base shadow-sm overflow-hidden">

        {/* Cabecera tabla */}
        <div className="px-6 py-4 border-b border-border-base bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Historial de Cursos
            </span>
            {ctx.showArchived && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                Mostrando Histórico
              </span>
            )}
          </div>
        </div>

        {/* Vista mobile */}
        <CursosMobileList
          cursos={ctx.filteredCursos}
          showArchived={ctx.showArchived}
          onEdit={ctx.handleOpenEdit}
          onConfirmAction={ctx.setConfirmingAction}
        />

        {/* Vista desktop */}
        <CursosTable
          cursos={ctx.filteredCursos}
          showArchived={ctx.showArchived}
          onEdit={ctx.handleOpenEdit}
          onConfirmAction={ctx.setConfirmingAction}
        />
      </div>

      {/* ── AVISO: sin cursos activos ── */}
      {ctx.hasNoActiveCursos && (
        <div className="bg-amber-50 rounded-xl p-4 flex gap-3 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            No hay cursos activos. Para gestionar alumnos y empresas, debe haber al menos un curso no archivado.
          </p>
        </div>
      )}
    </div>
  );
}
