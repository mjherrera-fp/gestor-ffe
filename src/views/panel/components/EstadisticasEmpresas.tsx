import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  data: { nombre: string; alumnos: number }[];
}

export function EstadisticasEmpresas({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-border-base shadow-sm p-6">
        <h4 className="text-sm font-bold text-text-main mb-4">Empresas con alumnos</h4>
        <p className="text-text-muted text-sm">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border-base shadow-sm p-6">
      <h4 className="text-sm font-bold text-text-main mb-4">Empresas con alumnos</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-base)" />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--color-border-base)',
              fontSize: '12px',
              background: 'var(--color-surface-card)',
              color: 'var(--color-text-main)',
            }}
          />
          <Bar dataKey="alumnos" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
