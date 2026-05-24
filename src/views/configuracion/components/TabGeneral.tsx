import { useState, useEffect } from 'react';
import { Bell, Settings, Loader2, CalendarDays, Building2, Plus, FileDown, FolderOpen, Square, CheckSquare, Circle, CheckCircle2 } from 'lucide-react';
import { EmpresaFestivosModal } from './EmpresaFestivosModal.tsx';

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

  // ── Estado festivos centro ──
  const [usarFestivos, setUsarFestivos] = useState(true);
  const [loadingFestivos, setLoadingFestivos] = useState(true);
  const [savingFestivos, setSavingFestivos] = useState(false);
  const [successFestivos, setSuccessFestivos] = useState('');
  const [errorFestivos, setErrorFestivos] = useState('');

  // ── Estado festivos empresa ──
  const [usarFestivosEmpresa, setUsarFestivosEmpresa] = useState(false);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [empresaFestivos, setEmpresaFestivos] = useState<Record<string, string[]>>({});
  const [festivosModalLocalidad, setFestivosModalLocalidad] = useState<string | null>(null);

  // ── Estado creación de ficheros ──
  const [modoCreacion, setModoCreacion] = useState('descargar');
  const [carpetaEstudiante, setCarpetaEstudiante] = useState(false);
  const [loadingCreacion, setLoadingCreacion] = useState(true);
  const [savingCreacion, setSavingCreacion] = useState(false);
  const [successCreacion, setSuccessCreacion] = useState('');
  const [errorCreacion, setErrorCreacion] = useState('');

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
        setUsarFestivosEmpresa(data.usar_festivos_empresa === '1');
      })
      .catch(() => setErrorFestivos('Error al cargar configuración de festivos'))
      .finally(() => setLoadingFestivos(false));

    fetch('/api/empresas/localidades-con-relaciones')
      .then(r => r.json())
      .then(setLocalidades)
      .catch(() => {});

    fetch('/api/empresas/festivos')
      .then(r => r.json())
      .then(data => setEmpresaFestivos(data))
      .catch(() => {});

    fetch('/api/profesor/config/creacion-ficheros')
      .then(r => r.json())
      .then(data => {
        setModoCreacion(data.modo || 'descargar');
        setCarpetaEstudiante(data.carpeta_estudiante === '1');
      })
      .catch(() => setErrorCreacion('Error al cargar configuración de creación de ficheros'))
      .finally(() => setLoadingCreacion(false));
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
        body: JSON.stringify({
          usar_festivos: usarFestivos ? '1' : '0',
          usar_festivos_empresa: usarFestivosEmpresa ? '1' : '0',
          empresa_festivos: empresaFestivos,
        }),
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

  // ── Handlers festivos empresa ──
  const handleSaveEmpresaFestivos = (localidad: string, festivos: string[]) => {
    setEmpresaFestivos(prev => ({ ...prev, [localidad]: festivos }));
    setFestivosModalLocalidad(null);
  };

  // ── Handlers creación de ficheros ──
  const handleSubmitCreacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreacion(true);
    setSuccessCreacion('');
    setErrorCreacion('');
    try {
      const res = await fetch('/api/profesor/config/creacion-ficheros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: modoCreacion, carpeta_estudiante: carpetaEstudiante ? '1' : '0' }),
      });
      if (res.ok) {
        setSuccessCreacion('Configuración de creación de ficheros guardada correctamente.');
      } else {
        setErrorCreacion('Error al guardar configuración de creación de ficheros');
      }
    } catch {
      setErrorCreacion('Error de conexión');
    } finally {
      setSavingCreacion(false);
    }
  };

  const loading = loadingAvisos || loadingFestivos || loadingCreacion;

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

      {/* ─── SECCIÓN CREACIÓN DE FICHEROS ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Creación de ficheros</h3>
              <p className="text-sm text-slate-500">
                Elige cómo se generan los documentos (PDF, DOCX, XLSX) al descargarlos.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorCreacion && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{errorCreacion}</div>
          )}
          {successCreacion && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
              {successCreacion}
            </div>
          )}
          <form onSubmit={handleSubmitCreacion} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModoCreacion('descargar')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  modoCreacion === 'descargar'
                    ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                {modoCreacion === 'descargar' ? (
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`h-4 w-4 ${modoCreacion === 'descargar' ? 'text-indigo-500' : 'text-slate-500'}`} />
                    <span className={`text-sm font-semibold ${modoCreacion === 'descargar' ? 'text-indigo-800' : 'text-slate-800'}`}>Descargar</span>
                  </div>
                  <p className={`text-xs mt-1 ${modoCreacion === 'descargar' ? 'text-indigo-600' : 'text-slate-500'}`}>
                    Los documentos se descargan por el navegador a la carpeta de descargas del sistema.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setModoCreacion('crear')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  modoCreacion === 'crear'
                    ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                {modoCreacion === 'crear' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileDown className={`h-4 w-4 ${modoCreacion === 'crear' ? 'text-emerald-500' : 'text-slate-500'}`} />
                    <span className={`text-sm font-semibold ${modoCreacion === 'crear' ? 'text-emerald-800' : 'text-slate-800'}`}>Guardar en carpeta docs/</span>
                  </div>
                  <p className={`text-xs mt-1 ${modoCreacion === 'crear' ? 'text-emerald-600' : 'text-slate-500'}`}>
                    Los documentos se guardan automáticamente en la carpeta <code className="bg-slate-200 px-1 rounded text-xs">docs/</code> junto al ejecutable de la aplicación.
                  </p>
                </div>
              </button>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCarpetaEstudiante(!carpetaEstudiante)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
              >
                {carpetaEstudiante ? (
                  <CheckSquare className="h-5 w-5 text-blue-500 shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-slate-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-800">Crear una carpeta por estudiante</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Si está marcado, dentro de la carpeta de cada empresa se crearán subcarpetas por alumno con sus documentos individuales.
                  </p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button type="submit" disabled={savingCreacion} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {savingCreacion ? 'Guardando...' : 'Guardar Configuración'}
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
                Controla cómo afectan los días festivos a los cálculos de la FFE.
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
            {/* Toggle festivos centro */}
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

            {/* Toggle festivos empresa */}
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">
                      Descontar días festivos de la empresa
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {usarFestivosEmpresa
                        ? 'Los días festivos de la localidad de la empresa los estudiantes no irán a las prácticas y no contabilizarán para el cálculo de la fecha fin de la FFE ni de los días de cotización de la Seguridad Social.'
                        : 'Los días festivos de la localidad de la empresa los estudiantes irán a las prácticas y contabilizarán para el cálculo de la fecha fin de la FFE y de los días de cotización de la Seguridad Social.'
                      }
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={usarFestivosEmpresa}
                      onChange={e => setUsarFestivosEmpresa(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Lista de localidades con relaciones */}
            {usarFestivosEmpresa && (
              <div className="pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                  Localidades con relaciones activas
                </label>
                {localidades.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3">No hay localidades con relaciones activas.</p>
                ) : (
                  <div className="space-y-2">
                    {localidades.map(loc => {
                      const festivosLoc = empresaFestivos[loc] || [];
                      return (
                        <div key={loc} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-white text-slate-500 border border-slate-200">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 truncate">{loc}</p>
                              <p className="text-[10px] text-slate-400">
                                {festivosLoc.length > 0
                                  ? `${festivosLoc.length} día(s) festivo(s) configurado(s)`
                                  : 'Sin festivos configurados'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFestivosModalLocalidad(loc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 ml-3"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Festivos
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

      {/* ─── MODAL FESTIVOS EMPRESA ─── */}
      {festivosModalLocalidad && (
        <EmpresaFestivosModal
          localidad={festivosModalLocalidad}
          festivos={empresaFestivos[festivosModalLocalidad] || []}
          onSave={(festivos) => handleSaveEmpresaFestivos(festivosModalLocalidad, festivos)}
          onClose={() => setFestivosModalLocalidad(null)}
        />
      )}

    </div>
  );
}
