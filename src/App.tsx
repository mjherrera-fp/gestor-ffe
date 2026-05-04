import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Building2,
  FileText,
  UserCircle,
  Trophy,
  Settings,
  LayoutDashboard,
  Archive,
  Trash2,
  Plus,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Send,
  Download,
  AlertCircle,
  Menu,
  X,
  ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Profesor, Curso, Alumno, Empresa, Convenio, ConvenioEstado } from './types/index.ts';

// Components
import ProfesorView from './components/ProfesorView.tsx';
import CursosView from './components/CursosView.tsx';
import AlumnosView from './components/AlumnosView.tsx';
import EmpresasView from './components/EmpresasView.tsx';
import ConveniosView from './components/ConveniosView.tsx';
import InteresesView from './components/InteresesView.tsx';
import RelacionesView from './components/RelacionesView.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [activeCurso, setActiveCurso] = useState<Curso | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [profesorRes, cursosRes] = await Promise.all([
        fetch('/api/profesor'),
        fetch('/api/cursos')
      ]);
      const profesorData = await profesorRes.json();
      const cursosData = await cursosRes.json();

      setProfesor(profesorData);
      setCursos(cursosData);

      const activeCursosList = (cursosData as Curso[]).filter(c => !c.archivado);

      // If we don't have an active curso, pick the first one
      if (!activeCurso && activeCursosList.length > 0) {
        setActiveCurso(activeCursosList[0]);
      }
      // If the current active curso was just archived (it's not in the activeCursosList anymore)
      else if (activeCurso && !activeCursosList.some(c => c.id === activeCurso.id)) {
        setActiveCurso(activeCursosList.length > 0 ? activeCursosList[0] : null);
      }
      // If the current active curso object reference changed but it's still active, update it
      else if (activeCurso) {
        const updatedActive = activeCursosList.find(c => c.id === activeCurso.id);
        if (updatedActive) {
          setActiveCurso(updatedActive);
        }
      }
    } catch (error) {
      console.error("Error fetching initial data", error);
    } finally {
      setLoading(false);
    }
  };

  const activeCursos = cursos.filter(c => !c.archivado);

  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Profesor', icon: UserCircle },
    { id: 'cursos', label: 'Cursos', icon: BookOpen },
    { id: 'alumnos', label: 'Alumnos', icon: Users, disabled: activeCursos.length === 0 },
    { id: 'empresas', label: 'Empresas', icon: Building2, disabled: activeCursos.length === 0 },
    { id: 'intereses', label: 'Intereses', icon: Trophy, disabled: activeCursos.length === 0 },
    { id: 'convenios', label: 'Convenios', icon: FileText, disabled: activeCursos.length === 0 },
    { id: 'relaciones', label: 'Relaciones', icon: ArrowLeftRight, disabled: activeCursos.length === 0 },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando SGE-FFE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden font-sans relative">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-border-base flex flex-col shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 lg:static lg:w-60 lg:shadow-sm
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
            className="lg:hidden p-2 text-text-muted hover:bg-slate-50 rounded-lg"
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
                    : 'text-text-muted hover:bg-slate-50 hover:text-text-main'
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-50">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">v1.1.5 Production</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-base overflow-hidden relative">
        {/* Header */}
        <header className="h-[72px] lg:h-20 bg-white border-b border-border-base flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-text-main hover:bg-slate-50 rounded-lg"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] lg:text-xs text-text-muted mt-1">
                {profesor ? `Bienvenido, ${profesor.nombre}` : `Bienvenido al Gestor FFE`}
              </p>
              <h2 className="text-lg lg:text-xl font-bold text-text-main leading-none">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              
            </div>
            <div className="sm:hidden">
              <h2 className="text-base font-bold text-text-main">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Global Curso Selector */}
            {activeTab !== 'cursos' && activeCursos.length > 0 && (
              <div className="flex items-center gap-1.5 lg:gap-2 bg-emerald-50 text-emerald-800 px-2 lg:px-3 py-1.5 rounded-full text-[9px] lg:text-[10px] font-bold border border-emerald-100/50">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="uppercase hidden md:inline">Curso:</span>
                <select
                  value={activeCurso?.id || ''}
                  onChange={(e) => setActiveCurso(activeCursos.find(c => c.id === Number(e.target.value)) || null)}
                  className="bg-transparent border-none appearance-none outline-none font-bold cursor-pointer"
                >
                  {activeCursos.map(c => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>
            )}

            <div
              onClick={() => setActiveTab('dashboard')}
              className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-primary-light flex items-center justify-center text-primary cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <UserCircle className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'dashboard' && (
              <ProfesorView
                profesor={profesor}
                onUpdate={(newProfesor) => {
                  setProfesor(newProfesor);
                }}
              />
            )}
            {activeTab === 'cursos' && (
              <CursosView
                cursos={cursos}
                onUpdate={fetchData}
              />
            )}
            {activeTab === 'alumnos' && activeCurso && (
              <AlumnosView cursoId={activeCurso.id!} />
            )}
            {activeTab === 'empresas' && activeCurso && (
              <EmpresasView />
            )}
            {activeTab === 'intereses' && activeCurso && (
              <InteresesView cursoId={activeCurso.id!} />
            )}
            {activeTab === 'convenios' && activeCurso && (
              <ConveniosView cursoId={activeCurso.id!} />
            )}
            {activeTab === 'relaciones' && activeCurso && (
              <RelacionesView cursoId={activeCurso.id!} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
