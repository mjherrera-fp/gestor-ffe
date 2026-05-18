import React, { useState } from 'react';
import { Search, X, Edit2, Trash2, Calendar, FileText, ArrowLeftRight, Plus, FolderArchive, Loader2, Download, BarChart3 } from 'lucide-react';
import { RelacionAlumno, Convenio, RelacionEstado, RelacionEstadoLabels } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { getStatusBadgeColor, getStatusLabel } from '../utils/relacionesUtils.ts';
import { Title } from '@/src/components/Title.tsx';
import { formatDate } from '../../../lib/dateUtils.ts';

// ─────────────────────────────────────────
//  SUBCOMPONENTE: Badge de estado
// ─────────────────────────────────────────

interface StatusBadgeProps {
  estado: string;
  type: 'relacion' | 'plan' | 'seguimiento' | 'valoracion';
}

export function StatusBadge({ estado, type }: StatusBadgeProps) {
  const color = getStatusBadgeColor(estado, type);
  const text = getStatusLabel(estado, type);
  return (
    <Title text={text}>
      <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap truncate border ${color}`}>
        {text}
      </span>
    </Title>

  );
}

// ─────────────────────────────────────────
//  PROPS DEL LISTADO
// ─────────────────────────────────────────

interface RelacionesListadoProps {
  relaciones: RelacionAlumno[];
  convenios: (Convenio & { empresaNombre: string })[];
  createRelacion: (rel: RelacionAlumno | null) => void;
  selectedRelacion: RelacionAlumno | null;
  onSelectRelacion: (rel: RelacionAlumno) => void;
  onEdit: (rel: RelacionAlumno) => void;
  onDeleteRequest: (id: number) => void;
  onOpenStats: (rel: RelacionAlumno) => void;
  listSearchTerm: string;
  onListSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  sortBy: 'empresa' | 'estado';
  sortOrder: 'asc' | 'desc';
  onSortByEmpresa: () => void;
  onSortByEstado: () => void;
  onHandleDescargarTodo: (relaciones: RelacionAlumno[]) => Promise<void>;
  setTargetDownloadRelaciones: React.Dispatch<React.SetStateAction<RelacionAlumno[]>>;
}

// ─────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

export function RelacionesListado({
  relaciones, convenios, createRelacion, selectedRelacion,
  onSelectRelacion, onEdit, onDeleteRequest, onOpenStats,
  listSearchTerm, onListSearchChange,
  statusFilter, onStatusFilterChange,
  sortBy, sortOrder, onSortByEmpresa, onSortByEstado, 
  onHandleDescargarTodo, setTargetDownloadRelaciones
}: RelacionesListadoProps) {

  const [isDownloading, setIsDownloading] = useState(false);

  const estadosOptions = [
    { id: 'all', label: 'Cualquier estado' },
    ...Object.values(RelacionEstado).map(e => ({
      id: e,
      label: RelacionEstadoLabels[e as RelacionEstado],
    })),
  ];

  return (
    <div className="w-full lg:flex-1 bg-white rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
      {/* Barra de filtros */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Listado de Relaciones</span>
          </div>
          <div className="flex items-center gap-2">
            {/* NUEVO BOTÓN MASIVO FILTRADO */}
            <button
              onClick={() => {
                if (relaciones) {
                  setTargetDownloadRelaciones(relaciones);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
              title="Descargar todos los documentos"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="h-3.5 w-3.5" />

              )}
            </button>

            {/* Tu botón original de Crear Relación */}
            <button
              onClick={() => createRelacion(null)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-600/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Crear Relación</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Buscador */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar empresa, relación, o alumno..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              value={listSearchTerm}
              onChange={e => onListSearchChange(e.target.value)}
            />
            {listSearchTerm && (
              <button
                onClick={() => onListSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filtro de estado */}
          <div className="md:col-span-3">
            <CustomSelect
              options={estadosOptions}
              value={statusFilter}
              onChange={onStatusFilterChange}
              name="estadoFilter"
            />
          </div>

          {/* Ordenación */}
          <div className="md:col-span-4 flex bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={onSortByEmpresa}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-md transition-all ${sortBy === 'empresa' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={onSortByEstado}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-md transition-all ${sortBy === 'estado' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full">
                Empresa / Alumnos
              </th>
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {relaciones.length > 0 ? (
              relaciones.map(rel => {
                const conv = convenios.find(c => c.id === rel.convenioId);
                const isSelected = selectedRelacion?.id === rel.id;
                return (
                  <tr
                    key={rel.id}
                    onClick={() => onSelectRelacion(rel)}
                    className={`cursor-pointer transition-colors group align-top border-b-12 border-slate-50 last:border-b-0 ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50/80'
                      }`}
                  >
                    <td colSpan={2} className="px-5 py-6 w-full">

                      {/* Cabecera fila */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-[13px] font-black text-slate-800 leading-tight">
                            {conv?.empresaNombre}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-primary">
                              Ref: {rel.numRelacion}
                            </span>
                            <StatusBadge estado={rel.estado} type="relacion" />
                          </div>
                        </div>

                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onEdit(rel)}
                            className="p-2 text-slate-400 hover:text-primary transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onOpenStats(rel)}
                            className="p-2 text-slate-400 hover:text-amber-500 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                            title="Estadísticas de la empresa"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteRequest(rel.id!)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Alumnos */}
                      <div className="space-y-2">
                        {rel.alumnos?.map(alumno => (
                          <div
                            key={alumno.id}
                            className="bg-white border border-slate-100 p-2.5 rounded-lg w-full flex items-center justify-between"
                          >
                            <span className="text-xs font-bold text-slate-700">
                              {alumno.nombre} {alumno.apellidos}{' '}
                              <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                                {alumno.totalHorasFFE}h
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                              <Calendar className="h-3 w-3" />
                              <span className="text-blue-600">
                                {alumno.fechaInicio ? formatDate(alumno.fechaInicio) : '—'}
                              </span>
                              <span className="text-slate-300">-</span>
                              <span className="text-emerald-600">
                                {alumno.fechaFin ? formatDate(alumno.fechaFin) : '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {(!rel.alumnos || rel.alumnos.length === 0) && (
                          <div className="text-xs text-slate-400 italic">Sin alumnos asignados</div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">
                    No se encontraron relaciones
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div >
  );
}