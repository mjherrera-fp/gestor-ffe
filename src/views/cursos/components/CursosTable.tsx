import React from 'react';
import { Calendar, Archive, RotateCcw, Edit2, Trash2 } from 'lucide-react';
import { Curso } from '../../../types/index.ts';
import { ConfirmAction } from '../hooks/useCursos.ts';

interface CursosTableProps {
  cursos: Curso[];
  showArchived: boolean;
  onEdit: (c: Curso) => void;
  onConfirmAction: (a: ConfirmAction) => void;
}

export function CursosTable({ cursos, showArchived, onEdit, onConfirmAction }: CursosTableProps) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-border-base">
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Descripción</th>
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Período</th>
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-center">Festivos</th>
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-center">Estado</th>
            <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-base font-sans">
          {cursos.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-text-muted text-sm italic">
                {showArchived
                  ? 'No hay cursos registrados.'
                  : 'No hay cursos activos. Usa el botón superior para ver el archivo.'}
              </td>
            </tr>
          ) : (
            cursos.map(curso => (
              <tr
                key={curso.id}
                className={`group transition-colors ${curso.archivado ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
              >
                {/* Descripción */}
                <td className="px-6 py-4">
                  <span className={`font-bold text-sm ${curso.archivado ? 'text-slate-400' : 'text-text-main'}`}>
                    {curso.descripcion}
                  </span>
                </td>

                {/* Período */}
                <td className="px-6 py-4">
                  <div className={`flex items-center gap-2 text-xs ${curso.archivado ? 'text-slate-400' : 'text-text-muted'}`}>
                    <Calendar className="h-3.5 w-3.5 opacity-50" />
                    {new Date(curso.fechaInicio).toLocaleDateString()} — {new Date(curso.fechaFin).toLocaleDateString()}
                  </div>
                </td>

                {/* Festivos */}
                <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-500">
                  <span className={`px-2 py-0.5 rounded border ${
                    curso.archivado
                      ? 'bg-white text-slate-400 border-slate-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {curso.festivos?.length || 0}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 text-center">
                  {curso.archivado ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200">
                      Archivado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-100">
                      Activo
                    </span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      title={curso.archivado ? 'Restaurar' : 'Archivar'}
                      onClick={() => onConfirmAction({ id: curso.id!, type: curso.archivado ? 'restore' : 'archive' })}
                      className={`p-2 transition-all rounded-lg border shadow-sm active:scale-95 ${
                        curso.archivado
                          ? 'text-amber-800 bg-amber-100 border-amber-300 hover:bg-amber-200'
                          : 'text-slate-500 bg-white border-slate-200 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      {curso.archivado ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
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
                      onClick={() => onConfirmAction({ id: curso.id!, type: 'delete' })}
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
