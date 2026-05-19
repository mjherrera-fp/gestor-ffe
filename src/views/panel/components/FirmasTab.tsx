import React from 'react';
import { Printer } from 'lucide-react';
import { FirmaTipoLabels, FirmaTipo } from '../../../types/index.ts';

interface Ctx {
  resumen: any[];
}

function Badge({ valor }: { valor?: string }) {
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
      valor === FirmaTipo.DIGITAL
        ? 'bg-blue-50 text-blue-600 border-blue-200'
        : valor === FirmaTipo.MANUAL
        ? 'bg-amber-50 text-amber-600 border-amber-200'
        : 'bg-slate-50 text-slate-400 border-slate-200'
    }`}>
      {valor && valor !== FirmaTipo.SIN_ASIGNAR ? FirmaTipoLabels[valor as FirmaTipo] : '—'}
    </span>
  );
}

export function FirmasTab({ ctx }: { ctx: Ctx }) {
  const rows = ctx.resumen.filter((r: any) => r.relacionId);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 font-medium">No hay relaciones con alumnos para mostrar firmas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1.5cm; }
          body * { visibility: hidden; }
          #firmas-print-area, #firmas-print-area * { visibility: visible; }
          #firmas-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          #firmas-print-area table { font-size: 9px !important; width: 100% !important; }
          #firmas-print-area th, #firmas-print-area td { padding: 5px 6px !important; }
          #firmas-print-area .badge { font-size: 7px !important; padding: 1px 4px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Tipo de Firma por Documento</h3>
          <p className="text-xs text-slate-500 mt-1">
            Indica si cada documento requiere firma digital o manual para cada alumno.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir PDF
        </button>
      </div>

      <div id="firmas-print-area" className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alumno</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Convenio</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Relación</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan Formativo</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seguimiento</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valoración</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.alumnoId || i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">
                  {r.apellidos}, {r.nombre}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {r.empresaNombre || '—'}
                </td>
                <td className="px-4 py-3 text-center"><Badge valor={r.tipoFirmaConvenio} /></td>
                <td className="px-4 py-3 text-center"><Badge valor={r.firmaRelacion} /></td>
                <td className="px-4 py-3 text-center"><Badge valor={r.firmaPlanFormativo} /></td>
                <td className="px-4 py-3 text-center"><Badge valor={r.firmaSeguimiento} /></td>
                <td className="px-4 py-3 text-center"><Badge valor={r.firmaValoracion} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
