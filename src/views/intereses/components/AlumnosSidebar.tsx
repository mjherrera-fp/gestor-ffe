import React, { useState } from 'react';
import { GraduationCap, Search, X, ArrowUpDown, Send, Building2, GitCompare, ChevronDown, ChevronUp } from 'lucide-react';
import { Alumno } from '../../../types/index.ts';
import { SortField, SortOrder, FilterMatchStatus } from '../hooks/useIntereses.ts';

interface AlumnosSidebarProps {
  alumnos: Alumno[];
  selectedAlumnoIds: number[];
  searchAlumno: string;
  onSearchChange: (v: string) => void;
  onToggleSelection: (id: number) => void;
  onClearSelection: () => void;
  getAlumnoStats: (id: number) => { envios: number; solicitudes: number };
  sortBy: SortField;
  sortOrder: SortOrder;
  onToggleSort: (field: SortField) => void;
  filterMinCVEnvios: number;
  onFilterMinCVEnviosChange: (v: number) => void;
  filterEmpresasInteresadas: 'all' | 'con' | 'sin';
  onFilterEmpresasInteresadasChange: (v: 'all' | 'con' | 'sin') => void;
  filterMatchStatus: FilterMatchStatus;
  onFilterMatchStatusChange: (v: FilterMatchStatus) => void;
}

export function AlumnosSidebar({
  alumnos, selectedAlumnoIds,
  searchAlumno, onSearchChange,
  onToggleSelection, onClearSelection,
  getAlumnoStats,
  sortBy, sortOrder, onToggleSort,
  filterMinCVEnvios, onFilterMinCVEnviosChange,
  filterEmpresasInteresadas, onFilterEmpresasInteresadasChange,
  filterMatchStatus, onFilterMatchStatusChange,
}: AlumnosSidebarProps) {
  const anyFilterActive = filterMinCVEnvios > 0 || filterEmpresasInteresadas !== 'all' || filterMatchStatus !== 'all';
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="w-full lg:w-75 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm overflow-hidden flex flex-col h-full">

      {/* Cabecera + buscador */}
      <div className="px-6 py-4 border-b border-border-base bg-slate-50/50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Listado de Estudiantes
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={searchAlumno}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
          />
          {searchAlumno && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 min-h-9">
          <span className="text-xs font-bold text-purple-700">
            {selectedAlumnoIds.length} seleccionados
          </span>
          {selectedAlumnoIds.length > 0 && (
            <button
              onClick={onClearSelection}
              className="text-[10px] font-bold text-purple-500 hover:text-purple-700 uppercase tracking-wider"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Ordenación */}
      <div className="px-4 py-2 border-b border-border-base flex gap-1">
        {(['apellidos', 'nombre'] as const).map(field => (
          <button
            key={field}
            onClick={() => onToggleSort(field)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border ${
              sortBy === field
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }`}
          >
            {field === 'apellidos' ? 'Apellidos' : 'Nombre'}
            {sortBy === field && (
              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            )}
          </button>
        ))}
      </div>

      {/* Filtros (collapsable) */}
      <div className="border-b border-border-base">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 transition-colors"
        >
          <span>Filtros{anyFilterActive && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-400 align-middle" />}</span>
          {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {filtersOpen && (
        <div className="px-3 pb-2 space-y-2">
          {/* + de X envíos */}
          <div className="flex items-center gap-1.5">
            <Send className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">+ de</span>
            <input
              type="number"
              min={0}
              value={filterMinCVEnvios}
              onChange={e => onFilterMinCVEnviosChange(Math.max(0, Number(e.target.value)))}
              className="w-12 px-1.5 py-0.5 text-[10px] font-bold text-center bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">envíos</span>
          </div>

          {/* Empresas interesadas */}
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
            {(['all', 'con', 'sin'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onFilterEmpresasInteresadasChange(opt)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                  filterEmpresasInteresadas === opt
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt === 'all' ? 'Todas' : opt === 'con' ? 'Con interés' : 'Sin interés'}
              </button>
            ))}
          </div>

          {/* Match status */}
          <div className="flex items-center gap-1">
            <GitCompare className="h-3 w-3 text-slate-400 shrink-0" />
            {(['all', 'con_match_y_relacion', 'con_match_sin_relacion', 'sin_match'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onFilterMatchStatusChange(opt)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                  filterMatchStatus === opt
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt === 'all' ? 'Todos' : opt === 'con_match_y_relacion' ? 'Match+Rel.' : opt === 'con_match_sin_relacion' ? 'Match sin Rel.' : 'Sin Match'}
              </button>
            ))}
          </div>

          {anyFilterActive && (
            <button
              onClick={() => {
                onFilterMinCVEnviosChange(0);
                onFilterEmpresasInteresadasChange('all');
                onFilterMatchStatusChange('all');
              }}
              className="w-full mt-1 px-2 py-1 rounded text-[9px] font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        )}
      </div>

      {/* Lista */}
      <div className="lg:overflow-y-auto divide-y divide-border-base max-h-75 lg:max-h-full">
        {alumnos.map(al => {
          const { envios, solicitudes } = getAlumnoStats(al.id!);
          const isSelected = selectedAlumnoIds.includes(al.id!);
          return (
            <div
              key={al.id}
              onClick={() => onToggleSelection(al.id!)}
              className={`flex items-center gap-2 p-2 pl-4 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-purple-50 border-l-3 border-purple-500'
                  : 'hover:bg-slate-50 border-l-3 border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0 py-3">
                <div className="flex flex-col gap-2">
                  <div className={`font-bold text-sm leading-tight truncate ${
                    isSelected ? 'text-purple-700' : 'text-text-main'
                  }`}>
                    {al.nombre} {al.apellidos}
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {envios} Envíos
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {solicitudes} Solics
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {alumnos.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
            No hay resultados
          </div>
        )}
      </div>
    </div>
  );
}
