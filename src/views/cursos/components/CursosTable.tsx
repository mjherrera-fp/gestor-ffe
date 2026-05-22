import React from 'react';
import { Calendar, Edit2, Trash2 } from 'lucide-react';
import { Curso } from '../../../types/index.ts';
import { formatDate } from '../../../lib/dateUtils.ts';

interface CursosTableProps {
  cursos: Curso[];
  onEdit: (c: Curso) => void;
  onDeleteRequest: (id: number) => void;
}

export function CursosTable({ cursos, onEdit, onDeleteRequest }: CursosTableProps) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-border-base">
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Descripción</th>
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Período</th>
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-base font-sans">
          {cursos.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-6 py-12 text-center text-text-muted text-sm italic">
                No hay cursos registrados.
              </td>
            </tr>
          ) : (
            cursos.map(curso => (
              <tr key={curso.id} className="group hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-sm text-text-main">{curso.descripcion}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Calendar className="h-3.5 w-3.5 opacity-50" />
                    {formatDate(curso.fechaInicio)} — {formatDate(curso.fechaFin)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => onEdit(curso)}
                      className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-primary hover:border-primary-light hover:bg-primary-light transition-all rounded-lg shadow-sm active:scale-95"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => onDeleteRequest(curso.id!)}
                      className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all rounded-lg shadow-sm active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
