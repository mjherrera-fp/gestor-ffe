import React from 'react';
import {Archive, Edit2, FileText, Plus, Search, Trash2, Upload, X, TriangleAlert} from 'lucide-react';
import {ConvenioEstado, ConvenioEstadoLabels} from '../../../types/index.ts';
import {CustomSelect} from '../../../components/CustomSelect.tsx';
import {ConvenioExtendido, SortField, SortOrder} from '../hooks/useConvenios.ts';
import {StatusBadge} from './StatusBadge.tsx';
import {Title} from '@/src/components/Title.tsx';

interface ConveniosListadoProps {
  convenios: ConvenioExtendido[];
  selectedConvenio: ConvenioExtendido | null;
  onSelectConvenio: (c: ConvenioExtendido) => void;
  onEdit: (c: ConvenioExtendido) => void;
  onDeleteRequest: (id: number) => void;
  onNew: () => void;
  onUploadDocument?: (conv: ConvenioExtendido) => void;
  listSearchTerm: string;
  onListSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortByEmpresa: () => void;
  onSortByEstado: () => void;
}

export function ConveniosListado({
  convenios, selectedConvenio,
                                   onSelectConvenio, onEdit, onDeleteRequest, onNew, onUploadDocument,
  listSearchTerm, onListSearchChange,
  statusFilter, onStatusFilterChange,
  sortBy, sortOrder, onSortByEmpresa, onSortByEstado,
}: ConveniosListadoProps) {

  const estadosOptions = [
    { id: 'all', label: 'Todos los estados' },
    ...Object.values(ConvenioEstado).map(e => ({
      id: e, label: ConvenioEstadoLabels[e as ConvenioEstado],
    })),
  ];

  return (
    <div className="w-full lg:flex-1 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] bg-white rounded-xl border border-border-base shadow-sm flex flex-col">

      {/* ── Cabecera + filtros ── */}
      <div className="px-6 py-4 border-b border-border-base space-y-4 relative z-20 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Listado de Convenios
            </span>
          </div>
          <button
            onClick={onNew}
            className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo Convenio
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center w-full">
          {/* Buscador */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar convenio..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
              value={listSearchTerm}
              onChange={e => onListSearchChange(e.target.value)}
            />
            {listSearchTerm && (
              <button
                onClick={() => onListSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filtro estado */}
          <CustomSelect
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={estadosOptions}
          />

          {/* Ordenación */}
          <div className="flex w-full bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={onSortByEmpresa}
              className={`flex-1 text-[9px] font-bold uppercase tracking-tight py-1 rounded-md transition-all ${sortBy === 'empresa' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
            >
              Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={onSortByEstado}
              className={`flex-1 text-[9px] font-bold uppercase tracking-tight py-1 rounded-md transition-all ${sortBy === 'estado' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
            >
              Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Vista mobile: tarjetas ── */}
      <div className="lg:hidden divide-y divide-border-base">
        {convenios.map(conv => (
          <div
            key={conv.id}
            onClick={() => onSelectConvenio(conv)}
            className={`p-5 cursor-pointer transition-colors ${selectedConvenio?.id === conv.id ? 'bg-primary-light/40' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-text-main truncate">{conv.empresaNombre}</h4>
                <p className="text-[10px] text-primary font-bold uppercase tracking-tight">{conv.centroNombre}</p>
                <p className="text-[10px] text-text-muted font-bold mt-1">Ref: {conv.numConvenio}</p>
                {!!conv.convenioIncompleto && (
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wide">
                    <TriangleAlert className="h-3 w-3" /> Falta info convenio
                  </span>
                )}
              </div>
              <div className="shrink-0 scale-90 origin-top-right">
                <StatusBadge estado={conv.estado} />
              </div>
            </div>
            {onUploadDocument && (
                <div className="mt-2 flex justify-end">
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUploadDocument(conv);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3"/>
                    Documentos
                  </button>
                </div>
            )}
          </div>
        ))}
        {convenios.length === 0 && (
          <div className="px-5 py-12 text-center text-text-muted text-sm italic">
            No se encontraron convenios.
          </div>
        )}
      </div>

      {/* ── Vista desktop: tabla ── */}
      <div className="hidden lg:block lg:flex-1 lg:min-h-0 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-border-base">
              <th
                onClick={onSortByEmpresa}
                className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
              >
                Centro / Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Ref. Convenio
              </th>
              <th
                onClick={onSortByEstado}
                className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
              >
                Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-base">
            {convenios.map(conv => (
              <tr
                key={conv.id}
                onClick={() => onSelectConvenio(conv)}
                className={`cursor-pointer transition-colors ${selectedConvenio?.id === conv.id ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
              >
                <td className="px-5 py-4">
                  <p className="text-[9px] text-primary font-bold uppercase tracking-tight mb-0.5">{conv.centroNombre}</p>
                  <p className="font-bold text-text-main text-sm truncate max-w-50">{conv.empresaNombre}</p>
                  {!!conv.convenioIncompleto && (
                    <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wide">
                      <TriangleAlert className="h-3 w-3" /> Falta info convenio
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs font-bold text-text-muted">{conv.numConvenio}</p>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge estado={conv.estado} />
                </td>
                <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end">
                    {onUploadDocument && (
                        <Title text="Subir documentos">
                          <button
                              onClick={() => onUploadDocument(conv)}
                              className="p-2 text-slate-400 hover:text-primary transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                          >
                            <Archive className="h-4 w-4"/>
                          </button>
                        </Title>
                    )}
                    <Title text="Editar convenio">
                      <button
                        onClick={() => onEdit(conv)}
                        className="p-2 text-slate-400 hover:text-primary transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </Title>
                    <Title text="Eliminar convenio">
                      <button
                        onClick={() => onDeleteRequest(conv.id!)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Title>
                  </div>
                </td>
              </tr>
            ))}
            {convenios.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-text-muted text-sm italic">
                  No se encontraron convenios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
