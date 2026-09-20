import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  conFFE: number;
  sinFFE: number;
}

const COLORS = ['var(--color-primary)', '#94a3b8'];

export function EstadisticasFFE({ conFFE, sinFFE }: Props) {
  const data = [
    { name: 'Con FFE', value: conFFE },
    { name: 'Sin FFE', value: sinFFE },
  ];

  return (
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm p-6">
      <h4 className="text-sm font-bold text-text-main mb-4">Alumnos con/sin FFE</h4>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
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
    </div>
  );
}
