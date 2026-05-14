import React from 'react';
import { Calendar, Archive, RotateCcw, Edit2, Trash2 } from 'lucide-react';
import { Curso } from '../../../types/index.ts';
import { ConfirmAction } from '../hooks/useCursos.ts';

interface CursosMobileListProps {
  cursos: Curso[];
  showArchived: boolean;
  onEdit: (c: Curso) => void;
  onConfirmAction: (a: ConfirmAction) => void;
}

export function CursosMobileList({ cursos, showArchived, onEdit, onConfirmAction }: CursosMobileListProps) {
  if (cursos.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-text-muted text-sm italic">
        No hay cursos registrados.
      </div>
    );
  }

  return (
    <div className="block lg:hidden divide-y divide-border-base">
      {cursos.map(curso => (
        <div
          key={curso.id}
          className={`p-5 space-y-4 ${curso.archivado ? 'bg-slate-50/50 opacity-60' : ''}`}
        >
          {/* Info */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-bold text-sm text-text-main wrap-break-word">{curso.descripcion}</div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted font-medium">
                <Calendar className="h-3 w-3" />
                {new Date(curso.fechaInicio).toLocaleDateString()} — {new Date(curso.fechaFin).toLocaleDateString()}
              </div>
            </div>
            {curso.archivado ? (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200 shrink-0">
                Archivado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-100 shrink-0">
                Activo
              </span>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
              <Calendar className="h-3 w-3" /> {curso.festivos?.length || 0} festivos
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onConfirmAction({ id: curso.id!, type: curso.archivado ? 'restore' : 'archive' })}
                className={`p-2 rounded-lg border shadow-sm transition-colors ${
                  curso.archivado
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {curso.archivado ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onEdit(curso)}
                className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg shadow-sm transition-colors hover:text-primary"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onConfirmAction({ id: curso.id!, type: 'delete' })}
                className="p-2 bg-white text-red-500 border border-red-100 rounded-lg shadow-sm transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
