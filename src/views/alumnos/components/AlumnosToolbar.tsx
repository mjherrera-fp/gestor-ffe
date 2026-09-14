import React, { useState } from 'react';
import {
  Download, FileSpreadsheet, Search, LayoutGrid, List, ArrowUpDown,
  GraduationCap, Mail, FileArchive, X,
  Plus, Send, Building2, GitPullRequest, TriangleAlert, Clock,
} from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Title } from '../../../components/Title.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { SortField, SortOrder, FilterStatus, FilterRelacionStatus, FilterHorasFFE, ViewMode } from '../hooks/useAlumnos.ts';

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

const EMPRESAS_INTERESADAS_OPTIONS = [
  { id: 'all' as const, label: 'Todas' },
  { id: 'con' as const, label: 'Con interés' },
  { id: 'sin' as const, label: 'Sin interés' },
];

const RELACION_STATUS_OPTIONS: { id: FilterRelacionStatus; label: string }[] = [
  { id: 'all',           label: 'Todos' },
  { id: 'con_relacion',   label: 'Con relación' },
  { id: 'sin_relacion',   label: 'Sin relación' },
];

const NSS_OPTIONS: { id: 'all' | 'con_nss' | 'sin_nss'; label: string }[] = [
  { id: 'all',      label: 'Todos' },
  { id: 'con_nss',  label: 'Con NSS' },
  { id: 'sin_nss',  label: 'Sin NSS' },
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
  filterMinCVEnvios: number;
  onFilterMinCVEnviosChange: (v: number) => void;
  filterEmpresasInteresadas: 'all' | 'con' | 'sin';
  onFilterEmpresasInteresadasChange: (v: 'all' | 'con' | 'sin') => void;
  filterRelacionStatus: FilterRelacionStatus;
  onFilterRelacionStatusChange: (v: FilterRelacionStatus) => void;
  filterNSS: 'all' | 'con_nss' | 'sin_nss';
  onFilterNSSChange: (v: 'all' | 'con_nss' | 'sin_nss') => void;
  filterHorasFFE: FilterHorasFFE;
  onFilterHorasFFEChange: (v: FilterHorasFFE) => void;
  isImporting: boolean;
  isImportingZip: boolean;
  onDownloadTemplate: () => void | Promise<void>;
  onImportClick: () => void;
  onImportZipClick: () => void;
  onNewAlumno: () => void;
  onBulkEmail: () => void;
}

