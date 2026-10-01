import {useEffect, useMemo, useState} from 'react';
import {CentroEducativo, Convenio, ConvenioEstado, Curso, Empresa, FirmaTipo, Profesor} from '../../../types/index.ts';
import type {EmailAttachment} from '../../../types/email.ts';
import {getNextConvenioEstado, getPrevConvenioEstado} from '../utils/conveniosUtils.ts';
import {adjuntoDesdeGestor, type TipoDocCorreo} from '../../../utils/emailAdjuntos.ts';
import {interpolarCuerpo, applyCustomMarkers} from '../../../../templates/emails/emailTemplates.ts';
import {mostrarToast} from '../../../utils/toast.ts';

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

/**
 * Plantilla de sistema que usa el botón de correo del convenio. Vive en
 * Configuración > Correos con ámbito `convenio`, así que el profesor la edita
 * allí y aquí solo se carga.
 */
const PLANTILLA_CONVENIO = 'convenio';

/**
 * Número de convenio por defecto: `C-` + código del centro + `-`.
 *
 * El guion del final se deja puesto a propósito. Es lo que separa el código de
 * centro del ordinal del convenio, y es justo el hueco que el profesor
 * rellena; si el campo naciera vacío no sabría hasta dónde llegaba el código.
 */
function numConvenioPorDefecto(centros: CentroEducativo[], centroId: number | null): string {
  if (!centroId) return '';
  const codigo = centros.find(c => c.id === centroId)?.codigoCentro?.trim();
  return codigo ? `C-${codigo}-` : '';
}

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useConvenios(cursoId: number, centroId?: number) {

  // ── Datos ──
  const [convenios, setConvenios] = useState<ConvenioExtendido[]>([]);
  const [empresas,  setEmpresas]  = useState<Empresa[]>([]);
  const [centros,   setCentros]   = useState<CentroEducativo[]>([]);
  const [curso,     setCurso]     = useState<Curso | null>(null);
  const [profesor,  setProfesor]  = useState<Profesor | null>(null);
  const [conveniosUrl, setConveniosUrl] = useState('');

  // ── UI listado ──
  const [selectedConvenio,  setSelectedConvenio]  = useState<ConvenioExtendido | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [listSearchTerm,    setListSearchTerm]    = useState('');
  const [statusFilter,      setStatusFilter]      = useState<string>('all');
  const [sortBy,            setBy]                = useState<SortField>('empresa');
  const [sortOrder,         setSortOrder]         = useState<SortOrder>('asc');

  // ── Gestor Documental ──
  const [showDocManager, setShowDocManager] = useState(false);
  const [docManagerTarget, setDocManagerTarget] = useState<ConvenioExtendido | null>(null);

  const handleOpenDocManager = (conv: ConvenioExtendido) => {
    setDocManagerTarget(conv);
    setShowDocManager(true);
  };
  const handleCloseDocManager = () => {
    setShowDocManager(false);
    setDocManagerTarget(null);
  };

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
    const [convRes, emRes, ceRes, curRes, profRes] = await Promise.all([
      fetch(`/api/convenios?${convParams}`),
      fetch('/api/empresas'),
      fetch('/api/centros'),
      fetch('/api/cursos'),
      fetch('/api/profesor'),
    ]);
    const conveniosData = await convRes.json();
    setConvenios(Array.isArray(conveniosData) ? conveniosData : []);
    setEmpresas(await emRes.json());

    const centrosData: CentroEducativo[] = await ceRes.json();
    setCentros(centrosData);

    // El curso y el profesor solo hacen falta para las plantillas de correo,
    // pero se piden con el resto: los necesita todo convenio abierto.
    const cursosData: Curso[] = curRes.ok ? await curRes.json() : [];
    setCurso(cursosData.find(c => c.id === cursoId) ?? null);
    setProfesor(profRes.ok ? await profRes.json() : null);

    if (!isEditing && centrosData.length > 0 && !selectedCentro) {
      setSelectedCentro(centrosData[0].id!);
    }
  };

  // Cargar configuración de convenios (URL externa)
  useEffect(() => {
    fetch('/api/profesor/config/convenios')
      .then(r => r.json())
      .then(data => setConveniosUrl(data.url || ''))
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────────
  //  HANDLERS: FORMULARIO
  // ─────────────────────────────────────────

  const handleOpenNew = () => {
    setIsEditing(false);
    setEditingId(null);
    setSelectedEmpresa(null);
    const centroInicial = centros.length > 0 ? centros[0].id! : null;
    setSelectedCentro(centroInicial);
    setSearchTermEmpresa('');
    setFormData({
      numConvenio: numConvenioPorDefecto(centros, centroInicial),
      fechaConvenio: new Date().toISOString().split('T')[0],
      isActive: false,
    });
    setShowForm(true);
  };

  /**
   * Cambiar de centro rehace el número por defecto, pero solo mientras el
   * profesor no lo haya tocado. En una edición el número es el que ya tiene el
   * convenio: reformatearlo al cambiar de centro convertiría una corrección en
   * un borrado del dato guardado.
   */
  const handleCentroChange = (id: number) => {
    setSelectedCentro(id);
    const intacto = formData.numConvenio === numConvenioPorDefecto(centros, selectedCentro);
    if (intacto || !formData.numConvenio.trim()) {
      setFormData(prev => ({ ...prev, numConvenio: numConvenioPorDefecto(centros, id) }));
    }
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
    if (!selectedEmpresa) return;

    const convenio: Convenio = {
      numConvenio:   formData.numConvenio,
      fechaConvenio: formData.fechaConvenio,
      estado:        formData.isActive
        ? ConvenioEstado.COMPLETADO
        : (selectedConvenio?.estado || ConvenioEstado.PENDIENTE_ENVIAR),
      empresaId: selectedEmpresa,
      cursoId,
      centroId:  selectedCentro ?? undefined,
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
  //  EMAIL
  // ─────────────────────────────────────────

  const [emailTarget, setEmailTarget]             = useState<ConvenioExtendido | null>(null);
  const [emailTo, setEmailTo]                   = useState<string[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [emailSubject, setEmailSubject]         = useState('');
  const [emailBody, setEmailBody]                 = useState('');
  const [emailPerRecipient, setEmailPerRecipient] = useState<Record<string, Record<string, string>>>({});
  const [emailMarcadoresVacios, setEmailMarcadoresVacios] = useState<string[]>([]);

  /**
   * Abre el correo del convenio a la empresa, con la plantilla de Configuración.
   *
   * El aviso de marcadores vacíos y los `{{@...}}` por destinatario se rellenan
   * aquí igual que en el resto de ámbitos: si no, el correo sale con huecos y
   * el profesor no se entera de por qué.
   *
   * Los adjuntos son los que diga la plantilla, y de ninguno se genera nada: lo
   * que hay es el documento del convenio que el profesor haya subido a su gestor
   * documental. Si no ha subido ninguno, el correo se abre sin adjuntos, que es
   * preferible a mandar un documento que no ha revisado nadie.
   */
  const handleEmailConvenio = async (conv: ConvenioExtendido) => {
    const empresa = empresas.find(e => e.id === conv.empresaId);

    // Sin correo no hay a quién enviarlo. Se avisa en vez de abrir el modal vacío,
    // que parece un fallo del botón y no del dato que falta.
    if (!empresa?.email) {
      mostrarToast('La empresa de este convenio no tiene email.', 'error');
      return;
    }

    const res = await fetch(`/api/plantillas/by-plantilla-id/${PLANTILLA_CONVENIO}`);
    if (!res.ok) {
      console.error('No se pudo cargar la plantilla de convenio:', res.status);
      mostrarToast('No se pudo cargar la plantilla de correo.', 'error');
      return;
    }
    const cfg = await res.json();

    const marcadoresRes = await fetch('/api/marcadores-personalizados');
    const marcadores = marcadoresRes.ok ? await marcadoresRes.json() : [];

    const nombreEmpresa = conv.empresaNombre || empresa.nombre || '';
    const contacto = empresa.personaContacto || `persona de contacto de ${nombreEmpresa}`;

    const context: Record<string, any> = {
      profesor: profesor ? { nombre: profesor.nombre, apellidos: profesor.apellidos } : null,
      empresa:  { nombre: nombreEmpresa, direccion: empresa.direccion || '', personaContacto: contacto },
      // El centro y el curso son los del convenio, no los de la vista: el
      // convenio es el que se está comunicando, y es lo único que la empresa
      // va a contrastar con su documentación.
      centro: conv.centroNombre ? { nombre: conv.centroNombre } : null,
      curso: curso ? { descripcion: curso.descripcion } : null,
      convenio: { numConvenio: conv.numConvenio || '', fechaConvenio: conv.fechaConvenio || '' },
    };

    const cuerpo = applyCustomMarkers(cfg.body, marcadores);
    const { texto, sinResolver } = interpolarCuerpo(cuerpo, context);

    // El asunto también lleva marcadores, y antes se enviaba en crudo: la
    // interpolación solo se aplicaba al cuerpo. Al correo lo lee la empresa, y
    // un `{{convenio.numConvenio}}` en la línea de asunto no es un marcador
    // pendiente, es un fallo. Los personalizados tampoco se sustituyen aquí:
    // el asunto es texto plano y no lleva el HTML del editor.
    const asunto = applyCustomMarkers(cfg.subject || '', marcadores);
    const { texto: asuntoResuelto, sinResolver: sinResolverAsunto } = interpolarCuerpo(asunto, context);

    // Cada documento de la plantilla se busca en el gestor documental con el
    // convenio como destino. Los que no encajan con este ámbito (una relación,
    // un plan formativo) no tienen destino aquí y salen sin adjunto, sin hace
    // falta mirar la lista uno a uno.
    const adjuntos: EmailAttachment[] = [];
    for (const doc of JSON.parse(cfg.documents || '[]') as TipoDocCorreo[]) {
      const adjunto = await adjuntoDesdeGestor(doc, { convenioId: conv.id });
      if (adjunto) adjuntos.push(adjunto);
    }

    setEmailSubject(asuntoResuelto);
    setEmailBody(texto);
    setEmailTo([empresa.email!]);
    setEmailAttachments(adjuntos);
    setEmailPerRecipient({ [empresa.email!]: { nombreEmpresa, contacto } });
    setEmailMarcadoresVacios([...new Set([...sinResolver, ...sinResolverAsunto])]);
    setEmailTarget(conv);
  };

  const handleCloseEmail = () => {
    setEmailTarget(null);
    setEmailTo([]);
    setEmailAttachments([]);
    setEmailSubject('');
    setEmailBody('');
    setEmailPerRecipient({});
    setEmailMarcadoresVacios([]);
  };

  // ─────────────────────────────────────────
  //  DATOS DERIVADOS
  // ─────────────────────────────────────────

  const filteredAndSortedConvenios = useMemo(() => convenios
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
    }), [convenios, listSearchTerm, statusFilter, sortBy, sortOrder]);

  const filteredEmpresas = useMemo(() => empresas.filter(e =>
    e.nombre.toLowerCase().includes(searchTermEmpresa.toLowerCase())
  ), [empresas, searchTermEmpresa]);

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Datos
    convenios, empresas, centros, curso, profesor,
    filteredAndSortedConvenios, filteredEmpresas,
    conveniosUrl,
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
    handleCentroChange,
    searchTermEmpresa, setSearchTermEmpresa,
    // Gestor Documental
    showDocManager, docManagerTarget,
    handleOpenDocManager, handleCloseDocManager,
    // Email
    emailTarget, emailTo, emailAttachments,
    emailSubject, emailBody, emailPerRecipient, emailMarcadoresVacios,
    handleEmailConvenio, handleCloseEmail,
    // Handlers
    handleOpenNew, handleEdit, handleSubmit, handleDelete,
    advanceStatus, moveBackStatus, updateFirma, fetchData,
  };
}
