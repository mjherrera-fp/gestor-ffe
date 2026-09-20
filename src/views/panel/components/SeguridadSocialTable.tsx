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
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-subtle">
              <th className="px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider text-left sticky left-0 bg-surface-subtle z-20 min-w-40">
                Alumno
              </th>
              <th className="px-3 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider text-center min-w-22.5">
                F. Inicio
              </th>
              <th className="px-3 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider text-center min-w-22.5">
                F. Fin
              </th>
              {data.meses.map(mes => (
                <th
                  key={mes}
                  className={`px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-center min-w-15 transition-colors ${
                    selectedMes === mes
                      ? 'text-primary bg-primary-light'
                      : 'text-text-muted bg-surface-subtle'
                  }`}
                >
                  {formatMesLabel(mes)}
                </th>
              ))}
              <th className="px-3 py-3 text-[11px] font-bold text-text-main uppercase tracking-wider text-center min-w-15 bg-surface-hover">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-base">
            {data.alumnos.map(alumno => (
              <tr
                key={alumno.id}
                className={`cursor-pointer transition-colors ${
                  rowSelected(alumno.id)
                    ? 'bg-primary-light'
                    : 'hover:bg-surface-subtle/50'
                }`}
              >
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className={`px-4 py-2.5 font-semibold whitespace-nowrap sticky left-0 z-10 transition-colors ${
                    rowSelected(alumno.id)
                      ? 'text-primary bg-primary-light'
                      : 'text-text-main bg-surface-card'
                  }`}
                >
                  {alumno.apellidos}, {alumno.nombre}
                </td>
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className="px-3 py-2.5 text-center text-xs text-text-muted whitespace-nowrap"
                >
                  {formatDate(alumno.fechaInicio) || '—'}
                </td>
                <td
                  onClick={() => handleRowClick(alumno.id)}
                  className="px-3 py-2.5 text-center text-xs text-text-muted whitespace-nowrap"
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
                          ? 'text-primary bg-primary-light'
                          : isMesSelected
                          ? 'text-primary bg-primary-light'
                          : isRowSel
                          ? 'text-text-main'
                          : dias > 0
                          ? 'text-success-strong bg-success-soft/30'
                          : 'text-text-muted'
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
                      ? 'text-primary bg-primary-light'
                      : 'text-text-main bg-surface-subtle/50'
                  }`}
                >
                  {totalesPorAlumno[alumno.id] || '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-hover font-semibold">
              <td className="px-4 py-3 text-[11px] font-bold text-text-main uppercase tracking-wider sticky left-0 bg-surface-hover z-10">
                Total
              </td>
              <td colSpan={2} className="px-3 py-3 text-center text-xs text-text-muted">
                —
              </td>
              {data.meses.map(mes => (
                <td
                  key={mes}
                  className={`px-3 py-3 text-center text-sm font-bold transition-colors ${
                    selectedMes === mes
                      ? 'text-primary bg-primary-light'
                      : 'text-text-main'
                  }`}
                >
                  {totalesPorMes[mes] || 0}
                </td>
              ))}
              <td className="px-3 py-3 text-center text-sm font-bold text-primary bg-primary-light">
                {granTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
