import React from 'react';
import {
  Download, FileSpreadsheet, Search, LayoutGrid, List, ArrowUpDown,
  GraduationCap, Mail,
  Plus,
} from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { SortField, SortOrder, FilterStatus, ViewMode } from '../hooks/useAlumnos.ts';

const FILTER_OPTIONS = [
  { id: 'all',      label: 'Todos los Estudiantes' },
  { id: 'pending',  label: 'Pendiente de Asignar' },
  { id: 'assigned', label: 'Asignados' },
];

const SORT_OPTIONS: { id: SortField; label: string }[] = [
  { id: 'apellidos', label: 'Apellidos' },
  { id: 'nombre',    label: 'Nombre' },
  { id: 'horas',     label: 'Horas FFE' },
];

interface AlumnosToolbarProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (v: FilterStatus) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onToggleSort: (field: SortField) => void;
  isImporting: boolean;
  onDownloadTemplate: () => void | Promise<void>;
  onImportClick: () => void;
  onNewAlumno: () => void;
  onBulkEmail: () => void;
}

export function AlumnosToolbar({
  searchTerm, onSearchChange,
  viewMode, onViewModeChange,
  filterStatus, onFilterStatusChange,
  sortBy, sortOrder, onToggleSort,
  isImporting, onDownloadTemplate, onImportClick, onNewAlumno,
  onBulkEmail,
}: AlumnosToolbarProps) {
  return (
    <div className="space-y-4">

      {/* Fila superior: título + botones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">
          Alumnado del Curso
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onDownloadTemplate}
            title="Descargar plantilla Excel"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Download className="h-4 w-4" /> Plantilla
          </button>
          <button
            onClick={onImportClick}
            disabled={isImporting}
            title="Importar desde Excel"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isImporting ? 'Importando...' : 'Importar Excel'}
          </button>
          <button
            onClick={onBulkEmail}
            title="Enviar correo a alumnos filtrados"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onClick={onNewAlumno}
            className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all font-sans shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Registrar Alumno
          </button>
        </div>
      </div>

      {/* Fila inferior: búsqueda + controles */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Listado de Estudiantes</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">

          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellidos, DNI, email..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-sans"
            />
          </div>

          <div className="flex gap-2">
            {/* Toggle vista */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => onViewModeChange('grid')}
                title="Vista Cuadrícula"
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewModeChange('table')}
                title="Vista Tabla"
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Filtro estado */}
            <CustomSelect
              options={FILTER_OPTIONS}
              value={filterStatus}
              onChange={val => onFilterStatusChange(val as FilterStatus)}
              name="estadoFilter"
            />
          </div>
        </div>

        {/* Ordenación */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] flex items-center uppercase tracking-wider text-slate-500 font-bold mr-2">
            Ordenar por:
          </span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onToggleSort(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                sortBy === opt.id
                  ? 'bg-blue-50 text-blue-600 border-blue-200 ring-4 ring-blue-500/5'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {opt.label}
              {sortBy === opt.id && (
                <ArrowUpDown className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
