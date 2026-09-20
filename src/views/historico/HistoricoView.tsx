import { useState } from 'react';
import { Mail, FileText, ArrowLeftRight, Repeat, History } from 'lucide-react';
import TabComunicaciones from './components/TabComunicaciones.tsx';
import TabOperacionesConvenio from './components/TabOperacionesConvenio.tsx';
import TabOperacionesRelacion from './components/TabOperacionesRelacion.tsx';
import TabCambiosEstado from './components/TabCambiosEstado.tsx';

type TabId = 'comunicaciones' | 'convenios' | 'relaciones' | 'estados';

const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'comunicaciones', label: 'Comunicaciones', icon: Mail },
  { id: 'convenios', label: 'Convenios', icon: FileText },
  { id: 'relaciones', label: 'Relaciones', icon: ArrowLeftRight },
  { id: 'estados', label: 'Cambios de Estado', icon: Repeat },
];

export default function HistoricoView() {
  const [activeTab, setActiveTab] = useState<TabId>('comunicaciones');

  return (
    <div className="flex flex-col h-full bg-bg-base">
      <div className="bg-surface-card border-b border-border-base px-6 lg:px-8">
        <div className="flex items-center gap-3 py-5">
          <History className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-black text-text-main">Histórico de operaciones</h2>
        </div>

        <div className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  isActive
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-text-muted border-transparent hover:text-text-main hover:border-border-base'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {activeTab === 'comunicaciones' && <TabComunicaciones />}
        {activeTab === 'convenios' && <TabOperacionesConvenio />}
        {activeTab === 'relaciones' && <TabOperacionesRelacion />}
        {activeTab === 'estados' && <TabCambiosEstado />}
      </div>
    </div>
  );
}
