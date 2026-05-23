import { useState, useEffect } from 'react';
import { Bell, Settings, Loader2, CalendarDays } from 'lucide-react';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface AvisosConfig {
  semanas_inicio: string;
  semanas_inicio_documentos: string;
  semanas_fin: string;
}

export function TabGeneral() {
  // ── Estado avisos ──
  const [avisos, setAvisos] = useState<AvisosConfig>({
    semanas_inicio: '1',
    semanas_inicio_documentos: '2',
    semanas_fin: '1',
  });
  const [loadingAvisos, setLoadingAvisos] = useState(true);
  const [savingAvisos, setSavingAvisos] = useState(false);
  const [successAvisos, setSuccessAvisos] = useState('');
  const [errorAvisos, setErrorAvisos] = useState('');

  // ── Estado festivos ──
  const [usarFestivos, setUsarFestivos] = useState(true);
  const [loadingFestivos, setLoadingFestivos] = useState(true);
  const [savingFestivos, setSavingFestivos] = useState(false);
  const [successFestivos, setSuccessFestivos] = useState('');
  const [errorFestivos, setErrorFestivos] = useState('');

  // ── Cargar configuraciones ──
  useEffect(() => {
    fetch('/api/profesor/config/avisos')
      .then(r => r.json())
      .then(data => {
        setAvisos({
          semanas_inicio: data.semanas_inicio || '1',
          semanas_inicio_documentos: data.semanas_inicio_documentos || '2',
          semanas_fin: data.semanas_fin || '1',
        });
      })
      .catch(() => setErrorAvisos('Error al cargar configuración de avisos'))
      .finally(() => setLoadingAvisos(false));

    fetch('/api/profesor/config/festivos')
      .then(r => r.json())
      .then(data => {
        setUsarFestivos(data.usar_festivos !== '0');
      })
      .catch(() => setErrorFestivos('Error al cargar configuración de festivos'))
      .finally(() => setLoadingFestivos(false));
  }, []);

  // ── Handlers avisos ──
  const handleChangeAvisos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAvisos(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAvisos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAvisos(true);
    setSuccessAvisos('');
    setErrorAvisos('');
    try {
      const res = await fetch('/api/profesor/config/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(avisos),
      });
      if (res.ok) {
        setSuccessAvisos('Configuración de avisos guardada correctamente.');
      } else {
        setErrorAvisos('Error al guardar configuración de avisos');
      }
    } catch {
      setErrorAvisos('Error de conexión');
    } finally {
      setSavingAvisos(false);
    }
  };

  // ── Handlers festivos ──
  const handleSubmitFestivos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFestivos(true);
    setSuccessFestivos('');
    setErrorFestivos('');
    try {
      const res = await fetch('/api/profesor/config/festivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usar_festivos: usarFestivos ? '1' : '0' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessFestivos(
          data.recalculadas !== undefined
            ? `Configuración guardada. Se recalcularon ${data.recalculadas} alumnos.`
            : 'Configuración de festivos guardada correctamente.'
        );
      } else {
        setErrorFestivos('Error al guardar configuración de festivos');
      }
    } catch {
      setErrorFestivos('Error de conexión');
    } finally {
      setSavingFestivos(false);
    }
  };

  const loading = loadingAvisos || loadingFestivos;

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
    <div className="space-y-6">

      {/* ─── SECCIÓN AVISOS ─── */}
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
          {errorAvisos && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{errorAvisos}</div>
          )}
          {successAvisos && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
              {successAvisos}
            </div>
          )}
          <form onSubmit={handleSubmitAvisos} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Semanas antes del inicio (doc. pendientes)</label>
                <input
                  type="number"
                  name="semanas_inicio_documentos"
                  value={avisos.semanas_inicio_documentos}
                  onChange={handleChangeAvisos}
                  className={inputClass}
                  min={0}
                  max={52}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Alumnos con documentos sin finalizar a {avisos.semanas_inicio_documentos} semana/s de empezar.
                </p>
              </div>
              <div>
                <label className={labelClass}>Semanas antes del inicio</label>
                <input
                  type="number"
                  name="semanas_inicio"
                  value={avisos.semanas_inicio}
                  onChange={handleChangeAvisos}
                  className={inputClass}
                  min={0}
                  max={52}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Alumnos a {avisos.semanas_inicio} semana/s de empezar las prácticas.
                </p>
              </div>
              <div>
                <label className={labelClass}>Semanas antes de finalizar</label>
                <input
                  type="number"
                  name="semanas_fin"
                  value={avisos.semanas_fin}
                  onChange={handleChangeAvisos}
                  className={inputClass}
                  min={0}
                  max={52}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Alumnos a {avisos.semanas_fin} semana/s de finalizar las prácticas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button type="submit" disabled={savingAvisos} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {savingAvisos ? 'Guardando...' : 'Guardar Configuración de Avisos'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── SECCIÓN FESTIVOS ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Configuración de Festivos</h3>
              <p className="text-sm text-slate-500">
                Controla cómo afectan los días festivos del centro a los cálculos de la FFE.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorFestivos && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{errorFestivos}</div>
          )}
          {successFestivos && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
              {successFestivos}
            </div>
          )}
          <form onSubmit={handleSubmitFestivos} className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">
                      Descontar días festivos del centro
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {usarFestivos
                        ? 'Los días festivos del centro los estudiantes no irán a las prácticas y no contabilizarán para el cálculo de la fecha fin de la FFE ni de los días de cotización de la Seguridad Social.'
                        : 'Los días festivos del centro los estudiantes irán a las prácticas y contabilizarán para el cálculo de la fecha fin de la FFE y de los días de cotización de la Seguridad Social.'
                      }
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={usarFestivos}
                      onChange={e => setUsarFestivos(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button type="submit" disabled={savingFestivos} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {savingFestivos ? 'Guardando...' : 'Guardar Configuración de Festivos'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
