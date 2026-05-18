import React from 'react';

import { useIntereses }        from './hooks/useIntereses.ts';
import { AlumnosSidebar }      from './components/AlumnosSidebar.tsx';
import { InteresesGrid }       from './components/InteresesGrid.tsx';

interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
}

export default function InteresesView({ cursoId, detalleAcademicoId }: Props) {
  const ctx = useIntereses(cursoId, detalleAcademicoId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

      {/* ── COLUMNA IZQUIERDA: Alumnos ── */}
      <AlumnosSidebar
        alumnos={ctx.filteredAlumnos}
        selectedAlumno={ctx.selectedAlumno}
        searchAlumno={ctx.searchAlumno}
        onSearchChange={ctx.setSearchAlumno}
        onSelectAlumno={ctx.setSelectedAlumno}
        getAlumnoStats={ctx.getAlumnoStats}
      />

      {/* ── COLUMNA DERECHA: Grid de intereses ── */}
      <div className="w-full flex-1 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden">
        <InteresesGrid
          selectedAlumno={ctx.selectedAlumno}
          empresas={ctx.filteredEmpresas}
          searchEmpresa={ctx.searchEmpresa}
          onSearchEmpresaChange={ctx.setSearchEmpresa}
          isMatched={ctx.isMatched}
          onToggle={ctx.toggleInteres}
        />
      </div>
    </div>
  );
}
