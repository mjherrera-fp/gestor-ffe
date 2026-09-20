import React from 'react';
import { Search, X, Send, Briefcase, Trophy, CheckCircle2, Minus } from 'lucide-react';
import { Alumno, Empresa } from '../../../types/index.ts';
import { Interesado, MatchResult } from '../hooks/useIntereses.ts';
import { InteresesEmptyState } from './InteresesEmptyState.tsx';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

interface BatchMatchResult extends MatchResult {
  partialIA: boolean;
  partialIE: boolean;
}

interface EmpresaRowProps {
  empresa: Empresa;
  match: BatchMatchResult;
  onToggle: (empresaId: number, interesado: Interesado) => void;
  onCreateRelacion?: (empresaId: number) => void;
}

// ─────────────────────────────────────────
//  SUBCOMPONENTE: fila mobile
// ─────────────────────────────────────────

function EmpresaMobileRow({ empresa, match, onToggle, onCreateRelacion }: EmpresaRowProps) {
  const { iA, iE, fullyMatched, partialIA, partialIE } = match;
  const showPartialA = partialIA && !iA;
  const showPartialE = partialIE && !iE;
  return (
    <div className={`p-4 flex items-center justify-between gap-4 ${fullyMatched ? 'bg-success-soft/30' : ''}`}>
      <div className="min-w-0">
        <h4 className="font-bold text-sm text-text-main truncate">{empresa.nombre}</h4>
        <p className="text-[10px] text-text-muted">{empresa.ciudad}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onToggle(empresa.id!, 'alumno')}
          className={`p-2 rounded-lg transition-all ${
            iA ? 'bg-primary text-white shadow-md' :
            showPartialA ? 'bg-primary/30 text-primary border border-primary/40' :
            'text-text-muted bg-surface-subtle'
          }`}
        >
          {showPartialA ? <Minus className="h-4 w-4" /> : <Send className={`h-4 w-4 ${iA ? 'fill-current' : ''}`} />}
        </button>
        <button
          onClick={() => onToggle(empresa.id!, 'empresa')}
          className={`p-2 rounded-lg transition-all ${
            iE ? 'bg-success text-white shadow-md' :
            showPartialE ? 'bg-success/30 text-success-strong border border-success/40' :
            'text-text-muted bg-surface-subtle'
          }`}
        >
          {showPartialE ? <Minus className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onCreateRelacion?.(empresa.id!)}
          disabled={!fullyMatched}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
            fullyMatched
              ? 'bg-success-soft text-success-strong animate-pulse cursor-pointer hover:bg-success/15'
              : 'bg-surface-hover text-text-muted cursor-not-allowed'
          }`}
          title={fullyMatched ? 'Crear relación con alumnos seleccionados' : 'Sin match completo'}
        >
          {fullyMatched ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  SUBCOMPONENTE: fila desktop
// ─────────────────────────────────────────

function EmpresaTableRow({ empresa, match, onToggle, onCreateRelacion }: EmpresaRowProps) {
  const { iA, iE, fullyMatched, partialIA, partialIE } = match;
  const showPartialA = partialIA && !iA;
  const showPartialE = partialIE && !iE;
  return (
    <tr className={`transition-colors ${fullyMatched ? 'bg-success-soft/50' : 'hover:bg-surface-subtle'}`}>
      <td className="px-6 py-4">
        <p className="font-bold text-sm text-text-main">{empresa.nombre}</p>
        <p className="text-[10px] text-text-muted">{empresa.ciudad}</p>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onToggle(empresa.id!, 'alumno')}
          className={`p-2 rounded-lg transition-all ${
            iA ? 'bg-primary text-white shadow-md shadow-primary/20 scale-110' :
            showPartialA ? 'bg-primary/30 text-primary border border-primary/40' :
            'text-text-muted hover:bg-surface-hover'
          }`}
        >
          {showPartialA ? <Minus className="h-5 w-5" /> : <Send className={`h-5 w-5 ${iA ? 'fill-current' : ''}`} />}
        </button>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onToggle(empresa.id!, 'empresa')}
          className={`p-2 rounded-lg transition-all ${
            iE ? 'bg-success text-white shadow-md shadow-success/20 scale-110' :
            showPartialE ? 'bg-success/30 text-success-strong border border-success/40' :
            'text-text-muted hover:bg-surface-hover'
          }`}
        >
          {showPartialE ? <Minus className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
        </button>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onCreateRelacion?.(empresa.id!)}
          disabled={!fullyMatched}
          className={`inline-flex h-8 w-8 rounded-full items-center justify-center transition-all ${
            fullyMatched
              ? 'bg-success-soft text-success-strong animate-bounce cursor-pointer hover:bg-success/15'
              : 'bg-surface-subtle text-text-muted cursor-not-allowed'
          }`}
          title={fullyMatched ? 'Crear relación con alumnos seleccionados' : 'Sin match completo'}
        >
          {fullyMatched ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────
//  HELPERS DE BATCH
// ─────────────────────────────────────────

function getBatchMatch(
  empresaId: number,
  selectedAlumnoIds: number[],
  selectedAlumno: Alumno | null,
  isMatched: (alId: number, emId: number) => MatchResult
): BatchMatchResult {
  const ids = selectedAlumnoIds.length > 0
    ? selectedAlumnoIds
    : (selectedAlumno?.id ? [selectedAlumno.id] : []);
  let countA = 0;
  let countE = 0;
  for (const id of ids) {
    const m = isMatched(id, empresaId);
    if (m.iA) countA++;
    if (m.iE) countE++;
  }
  const total = ids.length;
  return {
    iA: countA === total,
    iE: countE === total,
    fullyMatched: countA === total && countE === total,
    partialIA: countA > 0 && countA < total,
    partialIE: countE > 0 && countE < total,
  };
}

// ─────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

interface InteresesGridProps {
  selectedAlumno: Alumno | null;
  selectedAlumnoIds: number[];
  empresas: Empresa[];
  searchEmpresa: string;
  onSearchEmpresaChange: (v: string) => void;
  isMatched: (alId: number, emId: number) => MatchResult;
  onToggle: (empresaId: number, interesado: Interesado) => void;
  onCreateRelacion?: (empresaId: number) => void;
}

export function InteresesGrid({
  selectedAlumno, selectedAlumnoIds, empresas,
  searchEmpresa, onSearchEmpresaChange,
  isMatched, onToggle, onCreateRelacion,
}: InteresesGridProps) {

  if (!selectedAlumno && selectedAlumnoIds.length === 0) return <InteresesEmptyState />;

  const getMatch = (empresaId: number) =>
    getBatchMatch(empresaId, selectedAlumnoIds, selectedAlumno, isMatched);

  const handleToggle = (empresaId: number, interesado: Interesado) =>
    onToggle(empresaId, interesado);

  const emptySearch = (
    <div className="p-20 text-center">
      <Search className="h-12 w-12 mx-auto text-text-muted mb-4" />
      <p className="text-text-muted font-bold text-sm">No se encontraron empresas.</p>
    </div>
  );

  const leyenda = selectedAlumnoIds.length > 0 ? (
    <div className="flex gap-4">
      <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
        <Send className="h-3 w-3 text-primary" /> Envío de CV
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
        <Briefcase className="h-3 w-3 text-success" /> Empresa
      </div>
    </div>
  ) : (
    <div className="flex gap-4">
      <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
        <Send className="h-3 w-3 text-primary" /> Envío de CV del alumno
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
        <Briefcase className="h-3 w-3 text-success" /> Empresa
      </div>
    </div>
  );

  return (
    <>
      {/* Cabecera */}
      <div className="p-6 border-b border-border-base bg-surface-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {selectedAlumno ? (
            <>
              <h2 className="text-lg font-bold text-text-main leading-tight">
                {selectedAlumno.nombre} {selectedAlumno.apellidos}
              </h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">
                Interacción Alumno-Empresa
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text-main leading-tight">
                {selectedAlumnoIds.length} alumnos seleccionados
              </h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">
                Interacción masiva Alumno-Empresa
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col sm:items-end gap-3">
          {leyenda}
          {/* Buscador empresa */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar empresa por nombre o ciudad..."
              value={searchEmpresa}
              onChange={e => onSearchEmpresaChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border-base rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
            />
            {searchEmpresa && (
              <button
                onClick={() => onSearchEmpresaChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
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
                  match={getMatch(empresa.id!)}
                  onToggle={handleToggle}
                  onCreateRelacion={onCreateRelacion}
                />
              ))
            : emptySearch}
        </div>

        {/* Desktop */}
        <div className="hidden lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-base text-[10px] font-bold text-text-muted uppercase tracking-wider">
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
                  match={getMatch(empresa.id!)}
                  onToggle={handleToggle}
                  onCreateRelacion={onCreateRelacion}
                />
              ))}
            </tbody>
          </table>
          {empresas.length === 0 && emptySearch}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 bg-surface-subtle/50 text-center mt-auto">
        <p className="text-[10px] text-text-muted italic leading-relaxed">
          Las empresas marcadas en{' '}
          <span className="text-success-strong font-bold">verde</span>{' '}
          indican un "Match" (interés mutuo confirmado).
        </p>
      </div>
    </>
  );
}