export function AlumnosToolbar({
  searchTerm, onSearchChange,
  viewMode, onViewModeChange,
  filterStatus, onFilterStatusChange,
  sortBy, sortOrder, onToggleSort,
  filterMinCVEnvios, onFilterMinCVEnviosChange,
  filterEmpresasInteresadas, onFilterEmpresasInteresadasChange,
  filterRelacionStatus, onFilterRelacionStatusChange,
  filterNSS, onFilterNSSChange,
  filterHorasFFE, onFilterHorasFFEChange,
  isImporting, isImportingZip, onDownloadTemplate, onImportClick, onImportZipClick, onNewAlumno,
  onBulkEmail,
}: AlumnosToolbarProps) {
  const [showImportCVModal, setShowImportCVModal] = useState(false);
  const [lteInput, setLteInput] = useState('');
  return (
    <div className="space-y-4">

      {/* Fila superior: título + botones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">
          Alumnado del Curso
        </h1>
        <div className="flex flex-wrap gap-2">
          <Title text="Descargar plantilla Excel">
            <button
              onClick={onDownloadTemplate}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
            >
              <Download className="h-4 w-4" /> Plantilla
            </button>
          </Title>
          <Title text="Importar desde Excel">
            <button
              onClick={onImportClick}
              disabled={isImporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isImporting ? 'Importando...' : 'Importar Excel'}
            </button>
          </Title>
          <Title text="Instrucciones para importar CVs">
            <button
              onClick={() => setShowImportCVModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-purple-100 transition-all border border-purple-100"
            >
              <FileArchive className="h-4 w-4" />
              Importar CVs
            </button>
          </Title>
          <Title text="Enviar correo a alumnos filtrados">
            <button
              onClick={onBulkEmail}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
            >
              <Mail className="h-4 w-4" />
            </button>
          </Title>
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
              <Title text="Vista Cuadrícula">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </Title>
              <Title text="Vista Tabla">
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </Title>
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

        {/* Filtros avanzados: envíos CV, empresas interesadas, match */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <span className="text-[10px] flex items-center uppercase tracking-wider text-slate-500 font-bold mr-1">
            Filtrar por:
          </span>

          {/* Más de X envíos */}
          <div className="flex items-center gap-1">
            <Send className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">+ de</span>
            <input
              type="number"
              min={0}
              value={filterMinCVEnvios}
              onChange={e => onFilterMinCVEnviosChange(Math.max(0, Number(e.target.value)))}
              className="w-14 px-2 py-1 text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">envíos</span>
          </div>

          <span className="text-slate-200 select-none">|</span>

          {/* Empresas interesadas */}
          <div className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            {EMPRESAS_INTERESADAS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterEmpresasInteresadasChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  filterEmpresasInteresadas === opt.id
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-slate-200 select-none">|</span>

          {/* Relación */}
          <div className="flex items-center gap-1">
            <GitPullRequest className="h-3.5 w-3.5 text-slate-400" />
            {RELACION_STATUS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterRelacionStatusChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  filterRelacionStatus === opt.id
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-slate-200 select-none">|</span>

          {/* NSS */}
          <div className="flex items-center gap-1">
            <TriangleAlert className="h-3.5 w-3.5 text-slate-400" />
            {NSS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterNSSChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  filterNSS === opt.id
                    ? opt.id === 'sin_nss'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-slate-200 select-none">|</span>

          {/* Horas FFE */}
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <button
              onClick={() => onFilterHorasFFEChange(
                filterHorasFFE.mode === 'exact' && filterHorasFFE.value === 500
                  ? { mode: 'off' }
                  : { mode: 'exact', value: 500 }
              )}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                filterHorasFFE.mode === 'exact' && filterHorasFFE.value === 500
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              500h
            </button>
            <button
              onClick={() => onFilterHorasFFEChange(
                filterHorasFFE.mode === 'exact' && filterHorasFFE.value === 380
                  ? { mode: 'off' }
                  : { mode: 'exact', value: 380 }
              )}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                filterHorasFFE.mode === 'exact' && filterHorasFFE.value === 380
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              380h
            </button>
            <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">≤</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={lteInput}
              onChange={e => {
                setLteInput(e.target.value);
                const v = Number(e.target.value);
                if (e.target.value === '' || Number.isNaN(v) || v < 0) onFilterHorasFFEChange({ mode: 'off' });
                else onFilterHorasFFEChange({ mode: 'lte', value: Math.floor(v) });
              }}
              className={`w-14 px-2 py-1 text-xs font-bold text-center bg-slate-50 border rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                filterHorasFFE.mode === 'lte' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'
              }`}
            />
          </div>

          {/* Indicador de filtros activos */}
          {(filterMinCVEnvios > 0 || filterEmpresasInteresadas !== 'all' || filterRelacionStatus !== 'all' || filterNSS !== 'all' || filterHorasFFE.mode !== 'off') && (
            <button
              onClick={() => {
                onFilterMinCVEnviosChange(0);
                onFilterEmpresasInteresadasChange('all');
                onFilterRelacionStatusChange('all');
                onFilterNSSChange('all');
                onFilterHorasFFEChange({ mode: 'off' });
                setLteInput('');
              }}
              className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Modal instrucciones importación CVs ── */}
      <Modal open={showImportCVModal} onClose={() => setShowImportCVModal(false)} maxWidth="md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                <FileArchive className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Importar CVs</h3>
            </div>
            <button onClick={() => setShowImportCVModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 text-sm text-slate-600">
            <p>Para importar los CVs de los alumnos, sigue estos pasos:</p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Prepara un archivo <strong>.zip</strong> con los CVs en formato <strong>PDF</strong>.</li>
              <li>Cada archivo PDF debe nombrarse con el <strong>DNI</strong> del alumno (ej: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">12345678X.pdf</code>).</li>
              <li>El sistema buscará al alumno por su DNI y le asignará el CV automáticamente.</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Nota:</strong> Los DNI deben coincidir exactamente con los registrados en el sistema (incluyendo letra).
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => { setShowImportCVModal(false); onImportZipClick(); }}
              disabled={isImportingZip}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              <FileArchive className="h-4 w-4" />
              {isImportingZip ? 'Procesando...' : 'Seleccionar archivo ZIP'}
            </button>
            <button
              onClick={() => setShowImportCVModal(false)}
              className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
