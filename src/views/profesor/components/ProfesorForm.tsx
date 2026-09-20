import React from 'react';
import { Save, User, Mail, Phone, Hash } from 'lucide-react';
import { Profesor } from '../../../types/index.ts';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';
import { required, email, compose } from '../../../utils/validation.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
const inputErrorClass = 'border-red-400 ring-2 ring-red-200';
const errorMsgClass = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  nombre: [required('Nombre')],
  apellidos: [required('Apellidos')],
  nif: [required('NIF')],
  email: [compose(required('Email'), email('Email'))],
  telefono: [required('Teléfono')],
};

const FormSection = ({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="bg-surface-card rounded-xl border border-border-base shadow-sm overflow-hidden mb-6">

    <div className="p-6 border-b border-border-base bg-surface-subtle">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-light text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-main">
            Información Personal
          </h3>
          <p className="text-sm text-text-muted">
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
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const update = (field: keyof Profesor) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} >
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
        <div className="bg-success-soft border border-success/20 text-success-strong px-5 py-4 rounded-xl flex items-center gap-3 mb-8 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-bold">Información personal actualizada.</span>
        </div>
      )}

      <FormSection title="Información Personal" icon={User}>
        <div>
          <label className={labelClass}>Nombre<span className="text-red-500 ml-0.5">*</span></label>
          <input
            className={`${inputClass} ${errors.nombre ? inputErrorClass : ''}`}
            value={formData.nombre}
            onChange={update('nombre')}
            onBlur={() => onBlur('nombre', formData.nombre)}
          />
          {errors.nombre && <p className={errorMsgClass}>{errors.nombre}</p>}
        </div>
        <div>
          <label className={labelClass}>Apellidos<span className="text-red-500 ml-0.5">*</span></label>
          <input
            className={`${inputClass} ${errors.apellidos ? inputErrorClass : ''}`}
            value={formData.apellidos}
            onChange={update('apellidos')}
            onBlur={() => onBlur('apellidos', formData.apellidos)}
          />
          {errors.apellidos && <p className={errorMsgClass}>{errors.apellidos}</p>}
        </div>
        <div>
          <label className={labelClass}>NIF<span className="text-red-500 ml-0.5">*</span></label>
          <input
            className={`${inputClass} ${errors.nif ? inputErrorClass : ''}`}
            value={formData.nif}
            onChange={update('nif')}
            onBlur={() => onBlur('nif', formData.nif)}
          />
          {errors.nif && <p className={errorMsgClass}>{errors.nif}</p>}
        </div>
        <div>
          <label className={labelClass}>Email<span className="text-red-500 ml-0.5">*</span></label>
          <input
            type="email"
            className={`${inputClass} ${errors.email ? inputErrorClass : ''}`}
            value={formData.email}
            onChange={update('email')}
            onBlur={() => onBlur('email', formData.email)}
          />
          {errors.email && <p className={errorMsgClass}>{errors.email}</p>}
        </div>
        <div>
          <label className={labelClass}>Teléfono<span className="text-red-500 ml-0.5">*</span></label>
          <input
            className={`${inputClass} ${errors.telefono ? inputErrorClass : ''}`}
            value={formData.telefono}
            onChange={update('telefono')}
            onBlur={() => onBlur('telefono', formData.telefono)}
          />
          {errors.telefono && <p className={errorMsgClass}>{errors.telefono}</p>}
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-2 pt-4 border-t border-border-base">
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
