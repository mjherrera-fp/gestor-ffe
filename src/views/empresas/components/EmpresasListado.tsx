import React from 'react';
import { Building, Hash, Plus, Edit2, Trash2, Mail, Phone, X, Star, Filter, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Empresa } from '../../../types/index.ts';

interface EmpresasListadoProps {
  empresas: Empresa[];
  selectedEmpresa: Empresa | null;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onSelectEmpresa: (emp: Empresa) => void;
  onNew: () => void;
  onEdit: (emp: Empresa) => void;
  onDeleteRequest: (id: number) => void;
  // Email
  onIndividualEmail: (emp: Empresa) => void;
  onBulkEmail: () => void;
  // Excel
  onDownloadTemplate: () => void;
  onImportClick: () => void;
  isImporting: boolean;
  // Filters
  filterValoracion: number;
  onFilterValoracionChange: (v: number) => void;
  filterUltimosCursos: number;
  onFilterUltimosCursosChange: (v: number) => void;
  filterColaboracion: 'todas' | 'con' | 'sin' | 'sin_convenio';
  onFilterColaboracionChange: (v: 'todas' | 'con' | 'sin' | 'sin_convenio') => void;
  cursosUnicos: string[];
}

export function EmpresasListado({
  empresas, selectedEmpresa,
  searchTerm, onSearchChange,
  onSelectEmpresa, onNew, onEdit, onDeleteRequest,
  onIndividualEmail, onBulkEmail,
  onDownloadTemplate, onImportClick, isImporting,
  filterValoracion, onFilterValoracionChange,
  filterUltimosCursos, onFilterUltimosCursosChange,
  filterColaboracion, onFilterColaboracionChange,
  cursosUnicos,
}: EmpresasListadoProps) {

  const emptyMsg = searchTerm
    ? 'No se encontraron empresas para esta búsqueda.'
    : 'No hay empresas registradas todavía.';

  const cleanFilters = filterValoracion > 0 || filterUltimosCursos > 0 || filterColaboracion !== 'todas';

  return (
    <div className="w-full lg:flex-1 bg-white rounded-xl border border-border-base shadow-sm overflow-hidden flex flex-col h-full">

      {/* Cabecera */}
      <div className="px-6 py-4 border-b border-border-base space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Empresas e Instituciones
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBulkEmail}
              title="Enviar correo a empresas filtradas"
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              onClick={onDownloadTemplate}
              title="Descargar plantilla Excel"
              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
            >
              <Download className="h-4 w-4" /> Plantilla
            </button>
            <button
              onClick={onImportClick}
              disabled={isImporting}
              title="Importar desde Excel"
              className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {isImporting ? 'Importando...' : 'Importar Excel'}
            </button>
            <button
              onClick={onNew}
              className="bg-primary text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all font-sans shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nueva Empresa
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre o CIF..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
            <Filter className="h-3 w-3" />
            Filtros
          </div>

          <select
            className="text-[10px] bg-white border border-border-base rounded-lg px-2 py-1.5 font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={filterColaboracion}
            onChange={e => onFilterColaboracionChange(e.target.value as 'todas' | 'con' | 'sin' | 'sin_convenio')}
          >
            <option value="todas">Todas las empresas</option>
            <option value="con">Con colaboración</option>
            <option value="sin">Sin colaboración</option>
            <option value="sin_convenio">Sin convenio</option>
          </select>

          {cursosUnicos.length > 0 && (
            <select
              className="text-[10px] bg-white border border-border-base rounded-lg px-2 py-1.5 font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
              value={filterUltimosCursos}
              onChange={e => onFilterUltimosCursosChange(Number(e.target.value))}
            >
              <option value={0}>Cualquier curso</option>
              {cursosUnicos.slice(0, 5).map((_, i) => (
                <option key={i} value={i + 1}>
                  {cursosUnicos.slice(0, i + 1).join(', ')}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => onFilterValoracionChange(filterValoracion === v ? 0 : v)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                  filterValoracion === v
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'text-text-muted hover:bg-slate-100 border border-transparent'
                }`}
              >
                {v === 0 ? '★' : v}
              </button>
            ))}
          </div>

          {cleanFilters && (
            <button
              onClick={() => { onFilterValoracionChange(0); onFilterUltimosCursosChange(0); onFilterColaboracionChange('todas'); }}
              className="text-[10px] font-bold text-text-muted hover:text-primary underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="lg:hidden divide-y divide-border-base">
        {empresas.map(emp => (
          <div
            key={emp.id}
            onClick={() => onSelectEmpresa(emp)}
            className={`p-5 cursor-pointer transition-colors ${selectedEmpresa?.id === emp.id ? 'bg-primary-light/30' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-bold text-text-main text-sm truncate">{emp.nombre}</h4>
                <p className="text-[9px] text-text-muted font-bold mt-1">CIF: {emp.cif}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <Mail className="h-3 w-3" /> {emp.email}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <Phone className="h-3 w-3" /> {emp.tlfn}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onIndividualEmail(emp); }}
                  title="Enviar correo"
                  className="p-2 text-text-muted hover:text-blue-500"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(emp); }}
                  className="p-2 text-text-muted hover:text-primary"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteRequest(emp.id!); }}
                  className="p-2 text-text-muted hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {empresas.length === 0 && (
          <div className="px-5 py-12 text-center text-text-muted text-sm italic">{emptyMsg}</div>
        )}
      </div>

      {/* ── Desktop tabla ── */}
      <div className="hidden lg:block overflow-auto border-b border-border-base">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-border-base">
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Entidad</th>
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Contacto</th>
              <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-base font-sans">
            {empresas.map(emp => (
              <tr
                key={emp.id}
                onClick={() => onSelectEmpresa(emp)}
                className={`cursor-pointer transition-colors ${selectedEmpresa?.id === emp.id ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
              >
                <td className="px-5 py-4">
                  <p className="font-bold text-text-main text-sm">{emp.nombre}</p>
                  <p className="text-[10px] text-text-muted">{emp.cif}</p>
                </td>
                <td className="px-5 py-4 text-sm text-text-main">
                  <p>{emp.email}</p>
                  <p className="text-[10px] text-text-muted">{emp.tlfn}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={e => { e.stopPropagation(); onIndividualEmail(emp); }}
                      title="Enviar correo"
                      className="p-1.5 text-text-muted hover:text-blue-500 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onEdit(emp); }}
                      className="p-1.5 text-text-muted hover:text-primary transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteRequest(emp.id!); }}
                      className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-text-muted text-sm italic">
                  {emptyMsg}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
