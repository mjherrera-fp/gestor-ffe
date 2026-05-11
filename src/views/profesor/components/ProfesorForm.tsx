import React from 'react';
import { Save, User, Mail, Phone, Hash } from 'lucide-react';
import { Profesor } from '../../../types/index.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

const FormSection = ({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-border-base shadow-sm overflow-hidden mb-6">

    <div className="p-6 border-b border-slate-100 bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            Información Personal
          </h3>
          <p className="text-sm text-slate-500">
            Configura tus datos personales.
          </p>
        </div>
      </div>
    </div>

    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

interface ProfesorFormProps {
  formData: Profesor;
  setFormData: (p: Profesor) => void;
  saving: boolean;
  success: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProfesorForm({ formData, setFormData, saving, success, onSubmit }: ProfesorFormProps) {
  const update = (field: keyof Profesor) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  return (
    <form onSubmit={onSubmit} >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">
            Perfil del Profesor
          </h1>
          <p className="text-xs lg:text-sm text-text-muted mt-1 leading-relaxed">
            Configura tu información personal y los centros donde impartes clase.
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-5 py-4 rounded-xl flex items-center gap-3 mb-8 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold">Información personal actualizada.</span>
        </div>
      )}

      <FormSection title="Información Personal" icon={User}>
        <div>
          <label className={labelClass}>Nombre</label>
          <input required className={inputClass} value={formData.nombre} onChange={update('nombre')} />
        </div>
        <div>
          <label className={labelClass}>Apellidos</label>
          <input required className={inputClass} value={formData.apellidos} onChange={update('apellidos')} />
        </div>
        <div>
          <label className={labelClass}>NIF</label>
          <input required className={inputClass} value={formData.nif} onChange={update('nif')} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input required type="email" className={inputClass} value={formData.email} onChange={update('email')} />
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <input required className={inputClass} value={formData.telefono} onChange={update('telefono')} />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-2 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-primary text-white px-8 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {saving ? 'Procesando...' : (
              <span className="flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> Guardar Perfil
              </span>
            )}
          </button>
        </div>

      </FormSection>

    </form>
  );
}
