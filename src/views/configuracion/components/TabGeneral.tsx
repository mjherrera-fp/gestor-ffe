import { useState, useEffect } from 'react';
import { Bell, Settings, Loader2, CalendarDays, Building2, Plus, Trash2, Pencil, FileBadge, X, Sun, Moon, Laptop } from 'lucide-react';
import { EmpresaFestivosModal } from './EmpresaFestivosModal.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { useTheme } from '../../../hooks/useTheme.tsx';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface AvisosConfig {
  semanas_inicio: string;
  semanas_inicio_documentos: string;
  semanas_fin: string;
}

export function TabGeneral() {
  // ── Tema (apariencia) ──
  const { theme, setTheme } = useTheme();

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

  const handleDeleteAllEmpresaFestivos = (localidad: string) => {
    setEmpresaFestivos(prev => ({ ...prev, [localidad]: [] }));
  };

  // ── Estado FFE valoraciones ──
  const [valoracionesFinales, setValoracionesFinales] = useState<{ id: number; codigo: string; valor: string; orden: number }[]>([]);
  const [editVF, setEditVF] = useState<{ id: number; codigo: string; valor: string; orden: number } | null>(null);
  const [savingVF, setSavingVF] = useState(false);

  // ── Estado FFE motivos ──
  const [motivosNoRealizacion, setMotivosNoRealizacion] = useState<{ id: number; codigo: string; valor: string; orden: number }[]>([]);
  const [editMN, setEditMN] = useState<{ id: number; codigo: string; valor: string; orden: number } | null>(null);
  const [savingMN, setSavingMN] = useState(false);

  // ── Confirmación de eliminación FFE ──
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'vf' | 'mn'; id: number; codigo: string } | null>(null);

  const fetchFFEValoraciones = async () => {
    const r = await fetch('/api/ffe/valoraciones-finales');
    if (r.ok) setValoracionesFinales(await r.json());
  };
  const fetchFFEMotivos = async () => {
    const r = await fetch('/api/ffe/motivos-no-realizacion');
    if (r.ok) setMotivosNoRealizacion(await r.json());
  };

  useEffect(() => { fetchFFEValoraciones(); fetchFFEMotivos(); }, []);

  const handleSaveVF = async () => {
    if (!editVF) return;
    setSavingVF(true);
    const isNew = !editVF.id;
    try {
      const r = await fetch(isNew ? '/api/ffe/valoraciones-finales' : `/api/ffe/valoraciones-finales/${editVF.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: editVF.codigo, valor: editVF.valor, orden: editVF.orden }),
      });
      if (r.ok) { await fetchFFEValoraciones(); setEditVF(null); }
    } finally { setSavingVF(false); }
  };
  const handleDeleteVF = (id: number, codigo: string) => {
    setDeleteConfirm({ type: 'vf', id, codigo });
  };
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'vf') {
      await fetch(`/api/ffe/valoraciones-finales/${deleteConfirm.id}`, { method: 'DELETE' });
      await fetchFFEValoraciones();
    } else {
      await fetch(`/api/ffe/motivos-no-realizacion/${deleteConfirm.id}`, { method: 'DELETE' });
      await fetchFFEMotivos();
    }
    setDeleteConfirm(null);
  };

  const handleSaveMN = async () => {
    if (!editMN) return;
    setSavingMN(true);
    const isNew = !editMN.id;
    try {
      const r = await fetch(isNew ? '/api/ffe/motivos-no-realizacion' : `/api/ffe/motivos-no-realizacion/${editMN.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: editMN.codigo, valor: editMN.valor, orden: editMN.orden }),
      });
      if (r.ok) { await fetchFFEMotivos(); setEditMN(null); }
    } finally { setSavingMN(false); }
  };

  const loading = loadingAvisos || loadingFestivos;

  if (loading) {
    return (
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-8 text-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── SECCIÓN APARIENCIA ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Apariencia</h3>
              <p className="text-sm text-text-muted">
                Elige el tema de la interfaz. También puedes cambiarlo desde la barra superior.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { id: 'claro', label: 'Claro', icon: Sun, desc: 'Fondo claro' },
              { id: 'oscuro', label: 'Oscuro', icon: Moon, desc: 'Fondo oscuro' },
              { id: 'sistema', label: 'Sistema', icon: Laptop, desc: 'Sigue el sistema operativo' },
            ] as const).map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  theme === id
                    ? 'bg-primary-light border-primary shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                <Icon className={`h-6 w-6 shrink-0 ${theme === id ? 'text-primary' : 'text-text-muted'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${theme === id ? 'text-primary' : 'text-text-main'}`}>{label}</p>
                  <p className="text-[11px] text-text-muted">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SECCIÓN AVISOS ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-soft text-warning-strong">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Configuración de Avisos</h3>
              <p className="text-sm text-text-muted">
                Configura los plazos para la generación automática de avisos de alumnos.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorAvisos && (
            <div className="mb-4 p-3 bg-danger-soft text-danger rounded-lg text-sm border border-danger/20">{errorAvisos}</div>
          )}
          {successAvisos && (
            <div className="mb-4 p-3 bg-success-soft text-success-strong rounded-lg text-sm border border-success/20">
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
                <p className="text-[10px] text-text-muted mt-1">
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
                <p className="text-[10px] text-text-muted mt-1">
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
                <p className="text-[10px] text-text-muted mt-1">
                  Alumnos a {avisos.semanas_fin} semana/s de finalizar las prácticas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-border-base">
              <button type="submit" disabled={savingAvisos} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
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
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Configuración de Festivos</h3>
              <p className="text-sm text-text-muted">
                Controla cómo afectan los días festivos a los cálculos de la FFE.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorFestivos && (
            <div className="mb-4 p-3 bg-danger-soft text-danger rounded-lg text-sm border border-danger/20">{errorFestivos}</div>
          )}
          {successFestivos && (
            <div className="mb-4 p-3 bg-success-soft text-success-strong rounded-lg text-sm border border-success/20">
              {successFestivos}
            </div>
          )}
          <form onSubmit={handleSubmitFestivos} className="space-y-6">
            {/* Toggle festivos centro */}
            <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-text-main">
                      Descontar días festivos del centro
                    </label>
                    <p className="text-xs text-text-muted mt-0.5">
                      {usarFestivos
                        ? 'Los días festivos del centro los estudiantes no irán a las prácticas y no contabilizarán para el cálculo de la fecha fin de la FFE ni de los días de cotización de la Seguridad Social.'
                        : 'Los días festivos del centro los estudiantes irán a las prácticas y contabilizarán para el cálculo de la fecha fin de la FFE y de los días de cotización de la Seguridad Social.'
                      }
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                    <input
                      type="checkbox"
                      checked={usarFestivos}
                      onChange={e => setUsarFestivos(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border-base peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-border-base after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Toggle festivos empresa */}
            <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-text-main">
                      Descontar días festivos de la empresa
                    </label>
                    <p className="text-xs text-text-muted mt-0.5">
                      {usarFestivosEmpresa
                        ? 'Los días festivos de la localidad de la empresa los estudiantes no irán a las prácticas y no contabilizarán para el cálculo de la fecha fin de la FFE ni de los días de cotización de la Seguridad Social.'
                        : 'Los días festivos de la localidad de la empresa los estudiantes irán a las prácticas y contabilizarán para el cálculo de la fecha fin de la FFE y de los días de cotización de la Seguridad Social.'
                      }
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                    <input
                      type="checkbox"
                      checked={usarFestivosEmpresa}
                      onChange={e => setUsarFestivosEmpresa(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border-base peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-border-base after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Lista de localidades con relaciones */}
            {usarFestivosEmpresa && (
              <div className="pt-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3 block">
                  Localidades con relaciones activas
                </label>
                {localidades.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-3">No hay localidades con relaciones activas.</p>
                ) : (
                  <div className="space-y-2">
                    {localidades.map(loc => {
                      const festivosLoc = empresaFestivos[loc] || [];
                      return (
                        <div key={loc} className="flex items-center justify-between p-3 bg-surface-subtle rounded-lg border border-border-base">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-surface-card text-text-muted border border-border-base">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text-main truncate">{loc}</p>
                              <p className="text-[10px] text-text-muted">
                                {festivosLoc.length > 0
                                  ? `${festivosLoc.length} día(s) festivo(s) configurado(s)`
                                  : 'Sin festivos configurados'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {festivosLoc.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAllEmpresaFestivos(loc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-danger/20 rounded-lg text-xs font-semibold text-danger hover:bg-danger-soft transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setFestivosModalLocalidad(loc)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-border-base rounded-lg text-xs font-semibold text-text-muted hover:bg-surface-hover transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Festivos
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-border-base">
              <button type="submit" disabled={savingFestivos} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
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
      <EmpresaFestivosModal
        open={!!festivosModalLocalidad}
        localidad={festivosModalLocalidad}
        festivos={empresaFestivos[festivosModalLocalidad || ''] || []}
        onSave={(festivos) => handleSaveEmpresaFestivos(festivosModalLocalidad || '', festivos)}
        onClose={() => setFestivosModalLocalidad(null)}
      />

      {/* ─── SECCIÓN VALORACIONES FFE ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <FileBadge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Valoraciones FFE</h3>
              <p className="text-sm text-text-muted">
                Gestiona los códigos de valoración final y motivos de no realización de las FFE.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-8">

          {/* Valoración final */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-text-main uppercase tracking-wider">Valoración final</h4>
              <button
                type="button"
                onClick={() => setEditVF({ id: 0, codigo: '', valor: '', orden: valoracionesFinales.length + 1 })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary rounded-lg text-xs font-semibold hover:bg-primary-light/70 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            </div>
            <div className="space-y-2">
              {valoracionesFinales.length === 0 && (
                <p className="text-xs text-text-muted italic py-3">No hay valoraciones definidas.</p>
              )}
              {valoracionesFinales.map(vf => (
                <div key={vf.id} className="group flex items-center gap-4 p-3 rounded-xl border border-border-base hover:border-primary/30 hover:bg-primary-light/20 transition-all cursor-pointer" onClick={() => setEditVF({ ...vf })}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-main">
                      <span className="text-primary">{vf.codigo}</span>
                      {vf.valor && <span className="text-text-muted font-normal"> — {vf.valor}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setEditVF({ ...vf }); }}
                  >
                    <Pencil className="h-4 w-4 text-text-muted hover:text-text-main" />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDeleteVF(vf.id, vf.codigo); }}
                  >
                    <Trash2 className="h-4 w-4 text-danger/70 hover:text-danger" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Motivo no realización */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-text-main uppercase tracking-wider">Motivo por el que no realiza las FFE</h4>
              <button
                type="button"
                onClick={() => setEditMN({ id: 0, codigo: '', valor: '', orden: motivosNoRealizacion.length + 1 })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary rounded-lg text-xs font-semibold hover:bg-primary-light/70 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            </div>
            <div className="space-y-2">
              {motivosNoRealizacion.length === 0 && (
                <p className="text-xs text-text-muted italic py-3">No hay motivos definidos.</p>
              )}
              {motivosNoRealizacion.map(mn => (
                <div key={mn.id} className="group flex items-center gap-4 p-3 rounded-xl border border-border-base hover:border-primary/30 hover:bg-primary-light/20 transition-all cursor-pointer" onClick={() => setEditMN({ ...mn })}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-main">
                      <span className="text-primary">{mn.codigo}</span>
                      {mn.valor && <span className="text-text-muted font-normal"> — {mn.valor}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setEditMN({ ...mn }); }}
                  >
                    <Pencil className="h-4 w-4 text-text-muted hover:text-text-main" />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'mn', id: mn.id, codigo: mn.codigo }); }}
                  >
                    <Trash2 className="h-4 w-4 text-danger/70 hover:text-danger" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ─── MODAL CONFIRMAR ELIMINACIÓN ─── */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-danger-soft text-danger">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Eliminar</h3>
              <p className="text-sm text-text-muted">
                {deleteConfirm?.type === 'vf' ? 'Valoración final' : 'Motivo no realización'}: <strong className="text-text-main">{deleteConfirm?.codigo}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-text-muted mb-6">¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.</p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-5 py-2.5 bg-danger text-white text-sm font-semibold rounded-xl hover:bg-danger/90 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL EDITAR VALORACIÓN FINAL ─── */}
      <Modal open={!!editVF} onClose={() => setEditVF(null)} maxWidth="sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-text-main">
              {editVF?.id ? 'Editar valoración final' : 'Nueva valoración final'}
            </h3>
            <button type="button" onClick={() => setEditVF(null)} className="text-text-muted hover:text-text-main">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveVF(); }} className="space-y-4">
            <div>
              <label className={labelClass}>Código</label>
              <input className={inputClass} value={editVF?.codigo || ''} onChange={e => setEditVF(prev => prev ? { ...prev, codigo: e.target.value } : null)} placeholder="Ej: APROBADO" />
            </div>
            <div>
              <label className={labelClass}>Valor</label>
              <input className={inputClass} value={editVF?.valor || ''} onChange={e => setEditVF(prev => prev ? { ...prev, valor: e.target.value } : null)} placeholder="Ej: Aprobado" />
            </div>
            <div>
              <label className={labelClass}>Orden</label>
              <input className={inputClass} type="number" value={editVF?.orden || 0} onChange={e => setEditVF(prev => prev ? { ...prev, orden: Number(e.target.value) } : null)} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={savingVF || !editVF?.codigo} className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {savingVF ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditVF(null)} className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── MODAL EDITAR MOTIVO NO REALIZACIÓN ─── */}
      <Modal open={!!editMN} onClose={() => setEditMN(null)} maxWidth="sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-text-main">
              {editMN?.id ? 'Editar motivo' : 'Nuevo motivo'}
            </h3>
            <button type="button" onClick={() => setEditMN(null)} className="text-text-muted hover:text-text-main">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveMN(); }} className="space-y-4">
            <div>
              <label className={labelClass}>Código</label>
              <input className={inputClass} value={editMN?.codigo || ''} onChange={e => setEditMN(prev => prev ? { ...prev, codigo: e.target.value } : null)} placeholder="Ej: Ex-T" />
            </div>
            <div>
              <label className={labelClass}>Valor</label>
              <textarea className={inputClass} rows={3} value={editMN?.valor || ''} onChange={e => setEditMN(prev => prev ? { ...prev, valor: e.target.value } : null)} placeholder="Ej: Exención total" />
            </div>
            <div>
              <label className={labelClass}>Orden</label>
              <input className={inputClass} type="number" value={editMN?.orden || 0} onChange={e => setEditMN(prev => prev ? { ...prev, orden: Number(e.target.value) } : null)} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={savingMN || !editMN?.codigo} className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {savingMN ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditMN(null)} className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-xl transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  );
}
