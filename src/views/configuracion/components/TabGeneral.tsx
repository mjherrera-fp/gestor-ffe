import { useState, useEffect } from 'react';
import { Bell, Settings, Loader2 } from 'lucide-react';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface AvisosConfig {
  semanas_inicio: string;
  semanas_inicio_documentos: string;
  semanas_fin: string;
}

export function TabGeneral() {
  const [config, setConfig] = useState<AvisosConfig>({
    semanas_inicio: '1',
    semanas_inicio_documentos: '2',
    semanas_fin: '1',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profesor/config/avisos')
      .then(r => r.json())
      .then(data => {
        setConfig({
          semanas_inicio: data.semanas_inicio || '1',
          semanas_inicio_documentos: data.semanas_inicio_documentos || '2',
          semanas_fin: data.semanas_fin || '1',
        });
      })
      .catch(() => setError('Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');
    try {
      const res = await fetch('/api/profesor/config/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        setError('Error al guardar configuración');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 text-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Configuración de Avisos</h3>
            <p className="text-sm text-slate-500">
              Configura los plazos para la generación automática de avisos de alumnos.
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
            Configuración de avisos guardada correctamente.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Semanas desde inicio (doc. pendientes)</label>
              <input
                type="number"
                name="semanas_inicio_documentos"
                value={config.semanas_inicio_documentos}
                onChange={handleChange}
                className={inputClass}
                min={0}
                max={52}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Alumnos con documentos sin finalizar a N semanas de empezar.
              </p>
            </div>
            <div>
              <label className={labelClass}>Semanas desde inicio</label>
              <input
                type="number"
                name="semanas_inicio"
                value={config.semanas_inicio}
                onChange={handleChange}
                className={inputClass}
                min={0}
                max={52}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Alumnos a N semanas de haber empezado las prácticas.
              </p>
            </div>
            <div>
              <label className={labelClass}>Semanas antes de finalizar</label>
              <input
                type="number"
                name="semanas_fin"
                value={config.semanas_fin}
                onChange={handleChange}
                className={inputClass}
                min={0}
                max={52}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Alumnos a N semanas de finalizar las prácticas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors">
              <span className="flex items-center justify-center gap-2">
                <Settings className="h-5 w-5" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
