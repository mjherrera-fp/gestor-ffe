import React from 'react';
import { Profesor } from '../../../types/index.ts';
import { Mail, Settings } from 'lucide-react';
import { labelClass, inputClass } from '../ProfesorView.tsx';

interface Props {
  formData: Profesor;
  setFormData: React.Dispatch<React.SetStateAction<Profesor>>;
  saving: boolean;
  success: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const EmailConfigPanel: React.FC<Props> = ({ formData, setFormData, saving, success, error, onSubmit }) => {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Configuración de Correo
            </h3>
            <p className="text-sm text-slate-500">
              Credenciales necesarias para enviar notificaciones automáticas a alumnos y empresas.
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
            ✅ Configuración de correo guardada correctamente.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Servidor SMTP</label>
              <input
                type="text"
                name="smtp_host"
                value={formData.smtp_host}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Puerto</label>
              <input
                type="number"
                name="smtp_port"
                value={formData.smtp_port}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Usuario EducaMadrid</label>
              <input
                type="email"
                name="smtp_user"
                value={formData.smtp_user}
                onChange={handleChange}
                placeholder="usuario@educamadrid.org"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                name="smtp_pass"
                value={formData.smtp_pass}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="smtp_secure"
              name="smtp_secure"
              checked={formData.smtp_secure}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="smtp_secure" className="ml-2 text-sm text-slate-600">
              Usar conexión segura SSL/TLS (Puerto 465). Dejar desmarcado para STARTTLS (Puerto 587).
            </label>
          </div>

          <div className="flex justify-start pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-800 disabled:opacity-50 transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <Settings className="h-5 w-5" />
                {saving ? 'Guardando...' : 'Guardar Configuración de Correo'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};