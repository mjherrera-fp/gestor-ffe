import React, { useState } from 'react';
import { usePanel } from './hooks/usePanel.ts';
import { ResumenTab } from './components/ResumenTab.tsx';
import { EstadisticasTab } from './components/EstadisticasTab.tsx';
import { SeguridadSocialTab } from './components/SeguridadSocialTab.tsx';
import { FirmasTab } from './components/FirmasTab.tsx';

const tabs = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'seguridad-social', label: 'Seguridad Social' },
  { id: 'firmas', label: 'Firmas' },
];

interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
}

export default function PanelView({ cursoId, detalleAcademicoId }: Props) {
  const ctx = usePanel(cursoId, detalleAcademicoId);
  const [activeTab, setActiveTab] = useState('resumen');

  if (ctx.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (ctx.error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No se ha podido cargar el panel</h3>
          <p className="text-sm text-slate-500 mb-6">{ctx.error}</p>
          <p className="text-xs text-slate-400 mb-6">Asegúrate de tener alumnos y relaciones creadas en el curso activo.</p>
          <button
            onClick={() => ctx.refresh()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!ctx.loading && ctx.resumenTotal.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-5">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No hay datos en el panel</h3>
          <p className="text-sm text-slate-500">
            Aún no hay alumnos con relaciones en el curso activo.
            <br />
            Crea alumnos y asígnales relaciones desde las secciones correspondientes.
          </p>
        </div>
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
      {activeTab === 'firmas' && <FirmasTab ctx={ctx} />}
    </div>
  );
}
