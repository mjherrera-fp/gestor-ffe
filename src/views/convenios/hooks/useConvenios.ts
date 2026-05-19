import { useState, useEffect } from 'react';
import { Convenio, Empresa, CentroEducativo, ConvenioEstado, FirmaTipo } from '../../../types/index.ts';
import { getNextConvenioEstado, getPrevConvenioEstado } from '../utils/conveniosUtils.ts';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

export type ConvenioExtendido = Convenio & { empresaNombre: string; centroNombre: string };

export type SortField = 'empresa' | 'estado';
export type SortOrder = 'asc' | 'desc';

export interface ConvenioFormState {
  numConvenio: string;
  fechaConvenio: string;
  isActive: boolean;
}

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useConvenios(cursoId: number, centroId?: number) {

  // ── Datos ──
  const [convenios, setConvenios] = useState<ConvenioExtendido[]>([]);
  const [empresas,  setEmpresas]  = useState<Empresa[]>([]);
  const [centros,   setCentros]   = useState<CentroEducativo[]>([]);

  // ── UI listado ──
  const [selectedConvenio,  setSelectedConvenio]  = useState<ConvenioExtendido | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [listSearchTerm,    setListSearchTerm]    = useState('');
  const [statusFilter,      setStatusFilter]      = useState<string>('all');
  const [sortBy,            setBy]                = useState<SortField>('empresa');
  const [sortOrder,         setSortOrder]         = useState<SortOrder>('asc');

  // ── UI formulario ──
  const [showForm,        setShowForm]        = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [editingId,       setEditingId]       = useState<number | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedCentro,  setSelectedCentro]  = useState<number | null>(null);
  const [searchTermEmpresa, setSearchTermEmpresa] = useState('');
  const [formData, setFormData] = useState<ConvenioFormState>({
    numConvenio: '',
    fechaConvenio: new Date().toISOString().split('T')[0],
    isActive: false,
  });

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => { fetchData(); }, [cursoId, centroId]);
  useEffect(() => { setSelectedConvenio(null); }, [cursoId, centroId]);

  // ─────────────────────────────────────────
  //  FETCH
  // ─────────────────────────────────────────

  const fetchData = async () => {
    const convParams = new URLSearchParams({ cursoId: String(cursoId) });
    if (centroId) convParams.set('centroId', String(centroId));
    const [convRes, emRes, ceRes] = await Promise.all([
      fetch(`/api/convenios?${convParams}`),
      fetch('/api/empresas'),
      fetch('/api/centros'),
    ]);
    const conveniosData = await convRes.json();
    setConvenios(Array.isArray(conveniosData) ? conveniosData : []);
    setEmpresas(await emRes.json());

    const centrosData: CentroEducativo[] = await ceRes.json();
    setCentros(centrosData);

    if (!isEditing && centrosData.length > 0 && !selectedCentro) {
      setSelectedCentro(centrosData[0].id!);
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: FORMULARIO
  // ─────────────────────────────────────────

  const handleOpenNew = () => {
    setIsEditing(false);
    setEditingId(null);
    setSelectedEmpresa(null);
    setSelectedCentro(centros.length > 0 ? centros[0].id! : null);
    setSearchTermEmpresa('');
    setFormData({
      numConvenio: '',
      fechaConvenio: new Date().toISOString().split('T')[0],
      isActive: false,
    });
    setShowForm(true);
  };

  const handleEdit = (conv: ConvenioExtendido) => {
    setIsEditing(true);
    setEditingId(conv.id!);
    setSelectedEmpresa(conv.empresaId);
    setSelectedCentro(conv.centroId || (centros.length > 0 ? centros[0].id! : null));
    setSearchTermEmpresa(conv.empresaNombre);
    setFormData({
      numConvenio:   conv.numConvenio,
      fechaConvenio: conv.fechaConvenio,
      isActive:      conv.estado === ConvenioEstado.COMPLETADO,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresa || !selectedCentro) return;

    const convenio: Convenio = {
      numConvenio:   formData.numConvenio,
      fechaConvenio: formData.fechaConvenio,
      estado:        formData.isActive
        ? ConvenioEstado.COMPLETADO
        : (selectedConvenio?.estado || ConvenioEstado.PENDIENTE_ENVIAR),
      empresaId: selectedEmpresa,
      cursoId,
      centroId:  selectedCentro,
      tipoFirma: selectedConvenio?.tipoFirma || FirmaTipo.SIN_ASIGNAR,
    };

    const url    = isEditing ? `/api/convenios/${editingId}` : '/api/convenios';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenio }),
    });

    if (res.ok) {
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      setFormData({
        numConvenio:   '',
        fechaConvenio: new Date().toISOString().split('T')[0],
        isActive:      false,
      });
      setSelectedEmpresa(null);
      setSearchTermEmpresa('');
      if (centros.length > 0) setSelectedCentro(centros[0].id!);
      fetchData();
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: ELIMINAR
  // ─────────────────────────────────────────

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/convenios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar convenio');
      setShowDeleteConfirm(null);
      setSelectedConvenio(null);
      fetchData();
    } catch {
      alert('Error: No se pudo eliminar el convenio. Podría tener relaciones de alumnos asociadas.');
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: ESTADOS
  // ─────────────────────────────────────────

  const advanceStatus = async (conv: ConvenioExtendido) => {
    const nextEstado = getNextConvenioEstado(conv.estado);
    if (nextEstado === conv.estado) return;
    await fetch(`/api/convenios/${conv.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ convenio: { ...conv, estado: nextEstado } }),
    });
    setSelectedConvenio({ ...conv, estado: nextEstado });
    fetchData();
  };

  const moveBackStatus = async (conv: ConvenioExtendido) => {
    const prevEstado = getPrevConvenioEstado(conv.estado);
    if (prevEstado === conv.estado) return;
    await fetch(`/api/convenios/${conv.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ convenio: { ...conv, estado: prevEstado } }),
    });
    setSelectedConvenio({ ...conv, estado: prevEstado });
    fetchData();
  };

  const updateFirma = async (conv: ConvenioExtendido, tipo: FirmaTipo) => {
    await fetch(`/api/convenios/${conv.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenio: { ...conv, tipoFirma: tipo } }),
    });
    setSelectedConvenio({ ...conv, tipoFirma: tipo });
    fetchData();
  };

  // ─────────────────────────────────────────
  //  DATOS DERIVADOS
  // ─────────────────────────────────────────

  const filteredAndSortedConvenios = convenios
    .filter(conv => {
      const q = listSearchTerm.toLowerCase();
      const matchesSearch = !listSearchTerm ||
        conv.empresaNombre.toLowerCase().includes(q) ||
        conv.numConvenio.toLowerCase().includes(q) ||
        (conv.centroNombre || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || conv.estado === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const cmp = sortBy === 'empresa'
        ? a.empresaNombre.localeCompare(b.empresaNombre)
        : a.estado.localeCompare(b.estado);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const filteredEmpresas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(searchTermEmpresa.toLowerCase())
  );

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Datos
    convenios, empresas, centros,
    filteredAndSortedConvenios, filteredEmpresas,
    // Listado UI
    selectedConvenio, setSelectedConvenio,
    showDeleteConfirm, setShowDeleteConfirm,
    listSearchTerm, setListSearchTerm,
    statusFilter, setStatusFilter,
    sortBy, setBy, sortOrder, setSortOrder,
    // Formulario UI
    showForm, setShowForm,
    isEditing,
    formData, setFormData,
    selectedEmpresa, setSelectedEmpresa,
    selectedCentro, setSelectedCentro,
    searchTermEmpresa, setSearchTermEmpresa,
    // Handlers
    handleOpenNew, handleEdit, handleSubmit, handleDelete,
    advanceStatus, moveBackStatus, updateFirma,
  };
}
