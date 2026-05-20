import React, { useState } from 'react';
import { Settings, ShieldCheck, Mail } from 'lucide-react';
import { useConfiguracion } from './hooks/useConfiguracion.ts';
import { TabGeneral } from './components/TabGeneral.tsx';
import { TabCorreo } from './components/TabCorreo.tsx';
import { TabSeguridad } from './components/TabSeguridad.tsx';

type TabId = 'general' | 'correo' | 'seguridad';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'correo', label: 'Correo', icon: Mail },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
];

export default function ConfiguracionView() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const ctx = useConfiguracion();

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
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
        />
      )}
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
