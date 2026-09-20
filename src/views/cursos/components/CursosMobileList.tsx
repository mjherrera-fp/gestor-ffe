import React from 'react';
import { Calendar, Edit2, Trash2 } from 'lucide-react';
import { Curso } from '../../../types/index.ts';
import { formatDate } from '../../../lib/dateUtils.ts';

interface CursosMobileListProps {
  cursos: Curso[];
  onEdit: (c: Curso) => void;
  onDeleteRequest: (id: number) => void;
}

export function CursosMobileList({ cursos, onEdit, onDeleteRequest }: CursosMobileListProps) {
  if (cursos.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-text-muted text-sm italic lg:hidden">
        No hay cursos registrados.
      </div>
    );
  }

  return (
    <div className="block lg:hidden divide-y divide-border-base">
      {cursos.map(curso => (
        <div key={curso.id} className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-bold text-sm text-text-main wrap-break-word">{curso.descripcion}</div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted font-medium">
                <Calendar className="h-3 w-3" />
                {formatDate(curso.fechaInicio)} — {formatDate(curso.fechaFin)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(curso)}
                className="p-2 bg-surface-card text-text-muted border border-border-base rounded-lg shadow-sm transition-colors hover:text-primary"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDeleteRequest(curso.id!)}
                className="p-2 bg-surface-card text-danger border border-border-base rounded-lg shadow-sm transition-colors"
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
