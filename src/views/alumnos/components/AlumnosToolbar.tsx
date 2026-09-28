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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-surface-hover text-text-main px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-surface-strong transition-all border border-border-base"
            >
              <Download className="h-4 w-4" /> Plantilla
            </button>
          </Title>
          <Title text="Importar desde Excel">
            <button
              onClick={onImportClick}
              disabled={isImporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-success-soft text-success-strong px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-success/15 transition-all border border-success/20 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isImporting ? 'Importando...' : 'Importar Excel'}
            </button>
          </Title>
          <Title text="Instrucciones para importar CVs">
            <button
              onClick={() => setShowImportCVModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-light text-primary px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/15 transition-all border border-primary-light"
            >
              <FileArchive className="h-4 w-4" />
              Importar CVs
            </button>
          </Title>
          <Title text="Enviar correo a alumnos filtrados">
            <button
              onClick={onBulkEmail}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-light text-primary px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/15 transition-all border border-primary-light"
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
      <div className="bg-surface-card p-4 rounded-xl border border-border-base shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Listado de Estudiantes</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">

          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellidos, DNI, email..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border-base rounded-lg text-sm text-text-main focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-sans"
            />
          </div>

          <div className="flex gap-2">
            {/* Toggle vista */}
            <div className="flex bg-surface-hover p-1 rounded-lg">
              <Title text="Vista Cuadrícula">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-surface-card text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </Title>
              <Title text="Vista Tabla">
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-surface-card text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
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
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-base">
          <span className="text-[10px] flex items-center uppercase tracking-wider text-text-muted font-bold mr-2">
            Ordenar por:
          </span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onToggleSort(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                sortBy === opt.id
                  ? 'bg-primary-light text-primary border-primary-light ring-4 ring-primary/5'
                  : 'bg-surface-card text-text-main border-border-base hover:border-border-base'
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
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-base">
          <span className="text-[10px] flex items-center uppercase tracking-wider text-text-muted font-bold mr-1">
            Filtrar por:
          </span>

          {/* Más de X envíos */}
          <div className="flex items-center gap-1">
            <Send className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-[11px] text-text-muted font-semibold whitespace-nowrap">+ de</span>
            <input
              type="number"
              min={0}
              value={filterMinCVEnvios}
              onChange={e => onFilterMinCVEnviosChange(Math.max(0, Number(e.target.value)))}
              className="w-14 px-2 py-1 text-xs font-bold text-center text-text-main bg-surface-card border border-border-base rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
            <span className="text-[11px] text-text-muted font-semibold whitespace-nowrap">envíos</span>
          </div>

          <span className="text-border-base select-none">|</span>

          {/* Empresas interesadas */}
          <div className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-text-muted" />
            {EMPRESAS_INTERESADAS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterEmpresasInteresadasChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  filterEmpresasInteresadas === opt.id
                    ? 'bg-primary-light text-primary border-primary-light'
                    : 'bg-surface-card text-text-muted border-border-base hover:border-border-base'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-border-base select-none">|</span>

          {/* Relación */}
          <div className="flex items-center gap-1">
            <GitPullRequest className="h-3.5 w-3.5 text-text-muted" />
            {RELACION_STATUS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterRelacionStatusChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  filterRelacionStatus === opt.id
                    ? 'bg-warning-soft text-warning-strong border-warning/20'
                    : 'bg-surface-card text-text-muted border-border-base hover:border-border-base'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-border-base select-none">|</span>

          {/* NSS */}
          <div className="flex items-center gap-1">
            <TriangleAlert className="h-3.5 w-3.5 text-text-muted" />
            {NSS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterNSSChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  filterNSS === opt.id
                    ? opt.id === 'sin_nss'
                      ? 'bg-danger-soft text-danger-strong border-danger/20'
                      : 'bg-success-soft text-success-strong border-success/20'
                    : 'bg-surface-card text-text-muted border-border-base hover:border-border-base'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-border-base select-none">|</span>

          {/* Horas FFE */}
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-text-muted" />
            <button
              onClick={() => onFilterHorasFFEChange(
                filterHorasFFE.mode === 'exact' && filterHorasFFE.value === 500
                  ? { mode: 'off' }
                  : { mode: 'exact', value: 500 }
              )}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                filterHorasFFE.mode === 'exact' && filterHorasFFE.value === 500
                  ? 'bg-warning-soft text-warning-strong border-warning/20'
                  : 'bg-surface-card text-text-muted border-border-base hover:border-border-base'
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
                  ? 'bg-warning-soft text-warning-strong border-warning/20'
                  : 'bg-surface-card text-text-muted border-border-base hover:border-border-base'
              }`}
            >
              380h
            </button>
            <span className="text-[11px] text-text-muted font-semibold whitespace-nowrap">≤</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              // El valor se deriva del filtro, no de un estado local: antes el
              // input guardaba su propio texto y se quedaba desincronizado
              // al cambiar el filtro desde los botones 500h / 380h o al
              // limpiar los filtros.
              value={filterHorasFFE.mode === 'lte' ? String(filterHorasFFE.value) : ''}
              onChange={e => {
                const v = Number(e.target.value);
                if (e.target.value === '' || Number.isNaN(v) || v < 0) onFilterHorasFFEChange({ mode: 'off' });
                else onFilterHorasFFEChange({ mode: 'lte', value: Math.floor(v) });
              }}
              className={`w-14 px-2 py-1 text-xs font-bold text-center text-text-main bg-surface-card border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                filterHorasFFE.mode === 'lte' ? 'border-warning/40 bg-warning-soft/50' : 'border-border-base'
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
              }}
              className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold text-danger border border-danger/20 bg-danger-soft hover:bg-danger/15 transition-all"
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
              <div className="p-2 rounded-lg bg-primary-light text-primary">
                <FileArchive className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-text-main">Importar CVs</h3>
            </div>
            <button onClick={() => setShowImportCVModal(false)} className="text-text-muted hover:text-text-main p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 text-sm text-text-muted">
            <p>Para importar los CVs de los alumnos, sigue estos pasos:</p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Prepara un archivo <strong>.zip</strong> con los CVs en formato <strong>PDF</strong>.</li>
              <li>Cada archivo PDF debe nombrarse con el <strong>DNI</strong> del alumno (ej: <code className="bg-surface-hover px-1.5 py-0.5 rounded text-xs font-mono">12345678X.pdf</code>).</li>
              <li>El sistema buscará al alumno por su DNI y le asignará el CV automáticamente.</li>
            </ol>
            <div className="bg-warning-soft border border-warning/20 rounded-lg p-3 text-xs text-warning-strong">
              <strong>Nota:</strong> Los DNI deben coincidir exactamente con los registrados en el sistema (incluyendo letra).
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => { setShowImportCVModal(false); onImportZipClick(); }}
              disabled={isImportingZip}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <FileArchive className="h-4 w-4" />
              {isImportingZip ? 'Procesando...' : 'Seleccionar archivo ZIP'}
            </button>
            <button
              onClick={() => setShowImportCVModal(false)}
              className="px-4 py-2.5 text-sm font-bold text-text-muted hover:bg-surface-hover rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
