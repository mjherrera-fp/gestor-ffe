import React, { useState } from 'react';
import { BarChart3, Users, TrendingUp, Star, Award } from 'lucide-react';
import { Empresa, EmpresaEstadistica } from '../../../types/index.ts';

interface EmpresaEstadisticasPanelProps {
  selectedEmpresa: Empresa | null;
  estadisticas: EmpresaEstadistica[];
}

export function EmpresaEstadisticasPanel({
  selectedEmpresa, estadisticas,
}: EmpresaEstadisticasPanelProps) {

  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);

  if (!selectedEmpresa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="bg-slate-50 p-6 rounded-full mb-4">
          <BarChart3 className="h-12 w-12 text-slate-200" />
        </div>
        <h3 className="text-base font-bold text-text-main mb-2">Selecciona una empresa</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Haz clic en una empresa para ver sus estadísticas globales.
        </p>
      </div>
    );
  }

  const cursos = [...new Set(estadisticas.map(e => e.curso))].sort((a, b) => {
    const yearB = parseInt(b.split('/')[0]);
    const yearA = parseInt(a.split('/')[0]);
    return yearB - yearA;
  });

  const stats = selectedCurso
    ? estadisticas.filter(e => e.curso === selectedCurso)
    : estadisticas;

  const numCursos = selectedCurso ? 1 : estadisticas.length;
  const totalAlumnos = stats.reduce((s, e) => s + e.numAlumnos, 0);
  const totalContratados = stats.reduce((s, e) => s + e.contratados, 0);
  const valoraciones = stats.filter(e => e.valoracion != null && e.valoracion > 0);
  const mediaValoracion = valoraciones.length > 0
    ? valoraciones.reduce((s, e) => s + e.valoracion!, 0) / valoraciones.length
    : 0;
  const mediaAlumnos = numCursos > 0 ? Math.round(totalAlumnos / numCursos) : 0;
  const mediaContratados = numCursos > 0 ? Math.round(totalContratados / numCursos) : 0;

  const contratacionPct = totalAlumnos > 0 ? Math.round((totalContratados / totalAlumnos) * 100) : 0;

  const statCard = (icon: React.ReactNode, label: string, total: string | number, media?: string | number) => (
    <div className="p-4 bg-white border border-border-base rounded-xl shadow-sm space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-text-main">{total}</div>
      {media !== undefined && (
        <div className="text-[11px] text-text-muted font-medium">
          Media por curso: <span className="font-bold text-primary">{media}</span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="p-6 border-b border-border-base space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-main leading-tight">Estadísticas</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">
              <span className="font-black">{selectedEmpresa.nombre}</span>
              {!selectedCurso && numCursos > 0 && (
                <span> &middot; {numCursos} {numCursos === 1 ? 'curso' : 'cursos'}</span>
              )}
            </p>
          </div>
        </div>

        {cursos.length > 0 && (
          <select
            className="w-full text-xs bg-white border border-border-base rounded-lg px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={selectedCurso ?? ''}
            onChange={e => setSelectedCurso(e.target.value || null)}
          >
            <option value="">Todos los cursos</option>
            {cursos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="p-6 space-y-4">
        {stats.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {statCard(
              <Award className="h-3.5 w-3.5 text-purple-500" />,
              'Participaciones',
              selectedCurso ? '1 curso' : `${numCursos} ${numCursos === 1 ? 'curso' : 'cursos'}`
            )}
            {statCard(
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />,
              'Valoración Media',
              valoraciones.length > 0 ? mediaValoracion.toFixed(1) : '—',
              valoraciones.length > 0 ? `${valoraciones.length} valoraciones` : undefined
            )}
            {statCard(
              <Users className="h-3.5 w-3.5 text-blue-500" />,
              'Alumnos Acogidos',
              totalAlumnos,
              numCursos > 1 ? mediaAlumnos : undefined
            )}
            {statCard(
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
              'Contrataciones tras FFE',
              `${totalContratados} (${contratacionPct}%)`,
              numCursos > 1 ? mediaContratados : undefined
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-text-muted font-medium">
              {selectedCurso
                ? 'No hay datos para el curso seleccionado.'
                : 'Esta empresa aún no tiene relaciones activas.'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Las estadísticas se generarán automáticamente al crear una relación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
