import React from 'react';
import { History, AlertTriangle, Plus, X, Trash2 } from 'lucide-react';
import { Curso } from '../../types/index.ts';

import { useCursos }            from './hooks/useCursos.ts';
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

      {/* MODAL: Confirmar eliminación */}
      {ctx.confirmingDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar curso?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Se eliminarán los estudiantes, relaciones e intereses asociados. Los convenios y empresas se conservarán.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => ctx.setConfirmingDelete(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => ctx.handleDelete(ctx.confirmingDelete)}
                className="flex-1 py-2 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar reemplazo de curso */}
      {ctx.showReplaceConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => ctx.setShowReplaceConfirm(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Crear nuevo curso?</h3>
            <p className="text-slate-500 text-sm mb-2">
              Ya existe un curso activo. Al crear uno nuevo se eliminarán:
            </p>
            <ul className="text-xs text-slate-500 text-left bg-slate-50 rounded-lg p-3 mb-4 space-y-1">
              <li className="flex items-center gap-2"><span className="text-red-500 font-bold">•</span> Estudiantes</li>
              <li className="flex items-center gap-2"><span className="text-red-500 font-bold">•</span> Relaciones</li>
              <li className="flex items-center gap-2"><span className="text-red-500 font-bold">•</span> Intereses</li>
              <li className="flex items-center gap-2 text-emerald-600"><span className="font-bold">✓</span> Empresas, convenios y estadísticas se conservan</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => ctx.setShowReplaceConfirm(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ctx.handleReplaceConfirm}
                className="flex-1 py-2 rounded-lg text-white font-semibold bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">
          Cursos Académicos
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={ctx.handleOpenNew}
            className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo Curso
          </button>
        </div>
      </div>

      {/* MODAL: Formulario */}
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

      {/* TABLA / LISTADO */}
      <div className="bg-white rounded-xl border border-border-base shadow-sm overflow-hidden">

        <div className="px-6 py-4 border-b border-border-base bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Cursos
            </span>
          </div>
        </div>

        <CursosMobileList
          cursos={ctx.filteredCursos}
          onEdit={ctx.handleOpenEdit}
          onDeleteRequest={id => ctx.setConfirmingDelete(id)}
        />

        <CursosTable
          cursos={ctx.filteredCursos}
          onEdit={ctx.handleOpenEdit}
          onDeleteRequest={id => ctx.setConfirmingDelete(id)}
        />
      </div>
    </div>
  );
}
