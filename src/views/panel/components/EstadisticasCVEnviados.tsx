import React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CVPorAlumno } from '../../../lib/estadisticasIntereses.ts';

interface Props {
  datos: CVPorAlumno[];
  total: number;
  media: number;
}

/**
 * CV enviados por cada alumno (pantalla de Intereses). Barras horizontales y
 * ordenadas de mas a menos: con un grupo entero los nombres se leen mejor en
 * vertical que inclinados bajo el eje, y se ve de un vistazo quien va por
 * delante y quien no ha enviado ninguno.
 */
export function EstadisticasCVEnviados({ datos, total, media }: Props) {
  const cabecera = (
    <div className="flex items-baseline justify-between gap-3 mb-4">
      <h4 className="text-sm font-bold text-text-main">CV enviados por alumno</h4>
      {datos.length > 0 && (
        <span className="text-[11px] text-text-muted font-medium whitespace-nowrap">
          Total <strong className="text-text-main">{total}</strong> · Media <strong className="text-text-main">{media.toLocaleString('es-ES')}</strong>
        </span>
      )}
    </div>
  );

  if (datos.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-border-base shadow-sm p-6">
        {cabecera}
        <p className="text-text-muted text-sm">Sin datos</p>
      </div>
    );
  }

  // Alto proporcional al numero de alumnos, para que no se apelotonen.
  const alto = Math.max(200, datos.length * 26 + 40);

  return (
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm p-6">
      {cabecera}
      <ResponsiveContainer width="100%" height={alto}>
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-base)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          />
          <YAxis
            type="category"
            dataKey="alumno"
            width={120}
            interval={0}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          />
          <Tooltip
            formatter={(v: number) => [v, 'CV enviados']}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--color-border-base)',
              fontSize: '12px',
              background: 'var(--color-surface-card)',
              color: 'var(--color-text-main)',
            }}
          />
          <Bar dataKey="envios" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={16}>
            <LabelList dataKey="envios" position="right" style={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
