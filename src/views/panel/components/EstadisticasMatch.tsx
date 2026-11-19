import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  conMatch: number;
  sinMatch: number;
  nombres: string[];
}

const COLORS = ['var(--color-success)', '#94a3b8'];

/**
 * Alumnos con match en Intereses: han enviado el CV a una empresa y esa misma
 * empresa los ha solicitado. Es una proporcion de un total, como "con/sin
 * FFE", asi que va en el mismo donut; debajo, quienes son.
 */
export function EstadisticasMatch({ conMatch, sinMatch, nombres }: Props) {
  const data = [
    { name: 'Con match', value: conMatch },
    { name: 'Sin match', value: sinMatch },
  ];
  const total = conMatch + sinMatch;

  return (
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm p-6">
      <h4 className="text-sm font-bold text-text-main mb-4">Alumnos con match en Intereses</h4>
      {total === 0 ? (
        <p className="text-text-muted text-sm">Sin datos</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-border-base)',
                  fontSize: '12px',
                  background: 'var(--color-surface-card)',
                  color: 'var(--color-text-main)',
                }}
              />
              <Legend
                formatter={(value, entry: any) => (
                  <span className="text-xs font-medium text-text-muted">
                    {value}: <strong>{entry.payload?.value}</strong>
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-border-base">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Con match ({conMatch} de {total})
            </p>
            {nombres.length === 0 ? (
              <p className="text-sm text-text-muted italic">Ningún alumno tiene match todavía.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {nombres.map(n => (
                  <li key={n} className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-soft text-success-strong border border-success/20">
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
