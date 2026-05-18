import React, { useState } from 'react';
import { SeguridadSocialData } from '../../../types/index.ts';
import { formatDate } from '../../../lib/dateUtils.ts';

interface Props {
  data: SeguridadSocialData;
}

const MES_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

function formatMesLabel(mesKey: string): string {
  const [, month] = mesKey.split('-');
  return MES_LABELS[month] || month;
}

export function SeguridadSocialTable({ data }: Props) {
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [selectedMes, setSelectedMes] = useState<string | null>(null);

  const totalesPorMes: Record<string, number> = {};
  const totalesPorAlumno: Record<number, number> = {};
  let granTotal = 0;

  for (const alumno of data.alumnos) {
    let suma = 0;
    for (const mes of data.meses) {
      const key = `${alumno.id}_${mes}`;
      const dias = data.datos[key] || 0;
      suma += dias;
      totalesPorMes[mes] = (totalesPorMes[mes] || 0) + dias;
    }
    totalesPorAlumno[alumno.id] = suma;
    granTotal += suma;
  }

  const handleRowClick = (alumnoId: number) => {
    if (selectedRowId === alumnoId) {
      setSelectedRowId(null);
      setSelectedMes(null);
    } else {
      setSelectedRowId(alumnoId);
      setSelectedMes(null);
    }
  };

  const handleMonthCellClick = (alumnoId: number, mesKey: string) => {
    if (selectedRowId === alumnoId && selectedMes === mesKey) {
      setSelectedRowId(null);
      setSelectedMes(null);
    } else {
      setSelectedRowId(alumnoId);
      setSelectedMes(mesKey);
    }
  };

  const rowSelected = (id: number) => selectedRowId === id;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-0 bg-slate-50 z-20 min-w-40">
                Alumno
              </th>
              <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center min-w-22.5">
                F. Inicio
              </th>
              <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center min-w-22.5">
                F. Fin
              </th>
              {data.meses.map(mes => (
                <th
                  key={mes}
                  className={`px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-center min-w-15 transition-colors ${
                    selectedMes === mes
                      ? 'text-blue-700 bg-blue-100'
                      : 'text-slate-500 bg-slate-50'
                  }`}
                >
                  {formatMesLabel(mes)}
                </th>
              ))}
              <th className="px-3 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center min-w-15 bg-slate-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.alumnos.map(alumno => (
              <tr
                key={alumno.id}
                className={`cursor-pointer transition-colors ${
                  rowSelected(alumno.id)
                    ? 'bg-blue-50'
                    : 'hover:bg-slate-50/50'
                }`}
              >
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className={`px-4 py-2.5 font-semibold whitespace-nowrap sticky left-0 z-10 transition-colors ${
                    rowSelected(alumno.id)
                      ? 'text-blue-900 bg-blue-50'
                      : 'text-slate-900 bg-white'
                  }`}
                >
                  {alumno.apellidos}, {alumno.nombre}
                </td>
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className="px-3 py-2.5 text-center text-xs text-slate-600 whitespace-nowrap"
                >
                  {formatDate(alumno.fechaInicio) || '—'}
                </td>
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className="px-3 py-2.5 text-center text-xs text-slate-600 whitespace-nowrap"
                >
                  {formatDate(alumno.fechaFin) || '—'}
                </td>
                {data.meses.map(mes => {
                  const key = `${alumno.id}_${mes}`;
                  const dias = data.datos[key] || 0;
                  const isMesSelected = selectedMes === mes;
                  const isRowSel = rowSelected(alumno.id);
                  return (
                    <td
                      key={key}
                      onClick={() => handleMonthCellClick(alumno.id, mes)}
                      className={`px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                        isMesSelected && isRowSel
                          ? 'text-blue-800 bg-blue-200'
                          : isMesSelected
                          ? 'text-blue-700 bg-blue-100'
                          : isRowSel
                          ? 'text-slate-500'
                          : dias > 0
                          ? 'text-emerald-700 bg-emerald-50/30'
                          : 'text-slate-300'
                      }`}
                    >
                      {dias > 0 ? dias : '—'}
                    </td>
                  );
                })}
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className={`px-3 py-2.5 text-center text-sm font-bold transition-colors ${
                    rowSelected(alumno.id)
                      ? 'text-blue-800 bg-blue-100'
                      : 'text-slate-800 bg-slate-50/50'
                  }`}
                >
                  {totalesPorAlumno[alumno.id] || '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold">
              <td className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100 z-10">
                Total
              </td>
              <td colSpan={2} className="px-3 py-3 text-center text-xs text-slate-400">
                —
              </td>
              {data.meses.map(mes => (
                <td
                  key={mes}
                  className={`px-3 py-3 text-center text-sm font-bold transition-colors ${
                    selectedMes === mes
                      ? 'text-blue-800 bg-blue-200'
                      : 'text-slate-700'
                  }`}
                >
                  {totalesPorMes[mes] || 0}
                </td>
              ))}
              <td className="px-3 py-3 text-center text-sm font-bold text-blue-700 bg-blue-50">
                {granTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
