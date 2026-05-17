import React from 'react';
import { EstadisticasEmpresas } from './EstadisticasEmpresas.tsx';
import { EstadisticasFFE } from './EstadisticasFFE.tsx';
import { EstadisticasProcesos } from './EstadisticasProcesos.tsx';

interface Ctx {
  empresasConAlumnos: { nombre: string; alumnos: number }[];
  statsFFE: { conFFE: number; sinFFE: number };
  distribucionConvenio: { name: string; value: number }[];
  distribucionRelacion: { name: string; value: number }[];
  distribucionPlanFormativo: { name: string; value: number }[];
  distribucionSeguimiento: { name: string; value: number }[];
  distribucionValoracion: { name: string; value: number }[];
}

export function EstadisticasTab({ ctx }: { ctx: Ctx }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EstadisticasEmpresas data={ctx.empresasConAlumnos} />
        <EstadisticasFFE conFFE={ctx.statsFFE.conFFE} sinFFE={ctx.statsFFE.sinFFE} />
      </div>

      <EstadisticasProcesos
        convenio={ctx.distribucionConvenio}
        relacion={ctx.distribucionRelacion}
        planFormativo={ctx.distribucionPlanFormativo}
        seguimiento={ctx.distribucionSeguimiento}
        valoracion={ctx.distribucionValoracion}
      />
    </div>
  );
}
