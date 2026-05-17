import React, { useState } from 'react';
import { usePanel } from './hooks/usePanel.ts';
import { ResumenTab } from './components/ResumenTab.tsx';
import { EstadisticasTab } from './components/EstadisticasTab.tsx';
import { SeguridadSocialTab } from './components/SeguridadSocialTab.tsx';

const tabs = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'seguridad-social', label: 'Seguridad Social' },
];

interface Props {
  cursoId: number;
}

export default function PanelView({ cursoId }: Props) {
  const [activeTab, setActiveTab] = useState('resumen');
  const ctx = usePanel(cursoId);

  if (ctx.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (ctx.error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 font-semibold">{ctx.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' && <ResumenTab ctx={ctx} />}
      {activeTab === 'estadisticas' && <EstadisticasTab ctx={ctx} />}
      {activeTab === 'seguridad-social' && <SeguridadSocialTab ctx={ctx} />}
    </div>
  );
}
