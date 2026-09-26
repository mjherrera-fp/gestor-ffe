import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  Copyright,
  FileText,
  FolderUp,
  History,
  Laptop,
  LayoutDashboard,
  Link,
  Lock,
  Menu,
  Moon,
  Settings,
  Sun,
  UserCircle,
  Users,
  X
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {Aviso, Curso, DetalleAcademico, Profesor} from './types/index.ts';
import {useTheme, type ThemeMode} from './hooks/useTheme.tsx';
import {verificarCredencialBiometrica} from './utils/webauthn.ts';
import packageJson from '../package.json';

const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

const THEME_CYCLE: ThemeMode[] = ['claro', 'oscuro', 'sistema'];
const THEME_LABEL: Record<ThemeMode, string> = { claro: 'Claro', oscuro: 'Oscuro', sistema: 'Sistema' };

// Components
import {Title} from './components/Title.tsx';
import ProfesorView from './views/profesor/ProfesorView.tsx';
import CursosView from './views/cursos/CursosView.tsx';
import AlumnosView from './views/alumnos/AlumnosView.tsx';
import EmpresasView from './views/empresas/EmpresasView.tsx';
import ConveniosView from './views/convenios/ConveniosView.tsx';
import InteresesView from './views/intereses/InteresesView.tsx';
import RelacionesView from './views/relaciones/RelacionesView.tsx';
import ComunicacionesDatView from './views/comunicaciones-dat/ComunicacionesDatView.tsx';
import PanelView from './views/panel/PanelView.tsx';
import LockView from './views/lock/LockView.tsx';
import ConfiguracionView from './views/configuracion/ConfiguracionView.tsx';
import CopyrightModal from './components/CopyrightModal.tsx';
import TermsView from './components/TermsView.tsx';
import HistoricoView from './views/historico/HistoricoView.tsx';
import ToastContainer from './components/ToastContainer.tsx';
import NotificationBell from './components/NotificationBell.tsx';
import CreateNotificationModal from './components/CreateNotificationModal.tsx';
import UpdateBanner from './views/updater/UpdateBanner.tsx';
import UpdateButton from './views/updater/UpdateButton.tsx';
import { UpdaterProvider } from './views/updater/useUpdaterStatus.tsx';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [activeCurso, setActiveCurso] = useState<Curso | null>(null);
  const [detallesAcademicos, setDetallesAcademicos] = useState<DetalleAcademico[]>([]);
  const [configTab, setConfigTab] = useState<'general' | 'correo' | 'seguridad'>('general');
  const [activeDetalle, setActiveDetalle] = useState<DetalleAcademico | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [showCreateNotification, setShowCreateNotification] = useState(false);
  const [preloadRelacion, setPreloadRelacion] = useState<{ empresaId: number; alumnoIds: number[] } | null>(null);
  const [datNecesario, setDatNecesario] = useState(true);
  const [historicoAnulacionAlumnoId, setHistoricoAnulacionAlumnoId] = useState<number | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);

  // Limpiar preload de relación al salir de la pestaña "relaciones"
  useEffect(() => {
    if (activeTab !== 'relaciones') setPreloadRelacion(null);
    if (activeTab !== 'historico') setHistoricoAnulacionAlumnoId(null);
  }, [activeTab]);

  const generarAvisos = async () => {
    try {
      const res = await fetch('/api/avisos/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAvisos(data);
      }
    } catch { }
  };

  const handleDescartarAviso = async (id: number) => {
    await fetch(`/api/avisos/${id}/descartar`, { method: 'PUT' });
    setAvisos(prev => prev.filter(a => a.id !== id));
  };

  const handlePosponerAviso = async (id: number) => {
    await fetch(`/api/avisos/${id}/posponer`, { method: 'PUT' });
    setAvisos(prev => prev.map(a => a.id === id ? { ...a, estado: 'pospuesto' } : a));
  };

  const refrescarAvisos = async () => {
    try {
      const res = await fetch('/api/avisos');
      if (res.ok) setAvisos(await res.json());
    } catch { }
  };

  const fetchData = async () => {
    try {
      const statusRes = await fetch('/api/auth/status');
      const { locked, encrypted } = await statusRes.json();

      if (locked) {
        setIsLocked(true);
        setLoading(false);
        return; // Cortamos la ejecución aquí
      }

      if (encrypted) {
        setIsEncrypted(true);
      }

      const termsRes = await fetch('/api/profesor/aceptacion-uso');
      const { aceptado } = await termsRes.json();
      if (!aceptado) {
        setShowTerms(true);
        setLoading(false);
        return;
      }

      // Si no está bloqueada, sigue tu código normal:
      const [profesorRes, cursosRes, detallesRes] = await Promise.all([
        fetch('/api/profesor'),
        fetch('/api/cursos'),
        fetch('/api/detalles-academicos')
      ]);
      const profesorData = await profesorRes.json();
      const cursosData: Curso[] = await cursosRes.json();
      const detallesData: DetalleAcademico[] = await detallesRes.json();

      setProfesor(profesorData);
      setCursos(cursosData);
      setDetallesAcademicos(detallesData);

      try {
        const datRes = await fetch('/api/profesor/config/dat');
        const datData = await datRes.json();
        setDatNecesario(datData.modo !== 'no');
        if (datData.modo === 'no' && activeTab === 'comunicaciones-dat') {
          setActiveTab('dashboard');
        }
      } catch {
        setDatNecesario(true);
      }

      // Auto-select first curso
      if (!activeCurso && cursosData.length > 0) {
        setActiveCurso(cursosData[0]);
      } else if (activeCurso) {
        const updated = cursosData.find(c => c.id === activeCurso.id);
        if (updated) setActiveCurso(updated);
        else setActiveCurso(cursosData.length > 0 ? cursosData[0] : null);
      }

      // Auto-select first detalle
      if (!activeDetalle && detallesData.length > 0) {
        setActiveDetalle(detallesData[0]);
      } else if (activeDetalle) {
        const updated = detallesData.find(d => d.id === activeDetalle.id);
        if (updated) setActiveDetalle(updated);
        else setActiveDetalle(detallesData.length > 0 ? detallesData[0] : null);
      }

      await generarAvisos();
    } catch (error) {
      console.error("Error fetching initial data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    if (!window.biometric) return;
    try {
      const status = await window.biometric.status();
      setBiometricEnabled(status.enabled);
      setBiometricCredentialId(status.credentialId);
    } catch {
      setBiometricEnabled(false);
      setBiometricCredentialId(null);
    }
  };

  const tieneProfesor = profesor !== null;
  const tieneCurso = activeCurso !== null;
  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Profesor', icon: UserCircle },
    { id: 'cursos', label: 'Cursos', icon: BookOpen, disabled: !tieneProfesor },
    { id: 'panel', label: 'Panel', icon: LayoutDashboard, disabled: !tieneProfesor || !tieneCurso },
    { id: 'alumnos', label: 'Alumnos', icon: Users, disabled: !tieneProfesor || !tieneCurso },
    { id: 'empresas', label: 'Empresas', icon: Building2, disabled: !tieneProfesor || !tieneCurso },
    { id: 'intereses', label: 'Intereses', icon: Link, disabled: !tieneProfesor || !tieneCurso },
    { id: 'convenios', label: 'Convenios', icon: FileText, disabled: !tieneProfesor || !tieneCurso },
    { id: 'relaciones', label: 'Relaciones', icon: ArrowLeftRight, disabled: !tieneProfesor || !tieneCurso },
    { id: 'comunicaciones-dat', label: 'Enviar a la DAT', icon: FolderUp, disabled: !tieneProfesor || !tieneCurso },
  ].filter(item => item.id !== 'comunicaciones-dat' || datNecesario), [tieneProfesor, tieneCurso, datNecesario]);

  // 3. Función para intentar desbloquear
  // Función para desbloquear (recibe directamente el string del componente)
  const aplicarDesbloqueo = async (password: string) => {
    try {
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setIsLocked(false);
        setAuthError('');
        setLoading(true);
        await fetchData(); // Recargamos todo ahora que hay acceso
      } else {
        setAuthError('La contraseña es incorrecta o el archivo está dañado.');
      }
    } catch (err) {
      setAuthError('Error de comunicación con el servidor.');
    }
  };

  const handleUnlock = async (password: string) => {
    await aplicarDesbloqueo(password);
  };

  const handleBiometricUnlock = async () => {
    if (!window.biometric || biometricBusy) return;
    setBiometricBusy(true);
    setAuthError('');
    try {
      let credentialId = biometricCredentialId;
      if (!credentialId) {
        const status = await window.biometric.status();
        if (!status.enabled || !status.credentialId) {
          setAuthError('El desbloqueo biométrico no está configurado.');
          return;
        }
        credentialId = status.credentialId;
      }
      const verificado = await verificarCredencialBiometrica(credentialId);
      if (!verificado.ok) {
        setAuthError(
          verificado.error === 'cancelado'
            ? 'Verificación biométrica cancelada. Puedes usar el botón inferior o escribir tu contraseña.'
            : 'No se pudo verificar tu gesto biométrico.'
        );
        return;
      }
      const res = await window.biometric.getPassword();
      if (!res.ok || !res.password) {
        setAuthError('No se pudo recuperar la contraseña protegida.');
        return;
      }
      await aplicarDesbloqueo(res.password);
    } catch (err) {
      setAuthError('Error al desbloquear mediante Windows Hello.');
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleLock = async () => {
    try {
      // Llamada al backend para cerrar la sesión/cifrar la DB
      await fetch('/api/auth/lock', { method: 'POST' });

      // Reset de estados locales para limpiar la UI
      setIsLocked(true);
      setProfesor(null);
      setCursos([]);
      setActiveCurso(null);
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Error al bloquear la aplicación", err);
    }
  };

  const handleCycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  // 4. Si isLocked es true, renderiza la pantalla de bloqueo en lugar de la app
  if (isLocked) {
    return (
      <LockView
        onUnlock={handleUnlock}
        error={authError}
        biometricEnabled={biometricEnabled}
        biometricBusy={biometricBusy}
        onBiometricUnlock={handleBiometricUnlock}
      />
    );
  }

  if (showTerms) {
    return <TermsView onAccept={async () => {
      await fetch('/api/profesor/aceptacion-uso', { method: 'POST' });
      setShowTerms(false);
      setLoading(true);
      fetchData();
    }} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-medium">Cargando SGE-FFE...</p>
        </div>
      </div>
    );
  }

  return (
    <UpdaterProvider>
      <div className="flex h-screen bg-bg-base overflow-hidden font-sans relative">
      {/* Mobile Backdrop */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-overlay backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-surface-card border-r border-border-base flex flex-col shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 lg:static lg:w-60 lg:shadow-sm
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg grayscale-0 flex items-center justify-center">
              <img
                src="/assets/favicon.png"
                alt="Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-xl leading-tight text-primary">Gestor FFE</h1>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-text-muted hover:bg-surface-hover rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }
              }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-semibold text-sm ${activeTab === item.id
                ? 'bg-primary-light text-primary'
                : item.disabled
                  ? 'opacity-40 cursor-not-allowed text-text-muted'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-border-base">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
            v{packageJson.version}
            {isDev && <span className="ml-1 text-warning-strong font-bold">dev</span>}
          </p>
          <p className="text-[9px] text-text-muted mt-1">
            <Copyright size={12} className="inline"/> <button onClick={() => setShowCopyright(true)} className="hover:text-primary transition-colors cursor-pointer">mjherrera-fp</button>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-base overflow-hidden relative">
        {/* Header */}
        <header className="h-18 lg:h-20 bg-surface-card border-b border-border-base flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-text-main hover:bg-surface-hover rounded-lg"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] lg:text-xs text-text-muted mt-1">
                {profesor ? `Bienvenido, ${profesor.nombre}` : `Bienvenido al Gestor FFE`}
              </p>
              <h2 className="text-lg lg:text-xl font-bold text-text-main leading-none">
                {activeTab === 'configuracion' ? 'Configuración' : activeTab === 'historico' ? 'Histórico' : navItems.find(i => i.id === activeTab)?.label}
              </h2>

            </div>
            <div className="sm:hidden">
              <h2 className="text-base font-bold text-text-main">
                {activeTab === 'configuracion' ? 'Configuración' : activeTab === 'historico' ? 'Histórico' : navItems.find(i => i.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Global Grupo Selector */}
            {activeDetalle && (
              <div className="relative">
                <button
                  onClick={() => setShowGroupSelector(prev => !prev)}
                  className="flex items-center gap-1.5 lg:gap-2 bg-success-soft text-success-strong px-2 lg:px-3 py-1.5 rounded-full text-[9px] lg:text-[10px] font-bold border border-success/20 hover:bg-success/20 transition-all"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
                  {activeCurso && (
                    <span className="uppercase hidden md:inline">{activeCurso.descripcion}:</span>
                  )}
                  <span className="max-w-40 truncate">
                    {(activeDetalle as any).nombreCorto || (activeDetalle as any).codigoGrupo} <span className="hidden md:inline">({(activeDetalle as any).centroNombre || ''})</span>
                  </span>
                  <svg className="h-3 w-3 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showGroupSelector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowGroupSelector(false)} />
                    <div className="absolute right-0 top-full mt-2 w-72 bg-surface-card rounded-xl border border-border-base shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                      {detallesAcademicos.map(d => {
                        const isActive = d.id === activeDetalle.id;
                        return (
                          <button
                            key={d.id}
                            onClick={() => { setActiveDetalle(d); setShowGroupSelector(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                              isActive
                                ? 'bg-success-soft text-success-strong font-bold'
                                : 'text-text-main hover:bg-surface-hover font-medium'
                            }`}
                          >
                            <span className="block truncate">{(d as any).nombreCorto || (d as any).codigoGrupo}</span>
                            {(d as any).centroNombre && (
                              <span className="block text-[11px] text-text-muted truncate">
                                {(d as any).centroNombre}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Solo mostramos el botón si la base de datos es de tipo cifrada */}
            {isEncrypted && (
              <Title text="Bloquear Aplicación">
                <button
                  onClick={handleLock}
                  className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-all flex items-center justify-center"
                >
                  <Lock className="h-5 w-5" />
                </button>
              </Title>
            )}
            <Title text="Histórico">
              <button
                onClick={() => setActiveTab('historico')}
                className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-all flex items-center justify-center"
              >
                <History className="h-5 w-5" />
              </button>
            </Title>
            <Title text={`Tema: ${THEME_LABEL[theme]} — cambiar`}>
              <button
                onClick={handleCycleTheme}
                className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-all flex items-center justify-center"
              >
                {theme === 'claro' ? <Sun className="h-5 w-5" /> : theme === 'oscuro' ? <Moon className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
              </button>
            </Title>
            <NotificationBell
              avisos={avisos}
              onDescartar={handleDescartarAviso}
              onAbrirCrear={() => setShowCreateNotification(true)}
            />
            <UpdateButton />
            <Title text="Configuración">
              <button
                onClick={() => setActiveTab('configuracion')}
                className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-all flex items-center justify-center"
              >
                <Settings className="h-5 w-5" />
              </button>
            </Title>
            <div
              onClick={() => setActiveTab('dashboard')}
              className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-primary-light flex items-center justify-center text-primary cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <UserCircle className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth overscroll-contain">
          <div className="max-w-7xl mx-auto pb-20">
            {/* Gate: sin profesor */}
            {!tieneProfesor && activeTab !== 'dashboard' && activeTab !== 'configuracion' && (
              <div className="bg-warning-soft rounded-xl p-6 border border-warning/20 mb-6">
                <p className="text-sm text-warning-strong font-medium">
                  Primero debes configurar tus datos como profesor en la sección <strong>Profesor</strong>.
                </p>
              </div>
            )}

            {/* Gate: profesor sí, sin curso */}
            {tieneProfesor && !tieneCurso && activeTab !== 'dashboard' && activeTab !== 'cursos' && activeTab !== 'configuracion' && (
              <div className="bg-warning-soft rounded-xl p-6 border border-warning/20 mb-6">
                <p className="text-sm text-warning-strong font-medium">
                  Primero debes crear un curso académico en la sección <strong>Cursos</strong>.
                </p>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <ProfesorView
                profesor={profesor}
                onUpdate={(newProfesor) => {
                  setProfesor(newProfesor);
                }}
                onRefresh={fetchData}
              />
            )}
            {activeTab === 'cursos' && (
              <CursosView
                cursos={cursos}
                onUpdate={fetchData}
              />
            )}
            {activeTab === 'alumnos' && activeCurso && (
              <AlumnosView
                cursoId={activeCurso.id!}
                detalleAcademicoId={activeDetalle?.id}
                onGoToConfig={() => { setConfigTab('correo'); setActiveTab('configuracion'); }}
                onGoToAnulaciones={(alumnoId) => { setHistoricoAnulacionAlumnoId(alumnoId); setActiveTab('historico'); }}
              />
            )}
            {activeTab === 'empresas' && activeCurso && (
              <EmpresasView cursoId={activeCurso.id!} onGoToConfig={() => { setConfigTab('correo'); setActiveTab('configuracion'); }} />
            )}
            {activeTab === 'panel' && activeCurso && (
              <PanelView
                cursoId={activeCurso.id!}
                detalleAcademicoId={activeDetalle?.id}
                datNecesario={datNecesario}
              />
            )}
            {activeTab === 'intereses' && activeCurso && (
              <InteresesView
                cursoId={activeCurso.id!}
                detalleAcademicoId={activeDetalle?.id}
                onCreateRelacion={(empresaId, alumnoIds) => {
                  setPreloadRelacion({ empresaId, alumnoIds });
                  setActiveTab('relaciones');
                }}
              />
            )}
            {activeTab === 'convenios' && activeCurso && (
              <ConveniosView
                cursoId={activeCurso.id!}
                centroId={activeDetalle?.centroId}
                detalleAcademicoId={activeDetalle?.id}
              />
            )}
          {activeTab === 'relaciones' && activeCurso && (
            <RelacionesView cursoId={activeCurso.id!} detalleAcademicoId={activeDetalle?.id} profesor={profesor ?? undefined} onGoToConfig={() => { setConfigTab('correo'); setActiveTab('configuracion'); }} preloadRelacion={preloadRelacion} />
          )}
            {activeTab === 'comunicaciones-dat' && activeCurso && (
                <ComunicacionesDatView cursoId={activeCurso.id!} detalleAcademicoId={activeDetalle?.id}/>
            )}
          {activeTab === 'historico' && <HistoricoView initialAnulacionesAlumnoId={historicoAnulacionAlumnoId} />}
          {activeTab === 'configuracion' && <ConfiguracionView initialTab={configTab} />}
          </div>
        </section>
      </main>

      <CopyrightModal open={showCopyright} onClose={() => setShowCopyright(false)} />

      <ToastContainer
        avisos={avisos}
        onDescartar={handleDescartarAviso}
        onPosponer={handlePosponerAviso}
      />
      <CreateNotificationModal
        open={showCreateNotification}
        onClose={() => setShowCreateNotification(false)}
        onCreado={refrescarAvisos}
      />

      <UpdateBanner />
    </div>
    </UpdaterProvider>
  );
}
