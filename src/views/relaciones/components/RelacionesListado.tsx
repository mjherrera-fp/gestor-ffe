import React, { useState } from 'react';
import { Search, X, Edit2, Trash2, Calendar, CalendarPlus, FileText, ArrowLeftRight, Plus, FolderArchive, Loader2, Download, BarChart3, ChevronDown, ChevronUp, Star, Mail, Ban } from 'lucide-react';
import {
  Alumno, RelacionAlumno, Convenio, RelacionEstado, RelacionEstadoLabels,
  PlanFormativoEstado, PlanFormativoEstadoLabels,
  SeguimientoEstado, SeguimientoEstadoLabels,
  ValoracionEstado, ValoracionEstadoLabels,
} from '../../../types/index.ts';
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
  tooltip?: string;
}

export function StatusBadge({ estado, type, tooltip }: StatusBadgeProps) {
  const color = getStatusBadgeColor(estado, type);
  const text = getStatusLabel(estado, type);
  return (
    <Title text={tooltip || text}>
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
  onCalendar: (rel: RelacionAlumno) => void;
  onAnularRelacion?: (rel: RelacionAlumno, alumno: Alumno) => void;
  listSearchTerm: string;
  onListSearchChange: (val: string) => void;
  statusFilters: {
    relacion: { value: string; negate: boolean };
    plan: { value: string; negate: boolean };
    seguimiento: { value: string; negate: boolean };
    valoracion: { value: string; negate: boolean };
  };
  onStatusFilterChange: (tipo: 'relacion' | 'plan' | 'seguimiento' | 'valoracion', value: string, negate?: boolean) => void;
  dateFilters: {
    inicioDias: number;
    finDias: number;
    especificaDate: string;
    especificaField: 'inicio' | 'fin';
    especificaOp: 'on' | 'before' | 'after';
  };
  onDateFilterChange: (updates: Partial<{
    inicioDias: number;
    finDias: number;
    especificaDate: string;
    especificaField: 'inicio' | 'fin';
    especificaOp: 'on' | 'before' | 'after';
  }>) => void;
  onClearFilters: () => void;
  sortBy: 'empresa' | 'estado';
  sortOrder: 'asc' | 'desc';
  onSortByEmpresa: () => void;
  onSortByEstado: () => void;
  onHandleDescargarTodo: (relaciones: RelacionAlumno[]) => Promise<void>;
  setTargetDownloadRelaciones: React.Dispatch<React.SetStateAction<RelacionAlumno[]>>;
  setTargetEmailRelaciones: React.Dispatch<React.SetStateAction<RelacionAlumno[]>>;
}

// ─────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

export function RelacionesListado({
  relaciones, convenios, createRelacion, selectedRelacion,
  onSelectRelacion, onEdit, onDeleteRequest, onOpenStats, onCalendar,
  onAnularRelacion,
  listSearchTerm, onListSearchChange,
  statusFilters, onStatusFilterChange,
  dateFilters, onDateFilterChange,
  onClearFilters,
  sortBy, sortOrder, onSortByEmpresa, onSortByEstado,
  onHandleDescargarTodo, setTargetDownloadRelaciones,
  setTargetEmailRelaciones
}: RelacionesListadoProps) {

  const [filterOpen, setFilterOpen] = useState(false);

  const getEstadoOptions = (tipo: 'relacion' | 'plan' | 'seguimiento' | 'valoracion') => {
    if (tipo === 'relacion') {
      return [
        { id: 'all', label: 'Cualquier estado' },
        ...Object.values(RelacionEstado).map(e => ({ id: e, label: RelacionEstadoLabels[e as RelacionEstado] })),
      ];
    }
    if (tipo === 'plan') {
      return [
        { id: 'all', label: 'Cualquier estado' },
        ...Object.values(PlanFormativoEstado).map(e => ({ id: e, label: PlanFormativoEstadoLabels[e as PlanFormativoEstado] })),
      ];
    }
    if (tipo === 'seguimiento') {
      return [
        { id: 'all', label: 'Cualquier estado' },
        ...Object.values(SeguimientoEstado).map(e => ({ id: e, label: SeguimientoEstadoLabels[e as SeguimientoEstado] })),
      ];
    }
    return [
      { id: 'all', label: 'Cualquier estado' },
      ...Object.values(ValoracionEstado).map(e => ({ id: e, label: ValoracionEstadoLabels[e as ValoracionEstado] })),
    ];
  };

  const tipoLabels: Record<string, string> = {
    relacion: 'Rel',
    plan: 'PLA',
    seguimiento: 'Seg',
    valoracion: 'Val',
  };

  return (
    <div className="w-full lg:flex-1 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] bg-surface-card rounded-xl lg:rounded-2xl border border-border-base shadow-sm flex flex-col overflow-hidden">
      {/* Barra de filtros */}
      <div className="px-6 py-4 border-b border-border-base bg-surface-subtle/30 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Listado de Relaciones</span>
          </div>
          <div className="flex items-center gap-2">

            <Title text="Descargar todos los documentos">
              <button
                onClick={() => { if (relaciones) setTargetDownloadRelaciones(relaciones); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary/15 border border-primary-light rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </Title>
            <button
              onClick={() => createRelacion(null)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-md shadow-primary/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Crear Relación</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar empresa, relación, o alumno..."
            className="w-full bg-surface-card border border-border-base rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
            value={listSearchTerm}
            onChange={e => onListSearchChange(e.target.value)}
          />
          {listSearchTerm && (
            <button
              onClick={() => onListSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Botón desplegable filtros + ordenación */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider hover:text-text-main transition-colors"
            >
              {filterOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Filtros
            </button>
            <button
              onClick={onClearFilters}
              className="text-[9px] font-bold text-text-muted hover:text-danger transition-colors underline"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="flex bg-surface-card border border-border-base rounded-lg p-1">
            <button
              onClick={onSortByEmpresa}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-md transition-all px-2 whitespace-nowrap ${sortBy === 'empresa' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={onSortByEstado}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-md transition-all px-2 whitespace-nowrap ${sortBy === 'estado' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Panel de filtros desplegable */}
        {filterOpen && (
          <div className="space-y-3 pt-1">
            {/* Fila 1: Filtros de estado por tipo de documento */}
            <div className="flex flex-wrap items-center gap-0.5">
              {(['relacion', 'plan', 'seguimiento', 'valoracion'] as const).map(tipo => {
                const f = statusFilters[tipo];
                const options = getEstadoOptions(tipo);
                return (
                  <div key={tipo} className="bg-surface-card border border-border-base rounded-lg px-1.5 py-0.5">
                    <CustomSelect
                      prefix={tipoLabels[tipo]}
                      value={f.value}
                      onChange={(val) => onStatusFilterChange(tipo, val as string)}
                      options={options}
                      wrapperClassName="w-auto"
                      classListboxButton="!rounded-md !py-0 !pl-1.5 !pr-6 !text-[10px] !font-semibold !border-0 !focus:ring-0"
                      suffix={
                        <Title text={f.negate ? 'Excluir este estado' : 'Incluir este estado'}>
                          <button
                            onClick={() => onStatusFilterChange(tipo, f.value, !f.negate)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${f.negate
                                ? 'bg-danger-soft text-danger border border-danger/20'
                                : 'bg-primary-light text-primary border border-primary-light'
                              }`}
                          >
                            {f.negate ? '≠' : '='}
                          </button>
                        </Title>
                      }
                    />
                  </div>
                );
              })}
            </div>

            {/* Fila 2: Filtros de fecha */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted whitespace-nowrap">
                Inicia
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={dateFilters.inicioDias || ''}
                  onChange={e => onDateFilterChange({ inicioDias: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-12 bg-surface-card border border-border-base rounded px-1.5 py-1 text-[10px] font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
                />
                días
              </label>

              <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted whitespace-nowrap">
                Finaliza
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={dateFilters.finDias || ''}
                  onChange={e => onDateFilterChange({ finDias: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-12 bg-surface-card border border-border-base rounded px-1.5 py-1 text-[10px] font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
                />
                días
              </label>

              <span className="text-[10px] text-text-muted font-bold">|</span>

              <span className="text-[10px] font-bold text-text-muted">Fecha específica</span>
              <input
                type="date"
                value={dateFilters.especificaDate}
                onChange={e => onDateFilterChange({ especificaDate: e.target.value })}
                className="bg-surface-card border border-border-base rounded-lg px-2 py-1 text-[10px] font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="w-20">
                <CustomSelect
                  options={[
                    { id: 'inicio', label: 'Inicio' },
                    { id: 'fin', label: 'Fin' },
                  ]}
                  value={dateFilters.especificaField}
                  onChange={(val) => onDateFilterChange({ especificaField: val })}
                  classListboxButton="!rounded-lg !py-1 !pl-2 !pr-8 !text-[10px] !font-semibold"
                />
              </div>
              <div className="w-28">
                <CustomSelect
                  options={[
                    { id: 'on', label: 'en' },
                    { id: 'before', label: 'antes de' },
                    { id: 'after', label: 'después de' },
                  ]}
                  value={dateFilters.especificaOp}
                  onChange={(val) => onDateFilterChange({ especificaOp: val })}
                  classListboxButton="!rounded-lg !py-1 !pl-2 !pr-8 !text-[10px] !font-semibold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-subtle border-b border-border-base">
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest w-full">
                Empresa / Alumnos
              </th>
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface-card">
            {relaciones.length > 0 ? (
              relaciones.map(rel => {
                const conv = convenios.find(c => c.id === rel.convenioId);
                const isSelected = selectedRelacion?.id === rel.id;
                return (
                  <tr
                    key={rel.id}
                    onClick={() => onSelectRelacion(rel)}
className={`cursor-pointer transition-colors group align-top border-b-12 border-border-base last:border-b-0 ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-subtle/80'
                    }`}
                  >
                    <td colSpan={2} className="px-5 py-6 w-full">

                      {/* Cabecera fila */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-[13px] font-black text-text-main leading-tight">
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
                          <Title text="Estadísticas de la empresa">
                            <button
                              onClick={() => onOpenStats(rel)}
                              className="p-2 text-text-muted hover:text-warning transition-all hover:bg-surface-card rounded-lg border border-transparent hover:border-border-base"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          </Title>
                          <Title text="Añadir a calendario">
                            <button
                              onClick={() => onCalendar(rel)}
                              className="p-2 text-text-muted hover:text-primary transition-all hover:bg-surface-card rounded-lg border border-transparent hover:border-border-base"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </button>
                          </Title>
                          <Title text="Editar relación">
                            <button
                              onClick={() => onEdit(rel)}
                              className="p-2 text-text-muted hover:text-primary transition-all hover:bg-surface-card rounded-lg border border-transparent hover:border-border-base"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Title>
                          <Title text="Eliminar relación">
                            <button
                              onClick={() => onDeleteRequest(rel.id!)}
                              className="p-2 text-text-muted hover:text-danger transition-all hover:bg-surface-card rounded-lg border border-transparent hover:border-border-base"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Title>
                        </div>
                      </div>

                      {/* Alumnos */}
                      <div className="space-y-2">
                        {rel.alumnos?.map(alumno => (
                          <div
                            key={alumno.id}
                            className="bg-surface-card border border-border-base p-2.5 rounded-lg w-full flex flex-col gap-1.5"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-text-muted font-bold">PLA:</span>
                              <StatusBadge
                                estado={(alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE}
                                type="plan"
                                tooltip={`Plan formativo: ${getStatusLabel((alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE, 'plan')}`}
                              />
                              <span className="text-[9px] text-text-muted font-bold ml-0.5">SEG:</span>
                              <StatusBadge
                                estado={(alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE}
                                type="seguimiento"
                                tooltip={`Seguimiento: ${getStatusLabel((alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE, 'seguimiento')}`}
                              />
                              <span className="text-[9px] text-text-muted font-bold ml-0.5">VAL:</span>
                              <StatusBadge
                                estado={(alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE}
                                type="valoracion"
                                tooltip={`Valoración: ${getStatusLabel((alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE, 'valoracion')}`}
                              />
                              {onAnularRelacion && (
                                <Title text="Anular FFE de este alumno" className="ml-auto flex">
                                  <button
                                    onClick={e => { e.stopPropagation(); onAnularRelacion(rel, alumno); }}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-danger bg-danger-soft/60 hover:bg-danger-soft px-2 py-0.5 rounded-md transition-colors"
                                  >
                                    <Ban className="h-3 w-3" />
                                    Anular
                                  </button>
                                </Title>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-text-main truncate">
                                  {alumno.nombre} {alumno.apellidos}
                                </span>
                                <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded shrink-0">
                                  {alumno.totalHorasFFE}h
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted shrink-0">
                                <Calendar className="h-3 w-3" />
                                <span className="text-primary">
                                  {alumno.fechaInicio ? formatDate(alumno.fechaInicio) : '—'}
                                </span>
                                <span className="text-text-muted">-</span>
                                <span className="text-success">
                                  {alumno.fechaFin ? formatDate(alumno.fechaFin) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!rel.alumnos || rel.alumnos.length === 0) && (
                          <div className="text-xs text-text-muted italic">Sin alumnos asignados</div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-20 text-center">
                  <div className="w-16 h-16 bg-surface-subtle text-text-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border-base">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-sm text-text-muted font-bold uppercase tracking-widest italic">
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