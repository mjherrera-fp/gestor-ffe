import React, { useState } from 'react';
import { Mail, Settings, Send, Loader2, Eye, EyeOff, Trash2, Square, CheckSquare } from 'lucide-react';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_email: string;
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
  profesorNombre: string;
  profesorApellidos: string;
}

export function TabCorreo({ emailConfig, onChange, saving, success, error, onSubmit, testing, testResult, onTest, profesorEmail, profesorNombre, profesorApellidos }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  const handleDelete = () => {
    onChange({
      ...emailConfig,
      smtp_user: '',
      smtp_pass: '',
      smtp_email: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value);
    const updated = {
      ...emailConfig,
      [name]: newValue,
    };
    if (name === 'smtp_user' && typeof newValue === 'string') {
      updated.smtp_email = newValue ? `${newValue}@educa.madrid.org` : '';
    }
    onChange(updated);
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
              <input type="text" name="smtp_user" value={emailConfig.smtp_user} onChange={handleChange} placeholder="usuario de educamadrid sin el @educa.madrid.org" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="smtp_pass"
                  value={emailConfig.smtp_pass}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <input type="hidden" name="smtp_email" value={emailConfig.smtp_email} />
          {emailConfig.smtp_user ? (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">El FROM de los correos será:</p>
              <p className="text-sm font-semibold text-slate-800">
                {profesorNombre && profesorApellidos ? `${profesorNombre} ${profesorApellidos}` : 'Nombre Apellidos'} &lt;{emailConfig.smtp_email}&gt;
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">Es necesario configurar el usuario de EducaMadrid</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange({ ...emailConfig, smtp_secure: !emailConfig.smtp_secure })}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
          >
            {emailConfig.smtp_secure ? (
              <CheckSquare className="h-5 w-5 text-blue-500 shrink-0" />
            ) : (
              <Square className="h-5 w-5 text-slate-400 shrink-0" />
            )}
            <span className="text-sm text-slate-700">
              Usar conexión segura SSL/TLS (Puerto 465). Dejar desmarcado para STARTTLS (Puerto 587).
            </span>
          </button>

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
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {testing ? 'Enviando...' : 'Probar Configuración'}
              </span>
            </button>

            <button type="button" onClick={handleDelete} className="px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-auto">
              <span className="flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" />
                Eliminar
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
