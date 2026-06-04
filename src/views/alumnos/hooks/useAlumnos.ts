import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Alumno, DetalleAcademico, RelacionAlumno } from '../../../types/index.ts';
import { EmailAttachment, EmailTargetType } from '../../../types/email.ts';
import { mostrarToast } from '../../../utils/toast.ts';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

export type SortField   = 'nombre' | 'apellidos' | 'horas';
export type SortOrder   = 'asc' | 'desc';
export type FilterStatus = 'all' | 'pending' | 'assigned';
export type FilterRelacionStatus = 'all' | 'con_relacion' | 'sin_relacion';
export type ViewMode    = 'grid' | 'table';

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useAlumnos(cursoId: number, detalleAcademicoId?: number) {

  // ── Datos ──
  const [alumnos,    setAlumnos]    = useState<Alumno[]>([]);
  const [relaciones, setRelaciones] = useState<RelacionAlumno[]>([]);
  const [detalles,   setDetalles]   = useState<DetalleAcademico[]>([]);

  // ── UI listado ──
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('alumnos_view_mode');
    return (saved === 'grid' || saved === 'table') ? saved : 'grid';
  });
  const [searchTerm,   setSearchTerm]   = useState('');
  const [sortBy,       setSortBy]       = useState<SortField>('apellidos');
  const [sortOrder,    setSortOrder]    = useState<SortOrder>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterMinCVEnvios, setFilterMinCVEnvios] = useState<number>(0);
  const [filterEmpresasInteresadas, setFilterEmpresasInteresadas] = useState<'all' | 'con' | 'sin'>('all');
  const [filterRelacionStatus, setFilterRelacionStatus] = useState<FilterRelacionStatus>('all');

  // ── Modal alumno ──
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Alumno | null>(null);
  const [formData,   setFormData]   = useState<Partial<Alumno>>({
    nombre: '', apellidos: '', dni: '', numSS: '', tlfn: '',
    emailEduca: '', emailPersonal: '', fechaNacimiento: '',
    cursoId, detalleAcademicoId: undefined, totalHorasFFE: 0,
  });

  // ── Modal advertencia horas ──
  const [pendingSubmitData, setPendingSubmitData] = useState<any | null>(null);

  // ── Modal eliminar ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // ── Detalle académico modal ──
  const [academicDetailAlumno, setAcademicDetailAlumno] = useState<Alumno | null>(null);

  // ── Importación Excel ──
  const [isImporting,  setIsImporting]  = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; updated: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modoCreacion, setModoCreacion] = useState('descargar');

  // ── Importación ZIP CVs ──
  const [isImportingZip, setIsImportingZip] = useState(false);
  const [zipResult, setZipResult] = useState<{ total: number; procesados: number; errores: number; results: { dni: string; nombre: string; ok: boolean; error?: string }[] } | null>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => { localStorage.setItem('alumnos_view_mode', viewMode); }, [viewMode]);

  useEffect(() => {
    fetchAlumnos();
    fetchDetalles();
  }, [cursoId, detalleAcademicoId]);

  useEffect(() => {
    fetch('/api/profesor/config/creacion-ficheros')
      .then(r => r.json())
      .then(data => setModoCreacion(data.modo || 'descargar'))
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────────
  //  FETCH
  // ─────────────────────────────────────────

  const fetchAlumnos = async () => {
    const params = new URLSearchParams({ cursoId: String(cursoId) });
    if (detalleAcademicoId) params.set('detalleAcademicoId', String(detalleAcademicoId));
    const res    = await fetch(`/api/alumnos?${params}`);
    setAlumnos(await res.json());
    const relParams = new URLSearchParams();
    if (detalleAcademicoId) relParams.set('detalleAcademicoId', String(detalleAcademicoId));
    const relRes = await fetch(`/api/relaciones-alumnos?${relParams}`);
    if (relRes.ok) setRelaciones(await relRes.json());
  };

  const fetchDetalles = async () => {
    const res = await fetch('/api/detalles-academicos');
    setDetalles(await res.json());
  };

  // ─────────────────────────────────────────
  //  HANDLERS: FORMULARIO
  // ─────────────────────────────────────────

  const handleOpenForm = (alumno: Alumno | null) => {
    if (alumno) {
      setEditing(alumno);
      setFormData(alumno);
    } else {
      setEditing(null);
      setFormData({
        nombre: '', apellidos: '', dni: '', numSS: '', tlfn: '',
        emailEduca: '', emailPersonal: '', fechaNacimiento: '', cursoId,
        detalleAcademicoId: detalleAcademicoId ?? (detalles.length > 0 ? detalles[0].id : undefined),
        totalHorasFFE: 0,
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    manualData?: any,
    confirmClearDates = false
  ): Promise<boolean> => {
    if (e) e.preventDefault();

    const dataToSend = manualData ? { ...manualData } : { ...formData, cursoId };

    // Intercepción: aviso de cambio de horas en alumno asignado
    if (editing && !manualData && !confirmClearDates) {
      if (formData.totalHorasFFE !== editing.totalHorasFFE) {
        const isAssigned =
          relaciones.some(rel => rel.alumnos?.some((ar: any) => ar.alumnoId === editing.id)) ||
          !!(editing as any).relacionId;
        if (isAssigned) {
          setPendingSubmitData(dataToSend);
          return false;
        }
      }
    }

    if (confirmClearDates) {
      dataToSend.fechaInicio = null;
      dataToSend.fechaFin    = null;
    }

    const method = editing ? 'PUT' : 'POST';
    const url    = editing ? `/api/alumnos/${editing.id}` : '/api/alumnos';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setPendingSubmitData(null);
        setFormData({
          nombre: '', apellidos: '', dni: '', numSS: '', tlfn: '',
          emailEduca: '', emailPersonal: '', fechaNacimiento: '',
          cursoId, totalHorasFFE: 0,
        });
        fetchAlumnos();
        return true;
      } else {
        console.error('Error al guardar:', await res.text());
      }
    } catch (error) {
      console.error('Error en la petición de red:', error);
    }
    return false;
  };

  // ─────────────────────────────────────────
  //  HANDLERS: ELIMINAR
  // ─────────────────────────────────────────

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/alumnos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setShowDeleteConfirm(null);
      fetchAlumnos();
    } catch {
      alert('Error: No se pudo eliminar el alumno. Es posible que tenga dependencias activas.');
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: CV
  // ─────────────────────────────────────────

  const handleFileUpload = async (alumnoId: number, file: File) => {
    const fd = new FormData();
    fd.append('cv', file);
    try {
      const res = await fetch(`/api/alumnos/${alumnoId}/cv`, { method: 'POST', body: fd });
      if (res.ok) fetchAlumnos();
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/alumnos/${id}/cv`, { method: 'DELETE' });
      if (res.ok) {
        // Actualizar el estado local para quitar el CV sin recargar todo
        setAlumnos(alumnos.map(a => a.id === id ? { ...a, cvPath: undefined } : a));
      }
    } catch (error) {
      console.error('Error al eliminar CV:', error);
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: EXCEL
  // ─────────────────────────────────────────

  const downloadTemplate = async () => {
    const headers = [[
      'Primer Apellido', 'Segundo Apellido', 'Nombre', 'DNI/Pasaporte',
      'Fecha Nacimiento', 'Num SS', 'Tlfn', 'Email personal',
      'Código Grupo', 'Email educamadrid', 'Horas pendientes FFE',
    ]];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Alumnos');
    const filename = 'plantilla_importacion_alumnos.xlsx';

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
        const errors: string[] = [];

        for (const row of data) {
          const dni            = (row['DNI/Pasaporte'] || '').toString().trim();
          const nombre         = (row['Nombre'] || '').toString().trim();
          const primerApellido = (row['Primer Apellido'] || '').toString().trim();
          const segundoApellido = (row['Segundo Apellido'] || '').toString().trim();
          if (!dni || !nombre || !primerApellido) continue;

          let fechaNacimiento = row['Fecha Nacimiento'] || '2000-01-01';
          if (fechaNacimiento instanceof Date) {
            fechaNacimiento = fechaNacimiento.toISOString().split('T')[0];
          } else if (typeof fechaNacimiento === 'string' && fechaNacimiento.includes('/')) {
            const [d, m, y] = fechaNacimiento.split('/');
            const fullYear  = y.length === 2 ? (Number(y) > 40 ? '19' + y : '20' + y) : y;
            fechaNacimiento = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }

          const studentData = {
            nombre,
            apellidos:          `${primerApellido} ${segundoApellido}`.trim(),
            dni,
            numSS:              row['Num SS'] || '',
            tlfn:               row['Tlfn'] || '',
            emailEduca:         row['Email educamadrid'] || '',
            emailPersonal:      row['Email personal'] || '',
            fechaNacimiento,
            cursoId,
            totalHorasFFE:      Number(row['Horas pendientes FFE']) || 0,
            fechaInicio:        '',
            fechaFin:           '',
            estadoPlanFormativo: 'PENDIENTE_ENVIAR_ESTUDIANTE',
            estadoSeguimiento:  'PENDIENTE',
            estadoValoracion:   'PENDIENTE',
            detalleAcademicoId: detalles.find(d => d.codigoGrupo === row['Código Grupo'])?.id
              || (detalles.length > 0 ? detalles[0].id : null),
          };

          try {
            const res = await fetch('/api/alumnos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(studentData),
            });
            if (res.ok) successCount++;
            else if (res.status === 409) {
              const errData = await res.json();
              errors.push(`${studentData.apellidos}, ${studentData.nombre}: ${errData.error}`);
            }
          } catch (err) {
            console.error('Error al procesar alumno:', studentData.nombre, err);
          }
        }

        fetchAlumnos();
        setImportResult({ success: successCount, updated: 0, errors });
      } catch {
        alert('Hubo un error al procesar el archivo Excel.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportCVZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingZip(true);
    const fd = new FormData();
    fd.append('zip', file);
    try {
      const res = await fetch('/api/alumnos/cv/zip', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setZipResult(data);
        fetchAlumnos();
      } else {
        const err = await res.json();
        setZipResult({ total: 0, procesados: 0, errores: 1, results: [{ dni: '', nombre: '', ok: false, error: err.error || 'Error al procesar ZIP' }] });
      }
    } catch {
      setZipResult({ total: 0, procesados: 0, errores: 1, results: [{ dni: '', nombre: '', ok: false, error: 'Error de conexión' }] });
    } finally {
      setIsImportingZip(false);
      if (zipFileInputRef.current) zipFileInputRef.current.value = '';
    }
  };

  // ─────────────────────────────────────────
  //  ORDENACIÓN Y FILTRADO
  // ─────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const filteredAndSortedAlumnos = useMemo(() => alumnos
    .filter(alumno => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        alumno.nombre.toLowerCase().includes(q) ||
        alumno.apellidos.toLowerCase().includes(q) ||
        alumno.dni.toLowerCase().includes(q) ||
        alumno.emailEduca.toLowerCase().includes(q) ||
        alumno.emailPersonal.toLowerCase().includes(q);
      const isAssigned   = alumno.relacionId !== null;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'pending'  && !isAssigned) ||
        (filterStatus === 'assigned' && isAssigned);
      const cvCount = alumno.cvEnvioCount ?? 0;
      const matchesMinCV = filterMinCVEnvios === 0 || cvCount >= filterMinCVEnvios;
      const empInteresadas = alumno.empresasInteresadasCount ?? 0;
      const matchesEmpInteresadas =
        filterEmpresasInteresadas === 'all' ||
        (filterEmpresasInteresadas === 'con' && empInteresadas > 0) ||
        (filterEmpresasInteresadas === 'sin' && empInteresadas === 0);
      const matchesRelacionStatus =
        filterRelacionStatus === 'all' ||
        (filterRelacionStatus === 'con_relacion' && isAssigned) ||
        (filterRelacionStatus === 'sin_relacion' && !isAssigned);
      return matchesSearch && matchesStatus && matchesMinCV && matchesEmpInteresadas && matchesRelacionStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'nombre')    cmp = a.nombre.localeCompare(b.nombre);
      if (sortBy === 'apellidos') cmp = a.apellidos.localeCompare(b.apellidos);
      if (sortBy === 'horas')     cmp = (a.totalHorasFFE || 0) - (b.totalHorasFFE || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    }), [alumnos, searchTerm, filterStatus, filterMinCVEnvios, filterEmpresasInteresadas, filterRelacionStatus, sortBy, sortOrder]);

  // ─────────────────────────────────────────
  //  EMAIL
  // ─────────────────────────────────────────

  const [showEmailTypeSelector, setShowEmailTypeSelector] = useState(false);
  const [pendingEmailTarget, setPendingEmailTarget] = useState<{ type: 'individual' | 'bulk'; alumno?: Alumno } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailBcc, setEmailBcc] = useState<string[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [contextualContactIds, setContextualContactIds] = useState<Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }>>([]);

  const handleOpenIndividualEmail = (alumno: Alumno) => {
    setPendingEmailTarget({ type: 'individual', alumno });
    setShowEmailTypeSelector(true);
  };

  const handleOpenBulkEmail = () => {
    setPendingEmailTarget({ type: 'bulk' });
    setShowEmailTypeSelector(true);
  };

  const handleEmailTypeConfirm = async (tipo: EmailTargetType) => {
    setShowEmailTypeSelector(false);

    if (!pendingEmailTarget) return;

    if (pendingEmailTarget.type === 'individual' && pendingEmailTarget.alumno) {
      const emails: string[] = [];
      if (tipo === 'educamadrid' || tipo === 'ambos') {
        if (pendingEmailTarget.alumno.emailEduca) emails.push(pendingEmailTarget.alumno.emailEduca);
      }
      if (tipo === 'personal' || tipo === 'ambos') {
        if (pendingEmailTarget.alumno.emailPersonal) emails.push(pendingEmailTarget.alumno.emailPersonal);
      }
      setEmailTo(emails);
      setEmailBcc([]);
      try {
        const res = await fetch(`/api/email-contexto?alumnoId=${pendingEmailTarget.alumno.id}`);
        setContextualContactIds(await res.json());
      } catch {
        setContextualContactIds([]);
      }
    } else if (pendingEmailTarget.type === 'bulk') {
      const emails: string[] = [];
      for (const a of filteredAndSortedAlumnos) {
        if (tipo === 'educamadrid' || tipo === 'ambos') {
          if (a.emailEduca) emails.push(a.emailEduca);
        }
        if (tipo === 'personal' || tipo === 'ambos') {
          if (a.emailPersonal) emails.push(a.emailPersonal);
        }
      }
      setEmailTo([]);
      setEmailBcc([...new Set(emails)]);
      setContextualContactIds([]);
    }

    setEmailAttachments([]);
    setShowEmailModal(true);
    setPendingEmailTarget(null);
  };

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Datos
    alumnos, detalles,
    // Listado UI
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    sortBy, sortOrder, filterStatus, setFilterStatus,
    filterMinCVEnvios, setFilterMinCVEnvios,
    filterEmpresasInteresadas, setFilterEmpresasInteresadas,
    filterRelacionStatus, setFilterRelacionStatus,
    toggleSort,
    filteredAndSortedAlumnos,
    // Formulario
    showForm, setShowForm,
    editing,
    formData, setFormData,
    handleOpenForm, handleSubmit,
    // Advertencia horas
    pendingSubmitData, setPendingSubmitData,
    // Eliminar
    showDeleteConfirm, setShowDeleteConfirm,
    handleDelete,
    // Detalle académico
    academicDetailAlumno, setAcademicDetailAlumno,
    fetchAlumnos,
    // CV
    handleFileUpload,
    handleFileDelete,
    // Excel
    isImporting,
    importResult, setImportResult,
    fileInputRef,
    downloadTemplate,
    handleImportExcel,
    // ZIP CVs
    isImportingZip,
    zipResult, setZipResult,
    zipFileInputRef,
    handleImportCVZip,
    // Email
    showEmailTypeSelector, setShowEmailTypeSelector,
    pendingEmailTarget, setPendingEmailTarget,
    showEmailModal, setShowEmailModal,
    emailTo, emailBcc, emailAttachments, contextualContactIds,
    handleOpenIndividualEmail, handleOpenBulkEmail,
    handleEmailTypeConfirm,
  };
}
