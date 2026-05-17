import React from 'react';
import { Search, X, Send, Briefcase, Trophy, CheckCircle2 } from 'lucide-react';
import { Alumno, Empresa } from '../../../types/index.ts';
import { Interesado, MatchResult } from '../hooks/useIntereses.ts';
import { InteresesEmptyState } from './InteresesEmptyState.tsx';

// ─────────────────────────────────────────
//  SUBCOMPONENTE: fila mobile
// ─────────────────────────────────────────

interface EmpresaRowProps {
  empresa: Empresa;
  match: MatchResult;
  onToggle: (empresaId: number, interesado: Interesado) => void;
}

function EmpresaMobileRow({ empresa, match, onToggle }: EmpresaRowProps) {
  const { iA, iE, fullyMatched } = match;
  return (
    <div className={`p-4 flex items-center justify-between gap-4 ${fullyMatched ? 'bg-emerald-50/30' : ''}`}>
      <div className="min-w-0">
        <h4 className="font-bold text-sm text-text-main truncate">{empresa.nombre}</h4>
        <p className="text-[10px] text-text-muted">{empresa.ciudad}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onToggle(empresa.id!, 'alumno')}
          className={`p-2 rounded-lg transition-all ${iA ? 'bg-primary text-white shadow-md' : 'text-text-muted bg-slate-50'}`}
        >
          <Send className={`h-4 w-4 ${iA ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={() => onToggle(empresa.id!, 'empresa')}
          className={`p-2 rounded-lg transition-all ${iE ? 'bg-emerald-600 text-white shadow-md' : 'text-text-muted bg-slate-50'}`}
        >
          <Briefcase className="h-4 w-4" />
        </button>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${fullyMatched ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-300'}`}>
          {fullyMatched ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  SUBCOMPONENTE: fila desktop
// ─────────────────────────────────────────

function EmpresaTableRow({ empresa, match, onToggle }: EmpresaRowProps) {
  const { iA, iE, fullyMatched } = match;
  return (
    <tr className={`transition-colors ${fullyMatched ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
      <td className="px-6 py-4">
        <p className="font-bold text-sm text-text-main">{empresa.nombre}</p>
        <p className="text-[10px] text-text-muted">{empresa.ciudad}</p>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onToggle(empresa.id!, 'alumno')}
          className={`p-2 rounded-lg transition-all ${iA ? 'bg-primary text-white shadow-md shadow-primary/20 scale-110' : 'text-text-muted hover:bg-slate-100'}`}
        >
          <Send className={`h-5 w-5 ${iA ? 'fill-current' : ''}`} />
        </button>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onToggle(empresa.id!, 'empresa')}
          className={`p-2 rounded-lg transition-all ${iE ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-110' : 'text-text-muted hover:bg-slate-100'}`}
        >
          <Briefcase className="h-5 w-5" />
        </button>
      </td>
      <td className="px-6 py-4 text-center">
        {fullyMatched ? (
          <div className="inline-flex h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center animate-bounce">
            <Trophy className="h-4 w-4" />
          </div>
        ) : (
          <div className="inline-flex h-8 w-8 rounded-full bg-slate-50 text-slate-200 items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

interface InteresesGridProps {
  selectedAlumno: Alumno | null;
  empresas: Empresa[];
  searchEmpresa: string;
  onSearchEmpresaChange: (v: string) => void;
  isMatched: (alId: number, emId: number) => MatchResult;
  onToggle: (alumnoId: number, empresaId: number, interesado: Interesado) => void;
}

export function InteresesGrid({
  selectedAlumno, empresas,
  searchEmpresa, onSearchEmpresaChange,
  isMatched, onToggle,
}: InteresesGridProps) {

  if (!selectedAlumno) return <InteresesEmptyState />;

  const handleToggle = (empresaId: number, interesado: Interesado) =>
    onToggle(selectedAlumno.id!, empresaId, interesado);

  const emptySearch = (
    <div className="p-20 text-center">
      <Search className="h-12 w-12 mx-auto text-slate-200 mb-4" />
      <p className="text-slate-500 font-bold text-sm">No se encontraron empresas.</p>
    </div>
  );

  return (
    <>
      {/* Cabecera */}
      <div className="p-6 border-b border-border-base bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-main leading-tight">
            {selectedAlumno.nombre} {selectedAlumno.apellidos}
          </h2>
          <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">
            Interacción Alumno-Empresa
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-3">
          {/* Leyenda */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
              <Send className="h-3 w-3 text-primary" /> Envío de CV del alumno
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
              <Briefcase className="h-3 w-3 text-emerald-500" /> Empresa
            </div>
          </div>
          {/* Buscador empresa */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar empresa por nombre o ciudad..."
              value={searchEmpresa}
              onChange={e => onSearchEmpresaChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
            />
            {searchEmpresa && (
              <button
                onClick={() => onSearchEmpresaChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden border-b border-border-base font-sans">

        {/* Mobile */}
        <div className="lg:hidden divide-y divide-border-base">
          {empresas.length > 0
            ? empresas.map(empresa => (
                <EmpresaMobileRow
                  key={empresa.id}
                  empresa={empresa}
                  match={isMatched(selectedAlumno.id!, empresa.id!)}
                  onToggle={handleToggle}
                />
              ))
            : emptySearch}
        </div>

        {/* Desktop */}
        <div className="hidden lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-base text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <th className="px-6 py-3">Empresa / Institución</th>
                <th className="px-6 py-3 text-center">Envío de CV</th>
                <th className="px-6 py-3 text-center">Interés Empresa</th>
                <th className="px-6 py-3 text-center">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base font-sans">
              {empresas.map(empresa => (
                <EmpresaTableRow
                  key={empresa.id}
                  empresa={empresa}
                  match={isMatched(selectedAlumno.id!, empresa.id!)}
                  onToggle={handleToggle}
                />
              ))}
            </tbody>
          </table>
          {empresas.length === 0 && emptySearch}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 bg-slate-50/50 text-center mt-auto">
        <p className="text-[10px] text-text-muted italic leading-relaxed">
          Las empresas marcadas en{' '}
          <span className="text-emerald-600 font-bold">verde</span>{' '}
          indican un "Match" (interés mutuo confirmado).
        </p>
      </div>
    </>
  );
}
