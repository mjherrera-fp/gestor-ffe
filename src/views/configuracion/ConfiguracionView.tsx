import React, {useEffect, useState} from 'react';
import {Cloud, FileText, Mail, Settings, ShieldCheck} from 'lucide-react';
import {useConfiguracion} from './hooks/useConfiguracion.ts';
import {TabGeneral} from './components/TabGeneral.tsx';
import {TabDocumentos} from './components/TabDocumentos.tsx';
import {TabCorreo} from './components/TabCorreo.tsx';
import {TabSeguridad} from './components/TabSeguridad.tsx';
import {TabCloud} from './components/TabCloud.tsx';
import type {RangoCurso} from '../../lib/calendarioFestivos.ts';

type TabId = 'general' | 'documentos' | 'correo' | 'seguridad' | 'cloud';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'correo', label: 'Correo', icon: Mail },
  {id: 'cloud', label: 'Cloud', icon: Cloud},
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
];

interface Props {
  initialTab?: TabId;
  /** Rango del curso actual, o `null` si no hay ninguno. */
  rangoCurso?: RangoCurso | null;
  onIrACursos?: () => void;
}

export default function ConfiguracionView({ initialTab, rangoCurso, onIrACursos }: Props = {}) {
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
      {activeTab === 'general' && <TabGeneral rangoCurso={rangoCurso} onIrACursos={onIrACursos} />}
      {activeTab === 'documentos' && <TabDocumentos />}
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
          isDecrypting={ctx.isDecrypting}
          newPassword={ctx.newPassword}
          confirmPassword={ctx.confirmPassword}
          message={ctx.message}
          showConfirmModal={ctx.showConfirmModal}
          showDecryptModal={ctx.showDecryptModal}
          onNewPasswordChange={ctx.setNewPassword}
          onConfirmPasswordChange={ctx.setConfirmPassword}
          onEncrypt={ctx.handleEncryptDatabase}
          onExecuteEncryption={ctx.executeEncryption}
          onCloseConfirmModal={() => ctx.setShowConfirmModal(false)}
          onDecrypt={() => ctx.setShowDecryptModal(true)}
          onExecuteDecryption={ctx.executeDecryption}
          onCloseDecryptModal={() => ctx.setShowDecryptModal(false)}
          biometricEnabled={ctx.biometricEnabled}
          biometricAvailable={ctx.biometricAvailable}
          biometricBusy={ctx.biometricBusy}
          biometricPassword={ctx.biometricPassword}
          biometricMessage={ctx.biometricMessage}
          showBiometricEnableModal={ctx.showBiometricEnableModal}
          showBiometricDisableModal={ctx.showBiometricDisableModal}
          onBiometricPasswordChange={ctx.setBiometricPassword}
          onRequestEnableBiometric={ctx.requestEnableBiometric}
          onCancelEnableBiometric={ctx.cancelEnableBiometric}
          onExecuteEnableBiometric={ctx.executeEnableBiometric}
          onRequestDisableBiometric={ctx.requestDisableBiometric}
          onCancelDisableBiometric={ctx.cancelDisableBiometric}
          onExecuteDisableBiometric={ctx.executeDisableBiometric}
        />
      )}
    </div>
  );
}
