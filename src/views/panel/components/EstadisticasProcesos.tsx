import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface Props {
  convenio: ChartData[];
  relacion: ChartData[];
  planFormativo: ChartData[];
  seguimiento: ChartData[];
  valoracion: ChartData[];
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48'];

function pieColor(name: string, index: number): string {
  if (name === 'Sin FFE') return '#94a3b8';
  return COLORS[index % COLORS.length];
}

function MiniPieChart({ data, title }: { data: ChartData[]; title: string }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">{title}</h5>
        <p className="text-slate-400 text-xs text-center py-8">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
      <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">{title}</h5>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={pieColor(entry.name, index)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {data.map((entry, index) => (
          <span key={entry.name} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: pieColor(entry.name, index) }}
            />
            {entry.name}: <strong className="text-slate-800">{entry.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function EstadisticasProcesos({ convenio, relacion, planFormativo, seguimiento, valoracion }: Props) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-900 mb-4">Distribución de estados por proceso</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MiniPieChart data={convenio} title="Convenio" />
        <MiniPieChart data={relacion} title="Relación" />
        <MiniPieChart data={planFormativo} title="Plan Formativo" />
        <MiniPieChart data={seguimiento} title="Seguimiento" />
        <MiniPieChart data={valoracion} title="Valoración" />
      </div>
    </div>
  );
}
