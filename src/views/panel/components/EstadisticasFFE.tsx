import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  conFFE: number;
  sinFFE: number;
}

const COLORS = ['#3b82f6', '#94a3b8'];

export function EstadisticasFFE({ conFFE, sinFFE }: Props) {
  const data = [
    { name: 'Con FFE', value: conFFE },
    { name: 'Sin FFE', value: sinFFE },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h4 className="text-sm font-bold text-slate-900 mb-4">Alumnos con/sin FFE</h4>
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
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          />
          <Legend
            formatter={(value, entry: any) => (
              <span className="text-xs font-medium text-slate-600">
                {value}: <strong>{entry.payload?.value}</strong>
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
