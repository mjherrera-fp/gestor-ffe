import { useState, useEffect } from 'react';
import { Empresa, TutorEmpresa, EmpresaEstadistica, Curso } from '../../../types/index.ts';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

export type DeleteTarget = { id: number; type: 'empresa' | 'tutor' };

export interface ConvenioRapidoState {
  tieneConvenio: boolean;
  numConvenio:   string;
  fechaConvenio: string;
  centroId:      number | '';
}

// ─────────────────────────────────────────
//  VALORES INICIALES
// ─────────────────────────────────────────

const EMPTY_EMPRESA: Partial<Empresa> = {
  nombre: '', direccion: '', ciudad: '', cif: '', email: '', tlfn: '',
};

const EMPTY_TUTOR: Partial<TutorEmpresa> = {
  nombre: '', apellidos: '', nif: '', email: '', tlfn: '',
};

const EMPTY_CONVENIO: ConvenioRapidoState = {
  tieneConvenio: false,
  numConvenio:   '',
  fechaConvenio: '',
  centroId:      '',
};

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useEmpresas(cursoId: number) {

  // ── Datos ──
  const [empresas,   setEmpresas]   = useState<Empresa[]>([]);
  const [tutores,    setTutores]    = useState<TutorEmpresa[]>([]);
  const [centros,    setCentros]    = useState<any[]>([]);
  const [cursoInfo,  setCursoInfo]  = useState<Curso | null>(null);

  // ── UI listado ──
  const [selectedEmpresa,  setSelectedEmpresa]  = useState<Empresa | null>(null);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteTarget | null>(null);

  // ── Modal empresa ──
  const [showEmpresaForm,  setShowEmpresaForm]  = useState(false);
  const [editingEmpresa,   setEditingEmpresa]   = useState<Empresa | null>(null);
  const [empresaFormData,  setEmpresaFormData]  = useState<Partial<Empresa>>(EMPTY_EMPRESA);
  const [convenioRapido,   setConvenioRapido]   = useState<ConvenioRapidoState>(EMPTY_CONVENIO);

  // ── Modal tutor ──
  const [showTutorForm,  setShowTutorForm]  = useState(false);
  const [editingTutor,   setEditingTutor]   = useState<TutorEmpresa | null>(null);
  const [tutorFormData,  setTutorFormData]  = useState<Partial<TutorEmpresa>>(EMPTY_TUTOR);

  // ── Estadísticas ──
  const [estadisticas,      setEstadisticas]      = useState<EmpresaEstadistica[]>([]);
  const [allEstadisticas,   setAllEstadisticas]   = useState<EmpresaEstadistica[]>([]);
  const [activeTab,         setActiveTab]         = useState<'tutores' | 'estadisticas'>('estadisticas');

  // ── Filtros ──
  const [filterValoracion,    setFilterValoracion]    = useState(0);
  const [filterUltimosCursos, setFilterUltimosCursos] = useState(0);
  const [filterColaboracion,  setFilterColaboracion]  = useState<'todas' | 'con' | 'sin'>('todas');

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => {
    fetchEmpresas();
    fetchCentros();
    fetchCurso();
    fetchAllEstadisticas();
  }, []);

  // ─────────────────────────────────────────
  //  FETCH
  // ─────────────────────────────────────────

  const fetchEmpresas = async () => {
    const res = await fetch('/api/empresas');
    setEmpresas(await res.json());
  };

  const fetchTutores = async (empresaId: number) => {
    const res = await fetch(`/api/empresas/${empresaId}/tutores`);
    setTutores(await res.json());
  };

  const fetchCentros = async () => {
    try {
      const res = await fetch('/api/centros');
      if (res.ok) {
        const data = await res.json();
        setCentros(data);
        if (data.length === 1) setConvenioRapido(prev => ({ ...prev, centroId: data[0].id }));
      }
    } catch (error) {
      console.error('Error al cargar centros:', error);
    }
  };

  const fetchEstadisticas = async (empresaId: number) => {
    const res = await fetch(`/api/empresas/${empresaId}/estadisticas`);
    setEstadisticas(await res.json());
  };

  const fetchCurso = async () => {
    try {
      const res = await fetch(`/api/cursos/${cursoId}`);
      if (res.ok) setCursoInfo(await res.json());
    } catch {
      console.error('Error al cargar el curso');
    }
  };

  const fetchAllEstadisticas = async () => {
    try {
      const res = await fetch('/api/empresas-estadisticas');
      if (res.ok) setAllEstadisticas(await res.json());
    } catch {
      console.error('Error al cargar estadísticas');
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: EMPRESA
  // ─────────────────────────────────────────

  const handleOpenNewEmpresa = () => {
    setEditingEmpresa(null);
    setEmpresaFormData(EMPTY_EMPRESA);
    setConvenioRapido({
      ...EMPTY_CONVENIO,
      centroId: centros.length === 1 ? centros[0].id : '',
    });
    setShowEmpresaForm(true);
  };

  const handleOpenEditEmpresa = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setEmpresaFormData(emp);
    setShowEmpresaForm(true);
  };

  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEmpresa ? 'PUT' : 'POST';
    const url    = editingEmpresa ? `/api/empresas/${editingEmpresa.id}` : '/api/empresas';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empresaFormData),
    });

    if (res.ok) {
      const savedEmpresa  = await res.json();
      const nuevaEmpresaId = editingEmpresa ? editingEmpresa.id : savedEmpresa.id;

      if (!editingEmpresa && convenioRapido.tieneConvenio && nuevaEmpresaId) {
        await fetch('/api/convenios', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            convenio: {
              empresaId:    nuevaEmpresaId,
              cursoId,
              centroId:     convenioRapido.centroId,
              numConvenio:  convenioRapido.numConvenio,
              fechaConvenio: convenioRapido.fechaConvenio,
              plazasTotales: 1,
              anexoCentro:  '',
              estado:       'COMPLETADO',
            },
          }),
        });
      }

      setShowEmpresaForm(false);
      fetchEmpresas();
    }
  };

  const handleDeleteEmpresa = async (id: number) => {
    try {
      await fetch(`/api/empresas/${id}`, { method: 'DELETE' });
      if (selectedEmpresa?.id === id) { setSelectedEmpresa(null); setTutores([]); }
      setShowDeleteConfirm(null);
      fetchEmpresas();
    } catch {
      alert('Error al eliminar la empresa.');
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: TUTOR
  // ─────────────────────────────────────────

  const handleOpenNewTutor = () => {
    setEditingTutor(null);
    setTutorFormData(EMPTY_TUTOR);
    setShowTutorForm(true);
  };

  const handleOpenEditTutor = (tutor: TutorEmpresa) => {
    setEditingTutor(tutor);
    setTutorFormData(tutor);
    setShowTutorForm(true);
  };

  const handleTutorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresa) return;
    const method = editingTutor ? 'PUT' : 'POST';
    const url    = editingTutor ? `/api/tutores-empresa/${editingTutor.id}` : '/api/tutores-empresa';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tutorFormData, empresaId: selectedEmpresa.id }),
    });
    if (res.ok) {
      setShowTutorForm(false);
      fetchTutores(selectedEmpresa.id!);
    }
  };

  const handleDeleteTutor = async (id: number) => {
    try {
      await fetch(`/api/tutores-empresa/${id}`, { method: 'DELETE' });
      setShowDeleteConfirm(null);
      fetchTutores(selectedEmpresa!.id!);
    } catch {
      alert('Error al eliminar el tutor.');
    }
  };

  const handleConfirmDelete = () => {
    if (!showDeleteConfirm) return;
    if (showDeleteConfirm.type === 'empresa') handleDeleteEmpresa(showDeleteConfirm.id);
    else handleDeleteTutor(showDeleteConfirm.id);
  };

  const handleSelectEmpresa = (emp: Empresa) => {
    setSelectedEmpresa(emp);
    fetchTutores(emp.id!);
    fetchEstadisticas(emp.id!);
    setActiveTab('estadisticas');
  };

  // ─────────────────────────────────────────
  //  DATOS DERIVADOS
  // ─────────────────────────────────────────

  const cursosUnicos = [...new Set(allEstadisticas.map(e => e.curso))]
    .sort((a, b) => {
      const yearA = parseInt(a.split('/')[0]);
      const yearB = parseInt(b.split('/')[0]);
      return yearB - yearA;
    });

  const empresaValoracionMedia: Record<number, number> = {};
  const empresaCursos: Record<number, string[]> = {};
  allEstadisticas.forEach(e => {
    if (!empresaCursos[e.empresaId]) empresaCursos[e.empresaId] = [];
    empresaCursos[e.empresaId].push(e.curso);
  });
  allEstadisticas.forEach(e => {
    if (e.valoracion != null && e.valoracion > 0) {
      empresaValoracionMedia[e.empresaId] = Math.max(empresaValoracionMedia[e.empresaId] || 0, e.valoracion);
    }
  });

  const filteredEmpresas = empresas.filter(emp => {
    if (!emp.id) return false;

    const matchesSearch = emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cif.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterValoracion > 0) {
      const maxVal = empresaValoracionMedia[emp.id] ?? 0;
      if (maxVal < filterValoracion) return false;
    }

    if (filterUltimosCursos > 0 && cursosUnicos.length > 0) {
      const lastN = cursosUnicos.slice(0, filterUltimosCursos);
      const empCursosSet = new Set(empresaCursos[emp.id] || []);
      if (!lastN.every(c => empCursosSet.has(c))) return false;
    }

    if (filterColaboracion === 'con' && !empresaCursos[emp.id]) return false;
    if (filterColaboracion === 'sin' && empresaCursos[emp.id]) return false;

    return true;
  });

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Datos
    empresas, tutores, centros, estadisticas, cursoInfo,
    allEstadisticas,
    filteredEmpresas,
    // Listado UI
    selectedEmpresa, handleSelectEmpresa,
    searchTerm, setSearchTerm,
    activeTab, setActiveTab,
    showDeleteConfirm, setShowDeleteConfirm,
    handleConfirmDelete,
    // Filtros
    filterValoracion, setFilterValoracion,
    filterUltimosCursos, setFilterUltimosCursos,
    filterColaboracion, setFilterColaboracion,
    cursosUnicos,
    // Empresa modal
    showEmpresaForm, setShowEmpresaForm,
    editingEmpresa,
    empresaFormData, setEmpresaFormData,
    convenioRapido, setConvenioRapido,
    handleOpenNewEmpresa, handleOpenEditEmpresa, handleEmpresaSubmit,
    // Tutor modal
    showTutorForm, setShowTutorForm,
    editingTutor,
    tutorFormData, setTutorFormData,
    handleOpenNewTutor, handleOpenEditTutor, handleTutorSubmit,
  };
}
