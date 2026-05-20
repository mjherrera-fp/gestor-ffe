import React from 'react';
import { Mail, Settings, Send, Loader2 } from 'lucide-react';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  send_delay_ms: number;
}

interface Props {
  emailConfig: EmailConfig;
  onChange: (config: EmailConfig) => void;
  saving: boolean;
  success: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  testing: boolean;
  testResult: { type: 'success' | 'error'; message: string } | null;
  onTest: () => void;
  profesorEmail: string;
}

export function TabCorreo({ emailConfig, onChange, saving, success, error, onSubmit, testing, testResult, onTest, profesorEmail }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...emailConfig,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Configuración de Correo</h3>
            <p className="text-sm text-slate-500">
              Credenciales necesarias para enviar notificaciones automáticas a alumnos y empresas.
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
            Configuración de correo guardada correctamente.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Servidor SMTP</label>
              <input type="text" name="smtp_host" value={emailConfig.smtp_host} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Puerto</label>
              <input type="number" name="smtp_port" value={emailConfig.smtp_port} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Usuario EducaMadrid</label>
              <input type="email" name="smtp_user" value={emailConfig.smtp_user} onChange={handleChange} placeholder="usuario@educamadrid.org" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <input type="password" name="smtp_pass" value={emailConfig.smtp_pass} onChange={handleChange} placeholder="••••••••" className={inputClass} />
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="smtp_secure" name="smtp_secure" checked={emailConfig.smtp_secure} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
            <label htmlFor="smtp_secure" className="ml-2 text-sm text-slate-600">
              Usar conexión segura SSL/TLS (Puerto 465). Dejar desmarcado para STARTTLS (Puerto 587).
            </label>
          </div>

          {/* Delay entre envíos */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Envío masivo</h4>
            <div className="max-w-xs">
              <label className={labelClass}>Delay entre envíos (ms)</label>
              <input
                type="number"
                name="send_delay_ms"
                value={emailConfig.send_delay_ms}
                onChange={handleChange}
                className={inputClass}
                min={0}
                step={100}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tiempo de espera entre cada correo en envíos masivos. Valor recomendado: 1500ms (1.5 segundos).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-800 disabled:opacity-50 transition-colors">
              <span className="flex items-center justify-center gap-2">
                <Settings className="h-5 w-5" />
                {saving ? 'Guardando...' : 'Guardar Configuración de Correo'}
              </span>
            </button>

            <button type="button" onClick={onTest} disabled={testing || !profesorEmail} className="px-6 py-2.5 bg-white text-sky-600 border border-sky-200 text-sm font-semibold rounded-xl hover:bg-sky-50 disabled:opacity-50 transition-colors">
              <span className="flex items-center justify-center gap-2">
                {testing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {testing ? 'Enviando...' : 'Probar Configuración'}
              </span>
            </button>
          </div>
        </form>

        {testResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm border flex items-center gap-2 ${
            testResult.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
