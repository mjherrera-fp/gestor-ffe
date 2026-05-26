import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Empresa, TutorEmpresa, EmpresaEstadistica, Curso } from '../../../types/index.ts';
import { EmailAttachment } from '../../../types/email.ts';
import { mostrarToast } from '../../../utils/toast.ts';
import { getPlantillaById, interpolateBody } from '../../../../templates/emails/emailTemplates.ts';

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
  personaContacto: '', comunidad: 'Comunidad de Madrid', provincia: 'Madrid',
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
  const [profesor,   setProfesor]   = useState<{ nombre: string; apellidos: string } | null>(null);

  // ── UI listado ──
  const [selectedEmpresa,  setSelectedEmpresa]  = useState<Empresa | null>(null);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteTarget | null>(null);
  const [showPlantillaSelector, setShowPlantillaSelector] = useState(false);

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

  // ── Importación Excel ──
  const [isImporting,  setIsImporting]  = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; updated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filtros ──
  const [filterValoracion,    setFilterValoracion]    = useState(0);
  const [filterUltimosCursos, setFilterUltimosCursos] = useState(0);
  const [filterColaboracion,  setFilterColaboracion]  = useState<'todas' | 'con' | 'sin' | 'sin_convenio'>('todas');
  const [filterContactado,  setFilterContactado]  = useState<'todas' | 'contactada' | 'no_contactada'>('todas');
  const [emailsContactados, setEmailsContactados] = useState<Set<string>>(new Set());
  const [empresaIdsConConvenio, setEmpresaIdsConConvenio] = useState<number[]>([]);
  const [modoCreacion, setModoCreacion] = useState('descargar');

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => {
    fetchEmpresas();
    fetchCentros();
    fetchCurso();
    fetchAllEstadisticas();
    fetchEmpresasConConvenio();
    fetchProfesor();
    fetchEmailsContactados();
  }, []);

  useEffect(() => {
    fetch('/api/profesor/config/creacion-ficheros')
      .then(r => r.json())
      .then(data => setModoCreacion(data.modo || 'descargar'))
      .catch(() => {});
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

  const fetchProfesor = async () => {
    try {
      const res = await fetch('/api/profesor');
      if (res.ok) setProfesor(await res.json());
    } catch {
      console.error('Error al cargar el profesor');
    }
  };

  const fetchEmailsContactados = async () => {
    try {
      const res = await fetch('/api/historico/emails-contactados');
      if (res.ok) setEmailsContactados(new Set(await res.json()));
    } catch {
      console.error('Error al cargar emails contactados');
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

  const fetchEmpresasConConvenio = async () => {
    try {
      const res = await fetch('/api/empresas/con-convenio');
      if (res.ok) setEmpresaIdsConConvenio(await res.json());
    } catch {
      console.error('Error al cargar empresas con convenio');
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: EXCEL
  // ─────────────────────────────────────────

  const downloadTemplate = async () => {
    const headers = [[
      'Nombre', 'Dirección', 'Ciudad', 'CIF', 'Email', 'Teléfono', 'Comentarios',
      'Nº Convenio', 'Fecha Convenio', 'Centro Convenio',
      'Nombre Tutor', 'Apellidos Tutor', 'NIF Tutor', 'Email Tutor', 'Teléfono Tutor',
    ]];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Empresas');
    const filename = 'plantilla_importacion_empresas.xlsx';

    if (modoCreacion === 'crear') {
      const wbData = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      try {
        const res = await fetch('/api/save-xlsx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, base64Data: wbData }),
        });
        const data = await res.json();
        if (data.success) mostrarToast(`Plantilla guardada en docs/${data.filename}`);
      } catch {
        mostrarToast('Error al guardar la plantilla', 'error');
      }
      return;
    }

    XLSX.writeFile(wb, filename);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb   = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as any[];

        let successCount = 0;
        let updateCount  = 0;

        const seenCifs = new Set<string>();

        for (const row of data) {
          const nombre       = (row['Nombre'] || '').toString().trim();
          const cif          = (row['CIF'] || '').toString().trim();
          if (!nombre || !cif) continue;

          let empresaId: number | null = null;
          const existingEmpresa = empresas.find(e => e.cif.trim().toLowerCase() === cif.toLowerCase());

          const empresaData = {
            nombre,
            direccion: (row['Dirección'] || '').toString().trim(),
            ciudad:    (row['Ciudad'] || '').toString().trim(),
            cif,
            email:     (row['Email'] || '').toString().trim(),
            tlfn:      (row['Teléfono'] || '').toString().trim(),
            comentarios: (row['Comentarios'] || '').toString().trim(),
          };

          try {
            if (existingEmpresa) {
              await fetch(`/api/empresas/${existingEmpresa.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(empresaData),
              });
              empresaId = existingEmpresa.id!;
              if (!seenCifs.has(cif)) updateCount++;
            } else {
              const res = await fetch('/api/empresas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(empresaData),
              });
              const result = await res.json();
              empresaId = result.id;
              if (!seenCifs.has(cif)) successCount++;
            }
            seenCifs.add(cif);
          } catch {
            console.error('Error al procesar empresa:', nombre);
            continue;
          }

          const numConvenio = (row['Nº Convenio'] || '').toString().trim();
          if (numConvenio && empresaId) {
            const fechaConvenio = (row['Fecha Convenio'] || new Date().toISOString().split('T')[0]).toString().trim();
            const centroNombre  = (row['Centro Convenio'] || '').toString().trim();
            let centroId = centros.find(c => c.nombre.toLowerCase().includes(centroNombre.toLowerCase()))?.id;
            if (!centroId && centros.length > 0) centroId = centros[0].id;

            try {
              const convRes = await fetch(`/api/convenios?cursoId=${cursoId}`);
              const existingConvenios = await convRes.json();
              const existingConv = existingConvenios.find((c: any) =>
                c.empresaId === empresaId && c.numConvenio === numConvenio
              );

              const convenioData = {
                numConvenio,
                fechaConvenio,
                estado: 'COMPLETADO',
                empresaId,
                cursoId,
                centroId: centroId || '',
              };

              if (existingConv) {
                await fetch(`/api/convenios/${existingConv.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ convenio: convenioData }),
                });
              } else {
                await fetch('/api/convenios', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ convenio: convenioData }),
                });
              }
            } catch {
              console.error('Error al procesar convenio:', numConvenio);
            }
          }

          const tutorNombre = (row['Nombre Tutor'] || '').toString().trim();
          const tutorApellidos = (row['Apellidos Tutor'] || '').toString().trim();
          const tutorNif  = (row['NIF Tutor'] || '').toString().trim();
          if (!tutorNombre || !tutorApellidos || !tutorNif) continue;

          const tutorData = {
            empresaId,
            nombre: tutorNombre,
            apellidos: tutorApellidos,
            nif: tutorNif,
            email: (row['Email Tutor'] || '').toString().trim(),
            tlfn:  (row['Teléfono Tutor'] || '').toString().trim(),
          };

          try {
            const existingTutorRes = await fetch(`/api/empresas/${empresaId}/tutores`);
            const existingTutores: TutorEmpresa[] = await existingTutorRes.json();
            const existingTutor = existingTutores.find(t => t.nif.trim().toLowerCase() === tutorNif.toLowerCase());

            if (existingTutor) {
              await fetch(`/api/tutores-empresa/${existingTutor.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tutorData),
              });
            } else {
              await fetch('/api/tutores-empresa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tutorData),
              });
            }
          } catch {
            console.error('Error al procesar tutor:', tutorNombre);
          }
        }

        fetchEmpresas();
        setImportResult({ success: successCount, updated: updateCount });
      } catch {
        alert('Hubo un error al procesar el archivo Excel.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
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

  const cursosUnicos = useMemo(() => [...new Set(allEstadisticas.map(e => e.curso))]
    .sort((a, b) => {
      const yearA = parseInt(a.split('/')[0]);
      const yearB = parseInt(b.split('/')[0]);
      return yearB - yearA;
    }), [allEstadisticas]);

  const { empresaValoracionMedia, empresaCursos } = useMemo(() => {
    const valoracionMedia: Record<number, number> = {};
    const cursos: Record<number, string[]> = {};
    allEstadisticas.forEach(e => {
      if (!cursos[e.empresaId]) cursos[e.empresaId] = [];
      cursos[e.empresaId].push(e.curso);
    });
    allEstadisticas.forEach(e => {
      if (e.valoracion != null && e.valoracion > 0) {
        valoracionMedia[e.empresaId] = Math.max(valoracionMedia[e.empresaId] || 0, e.valoracion);
      }
    });
    return { empresaValoracionMedia: valoracionMedia, empresaCursos: cursos };
  }, [allEstadisticas]);

  const filteredEmpresas = useMemo(() => empresas.filter(emp => {
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
    if (filterColaboracion === 'sin_convenio' && empresaIdsConConvenio.includes(emp.id)) return false;

    if (filterContactado === 'contactada' && !emailsContactados.has(emp.email?.toLowerCase() ?? '')) return false;
    if (filterContactado === 'no_contactada' && emailsContactados.has(emp.email?.toLowerCase() ?? '')) return false;

    return true;
  }), [empresas, searchTerm, filterValoracion, filterUltimosCursos, filterColaboracion, filterContactado, empresaValoracionMedia, empresaCursos, cursosUnicos, empresaIdsConConvenio, emailsContactados]);

  // ─────────────────────────────────────────
  //  EMAIL
  // ─────────────────────────────────────────

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailBcc, setEmailBcc] = useState<string[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [perRecipientData, setPerRecipientData] = useState<Record<string, Record<string, string>> | undefined>(undefined);
  const [contextualContactIds, setContextualContactIds] = useState<Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }>>([]);

  const handleOpenIndividualEmail = async (empresa: Empresa) => {
    setEmailTo(empresa.email ? [empresa.email] : []);
    setEmailBcc([]);
    setEmailAttachments([]);
    try {
      const res = await fetch(`/api/email-contexto?empresaId=${empresa.id}`);
      setContextualContactIds(await res.json());
    } catch {
      setContextualContactIds([]);
    }
    setShowEmailModal(true);
  };

  const handleOpenBulkEmail = () => {
    setShowPlantillaSelector(true);
  };

  const handleEmailConPlantilla = async (plantillaId: string) => {
    const cfg = getPlantillaById(plantillaId);
    if (!cfg) return;

    const empresasConEmail = filteredEmpresas.filter(e => e.email);
    const empresa = empresasConEmail[0];
    const nombreEmpresa = empresa?.nombre ?? '';
    const contacto = empresa?.personaContacto || `persona de contacto de ${nombreEmpresa}`;
    const nombreProfesor = profesor ? `${profesor.nombre} ${profesor.apellidos}` : '';
    const curso = cursoInfo?.descripcion ?? '';
    const nombreCentro = centros[0]?.nombre ?? '';

    const bodyInterpolado = interpolateBody(cfg.body, {
      contacto,
      nombreEmpresa,
      nombreProfesor,
      profesor: nombreProfesor,
      curso,
      centroEducativo: nombreCentro,
      nombreCentro,
    });

    const perData: Record<string, Record<string, string>> = {};
    for (const e of empresasConEmail) {
      const eNombre = e.nombre ?? '';
      perData[e.email!] = {
        contacto: e.personaContacto || `persona de contacto de ${eNombre}`,
        nombreEmpresa: eNombre,
      };
    }

    setEmailTo(empresasConEmail.map(e => e.email!).filter(Boolean));
    setEmailBcc([]);
    setEmailAttachments([]);
    setEmailSubject(cfg.subject);
    setEmailBody(bodyInterpolado);
    setPerRecipientData(perData);
    setShowPlantillaSelector(false);
    setShowEmailModal(true);
  };

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
    filterContactado, setFilterContactado,
    cursosUnicos,
    empresaIdsConConvenio,
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
    // Excel
    isImporting,
    importResult, setImportResult,
    fileInputRef,
    downloadTemplate,
    handleImportExcel,
    // Email
    showPlantillaSelector, setShowPlantillaSelector,
    showEmailModal, setShowEmailModal,
    emailTo, emailBcc, emailAttachments, emailSubject, emailBody, perRecipientData, setPerRecipientData, contextualContactIds,
    handleOpenIndividualEmail, handleOpenBulkEmail, handleEmailConPlantilla,
  };
}
