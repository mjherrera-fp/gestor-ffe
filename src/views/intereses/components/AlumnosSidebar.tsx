import React from 'react';
import { GraduationCap, Search, X } from 'lucide-react';
import { Alumno } from '../../../types/index.ts';

interface AlumnosSidebarProps {
  alumnos: Alumno[];
  selectedAlumno: Alumno | null;
  searchAlumno: string;
  onSearchChange: (v: string) => void;
  onSelectAlumno: (a: Alumno) => void;
  getAlumnoStats: (id: number) => { envios: number; solicitudes: number };
}

export function AlumnosSidebar({
  alumnos, selectedAlumno,
  searchAlumno, onSearchChange,
  onSelectAlumno, getAlumnoStats,
}: AlumnosSidebarProps) {
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
      </div>

      {/* Lista */}
      <div className="lg:overflow-y-auto divide-y divide-border-base max-h-75 lg:max-h-full">
        {alumnos.map(al => {
          const { envios, solicitudes } = getAlumnoStats(al.id!);
          return (
            <div
              key={al.id}
              onClick={() => onSelectAlumno(al)}
              className={`p-5 cursor-pointer transition-colors ${
                selectedAlumno?.id === al.id ? 'bg-primary-light' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="font-bold text-sm text-text-main leading-tight">
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
