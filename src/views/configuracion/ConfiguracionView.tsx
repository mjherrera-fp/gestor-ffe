import React, {useEffect, useState} from 'react';
import {Cloud, Mail, Settings, ShieldCheck} from 'lucide-react';
import {useConfiguracion} from './hooks/useConfiguracion.ts';
import {TabGeneral} from './components/TabGeneral.tsx';
import {TabCorreo} from './components/TabCorreo.tsx';
import {TabSeguridad} from './components/TabSeguridad.tsx';
import {TabCloud} from './components/TabCloud.tsx';

type TabId = 'general' | 'correo' | 'seguridad' | 'cloud';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'correo', label: 'Correo', icon: Mail },
  {id: 'cloud', label: 'Cloud', icon: Cloud},
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
];

interface Props {
  initialTab?: TabId;
}

export default function ConfiguracionView({ initialTab }: Props = {}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'general');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const ctx = useConfiguracion();

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-hover p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-surface-card text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {activeTab === 'general' && <TabGeneral />}
      {activeTab === 'correo' && (
        <TabCorreo
          emailConfig={ctx.emailConfig}
          onChange={ctx.setEmailConfig}
          saving={ctx.savingEmail}
          success={ctx.successEmail}
          error={ctx.errorEmail}
          onSubmit={ctx.handleSaveEmailConfig}
          testing={ctx.testingEmail}
          testResult={ctx.testEmailResult}
          onTest={ctx.handleTestEmail}
          profesorEmail={ctx.profesorEmail}
          profesorNombre={ctx.profesorNombre}
          profesorApellidos={ctx.profesorApellidos}
        />
      )}
      {activeTab === 'cloud' && <TabCloud/>}
      {activeTab === 'seguridad' && (
        <TabSeguridad
          isEncrypted={ctx.isEncrypted}
          isEncrypting={ctx.isEncrypting}
          newPassword={ctx.newPassword}
          confirmPassword={ctx.confirmPassword}
          message={ctx.message}
          showConfirmModal={ctx.showConfirmModal}
          onNewPasswordChange={ctx.setNewPassword}
          onConfirmPasswordChange={ctx.setConfirmPassword}
          onEncrypt={ctx.handleEncryptDatabase}
          onExecuteEncryption={ctx.executeEncryption}
          onCloseConfirmModal={() => ctx.setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
