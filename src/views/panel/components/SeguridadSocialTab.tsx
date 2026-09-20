import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SeguridadSocialData } from '../../../types/index.ts';
import { SeguridadSocialTable } from './SeguridadSocialTable.tsx';

interface Ctx {
  ssData: SeguridadSocialData | null;
}

type FilterType = 'todos' | 'conFFE' | 'iniciadas';

function alumnoTieneFFE(alumnoId: number, datos: Record<string, number>): boolean {
  return Object.entries(datos).some(([key, val]) => key.startsWith(`${alumnoId}_`) && val > 0);
}

export function SeguridadSocialTab({ ctx }: { ctx: Ctx }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');

  if (!ctx.ssData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted font-medium">No hay datos de seguridad social</p>
      </div>
    );
  }

  if (ctx.ssData.meses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted font-medium">No hay alumnos con prácticas en este curso</p>
      </div>
    );
  }

  const filteredAlumnos = useMemo(() => {
    let result = ctx.ssData!.alumnos;

    if (filterType === 'conFFE') {
      result = result.filter(a => alumnoTieneFFE(a.id, ctx.ssData!.datos));
    } else if (filterType === 'iniciadas') {
      result = result.filter(a => a.fechaInicio !== null);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.nombre.toLowerCase().includes(term) ||
        a.apellidos.toLowerCase().includes(term)
      );
    }

    return result;
  }, [ctx.ssData, searchTerm, filterType]);

  const filteredDatos = useMemo(() => {
    const ids = new Set(filteredAlumnos.map(a => a.id));
    return Object.fromEntries(
      Object.entries(ctx.ssData!.datos).filter(([key]) => {
        const alumnoId = Number(key.split('_')[0]);
        return ids.has(alumnoId);
      })
    );
  }, [ctx.ssData, filteredAlumnos]);

  const filteredData: SeguridadSocialData = {
    meses: ctx.ssData.meses,
    alumnos: filteredAlumnos,
    datos: filteredDatos,
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-text-main">Seguridad Social</h3>
        <p className="text-xs text-text-muted mt-1">
          Días trabajados por alumno en cada mes del período de prácticas.
        </p>
        <ul className="text-xs text-text-muted mt-1 checklist list-emerald-600 pl-5">
          <li>Sólo se contabilizan los días según lo establecido en la relación de alumnos.</li>
          <li>Se contabilizarán o no los días festivos según la configuración establecida.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar alumno..."
            className="pl-9 pr-4 py-2 text-sm bg-surface-card border border-border-base rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-hover p-0.5 rounded-lg">
          {([
            { id: 'todos' as FilterType, label: 'Todos' },
            { id: 'conFFE' as FilterType, label: 'Con FFE' },
            { id: 'iniciadas' as FilterType, label: 'Iniciadas' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === opt.id
                  ? 'bg-surface-card text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-text-muted font-medium">
          {filteredAlumnos.length} alumno{filteredAlumnos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <SeguridadSocialTable data={filteredData} />
    </div>
  );
}
