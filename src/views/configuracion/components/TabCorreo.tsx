import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Settings, Send, Loader2, Eye, EyeOff, Trash2, Square, CheckSquare, FileText, ClipboardCheck, Play, CheckCircle, User, Building2, Handshake, MoreHorizontal, Plus, Pencil, X, Save, PencilRuler, Users, Phone } from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Contacto, GrupoContacto, GrupoMiembroResolved } from '../../../types/email.ts';
import { useEditor, EditorContent, EditorContext } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Selection } from '@tiptap/extensions';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button';
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover';
import { LinkPopover } from '@/components/tiptap-ui/link-popover';
import { TableDropdownMenu } from '@/components/tiptap-ui/table-dropdown-menu';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/table-node/table-node.scss';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_email: string;
  smtp_secure: boolean;
  send_delay_ms: number;
}

interface PlantillaEdit {
  id?: number;
  plantillaId: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  icon: string;
  color: string;
  recipientTarget: string;
  place: string;
  tipo: string;
  documents: string;
  grupo?: string;
}

interface MarcadorEdit {
  id?: number;
  nombre: string;
  valor: string;
  descripcion: string;
}

interface Props {
  emailConfig: EmailConfig;
  onChange: (config: EmailConfig) => void;
  saving: boolean;
  success: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  testing: boolean;
  testResult: { type: 'success' | 'error'; message: string } | null;
  onTest: () => void;
  profesorEmail: string;
  profesorNombre: string;
  profesorApellidos: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'file-text': FileText,
  'clipboard-check': ClipboardCheck,
  play: Play,
  'check-circle': CheckCircle,
  user: User,
  building: Building2,
  handshake: Handshake,
  'more-horizontal': MoreHorizontal,
  // Aliases for system template icons
  documento: FileText,
  plan: ClipboardCheck,
  inicio: Play,
  fin: CheckCircle,
  contacto: User,
  colaboracion: Handshake,
  seguimiento: FileText,
  valoracion: ClipboardCheck,
  carta: FileText,
  calendario: FileText,
  otros: MoreHorizontal,
};

const COLOR_MAP: Record<string, { border: string; bg: string; iconBg: string; iconText: string; btn: string }> = {
  blue: { border: 'border-blue-100', bg: 'bg-blue-50/50', iconBg: 'bg-blue-100', iconText: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50/50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  amber: { border: 'border-amber-100', bg: 'bg-amber-50/50', iconBg: 'bg-amber-100', iconText: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' },
  purple: { border: 'border-purple-100', bg: 'bg-purple-50/50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700' },
  slate: { border: 'border-slate-200', bg: 'bg-white', iconBg: 'bg-slate-100', iconText: 'text-slate-500', btn: 'bg-slate-600 hover:bg-slate-700' },
};

const ICON_OPTIONS = [
  { value: 'documento', label: 'Documento' },
  { value: 'plan', label: 'Plan' },
  { value: 'inicio', label: 'Inicio' },
  { value: 'fin', label: 'Fin' },
  { value: 'contacto', label: 'Contacto' },
  { value: 'colaboracion', label: 'Colaboración' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'valoracion', label: 'Valoración' },
  { value: 'carta', label: 'Carta' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'otros', label: 'Otros' },
];

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Azul' },
  { value: 'emerald', label: 'Verde' },
  { value: 'amber', label: 'Ámbar' },
  { value: 'purple', label: 'Púrpura' },
  { value: 'slate', label: 'Gris' },
];

function Modal({ open, onClose, children, maxWidth = 'md' }: { open: boolean; onClose?: () => void; children: React.ReactNode; maxWidth?: string }) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden ${maxWidth}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function TabCorreo({ emailConfig, onChange, saving, success, error, onSubmit, testing, testResult, onTest, profesorEmail, profesorNombre, profesorApellidos }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  // Template state
  const [plantillas, setPlantillas] = useState<PlantillaEdit[]>([]);
  const [filterPlace, setFilterPlace] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [editTemplate, setEditTemplate] = useState<PlantillaEdit | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'template' | 'marker' | 'contacto' | 'grupo'; id: number } | null>(null);

  // Marker state
  const [marcadores, setMarcadores] = useState<MarcadorEdit[]>([]);
  const [editMarker, setEditMarker] = useState<MarcadorEdit | null>(null);
  const [savingMarker, setSavingMarker] = useState(false);

  // Contact state
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [editContacto, setEditContacto] = useState<Contacto | null>(null);
  const [savingContacto, setSavingContacto] = useState(false);
  const [batchContactos, setBatchContactos] = useState('');
  const [showBatchContacto, setShowBatchContacto] = useState(false);

  // Group state
  const [grupos, setGrupos] = useState<GrupoContacto[]>([]);
  const [editGrupo, setEditGrupo] = useState<{ nombre: string; miembros: Array<{ tipoOrigen: string; origenId: number; label: string }> } | null>(null);
  const [editGrupoId, setEditGrupoId] = useState<number | null>(null);
  const [savingGrupo, setSavingGrupo] = useState(false);
  const [grupoSearchTerm, setGrupoSearchTerm] = useState('');
  const [grupoSearchSource, setGrupoSearchSource] = useState<'contacto' | 'empresa' | 'estudiante' | 'tutor'>('contacto');
  const [grupoSearchResults, setGrupoSearchResults] = useState<Array<{ tipoOrigen: string; origenId: number; label: string; email: string }>>([]);

  // Alert / Message modal
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const templateEditor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false },
      }),
      Underline,
      Placeholder.configure({ placeholder: 'Escribe el contenido de la plantilla aquí...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none focus:outline-none min-h-64 p-4',
      },
    },
  });

  const isSettingEditorContent = useRef(false);

  useEffect(() => {
    if (templateEditor && editTemplate) {
      isSettingEditorContent.current = true;
      templateEditor.commands.setContent(editTemplate.body || '<p></p>');
      queueMicrotask(() => { isSettingEditorContent.current = false; });
    }
  }, [templateEditor, editTemplate?.id, editTemplate?.plantillaId]);

  useEffect(() => {
    if (!templateEditor || !editTemplate || isSettingEditorContent.current) return;
    const handler = () => {
      setEditTemplate(prev => prev ? { ...prev, body: templateEditor.getHTML() } : prev);
    };
    templateEditor.on('update', handler);
    return () => { templateEditor.off('update', handler); };
  }, [templateEditor, editTemplate]);

  const markerEditor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false },
      }),
      Underline,
      Placeholder.configure({ placeholder: 'Escribe el contenido del marcador aquí...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none focus:outline-none min-h-64 p-4',
      },
    },
  });

  const isSettingMarkerContent = useRef(false);
  const [markerKey, setMarkerKey] = useState(0);

  useEffect(() => {
    if (markerEditor && editMarker) {
      isSettingMarkerContent.current = true;
      markerEditor.commands.setContent(editMarker.valor || '<p></p>');
      queueMicrotask(() => { isSettingMarkerContent.current = false; });
    }
  }, [markerEditor, markerKey]);

  useEffect(() => {
    if (!markerEditor || !editMarker || isSettingMarkerContent.current) return;
    const handler = () => {
      setEditMarker(prev => prev ? { ...prev, valor: markerEditor.getHTML() } : prev);
    };
    markerEditor.on('update', handler);
    return () => { markerEditor.off('update', handler); };
  }, [markerEditor, editMarker]);

  const fetchPlantillas = useCallback(async () => {
    try {
      const r = await fetch('/api/plantillas');
      if (r.ok) setPlantillas(await r.json());
    } catch {}
  }, []);

  const fetchMarcadores = useCallback(async () => {
    try {
      const r = await fetch('/api/marcadores-personalizados');
      if (r.ok) setMarcadores(await r.json());
    } catch {}
  }, []);

  const fetchContactos = useCallback(async () => {
    try {
      const r = await fetch('/api/contactos');
      if (r.ok) setContactos(await r.json());
    } catch {}
  }, []);

  const fetchGrupos = useCallback(async () => {
    try {
      const r = await fetch('/api/grupos-contactos');
      if (r.ok) setGrupos(await r.json());
    } catch {}
  }, []);

  useEffect(() => { fetchPlantillas(); fetchMarcadores(); fetchContactos(); fetchGrupos(); }, [fetchPlantillas, fetchMarcadores, fetchContactos, fetchGrupos]);

  const handleDelete = () => {
    onChange({
      ...emailConfig,
      smtp_user: '',
      smtp_pass: '',
      smtp_email: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value);
    const updated = {
      ...emailConfig,
      [name]: newValue,
    };
    if (name === 'smtp_user' && typeof newValue === 'string') {
      updated.smtp_email = newValue ? `${newValue}@educa.madrid.org` : '';
    }
    onChange(updated);
  };

  const handleNewTemplate = () => {
    setEditTemplate({
      plantillaId: crypto.randomUUID(),
      name: '',
      description: '',
      subject: '',
      body: '',
      icon: 'pencil-ruler',
      color: '#3B82F6',
      recipientTarget: 'to',
      place: 'empresa',
      tipo: 'personal',
      documents: '[]',
      grupo: 'varios-registros',
    });
  };

  const handleEditTemplate = (t: PlantillaEdit) => {
    setEditTemplate({ ...t });
  };

  const handleSaveTemplate = async () => {
    if (!editTemplate) return;
    setSavingTemplate(true);
    try {
      const isNew = !editTemplate.id;
      const url = isNew ? '/api/plantillas' : `/api/plantillas/${editTemplate.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const payload = { ...editTemplate, body: templateEditor?.getHTML() || editTemplate.body };
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al guardar');
      await fetchPlantillas();
      setEditTemplate(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const r = await fetch(`/api/plantillas/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al eliminar');
      await fetchPlantillas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleNewMarker = () => {
    setEditMarker({ nombre: '', valor: '', descripcion: '' });
    setMarkerKey(k => k + 1);
  };

  const handleEditMarker = (m: MarcadorEdit) => {
    setEditMarker({ ...m });
    setMarkerKey(k => k + 1);
  };

  const handleSaveMarker = async () => {
    if (!editMarker) return;
    setSavingMarker(true);
    try {
      const isNew = !editMarker.id;
      const url = isNew ? '/api/marcadores-personalizados' : `/api/marcadores-personalizados/${editMarker.id}`;
      const method = isNew ? 'POST' : 'PUT';
      let valor = markerEditor?.getHTML() || editMarker.valor;
      valor = valor.replace(/\s*class="[^"]*"/g, '').replace(/\s*style="[^"]*"/g, '');
      valor = valor.replace(/<br\s*\/?>\s*<\/p>/g, '</p>').replace(/<\/p>\s*<p>/g, '<br>').replace(/^<p>|<\/p>$/g, '');
      const payload = { ...editMarker, valor };
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al guardar');
      await fetchMarcadores();
      setEditMarker(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingMarker(false);
    }
  };

  const handleDeleteMarker = async (id: number) => {
    try {
      const r = await fetch(`/api/marcadores-personalizados/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al eliminar');
      await fetchMarcadores();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveContacto = async () => {
    if (!editContacto) return;
    setSavingContacto(true);
    try {
      const isNew = !editContacto.id;
      const url = isNew ? '/api/contactos' : `/api/contactos/${editContacto.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editContacto),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al guardar contacto');
      await fetchContactos();
      setEditContacto(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingContacto(false);
    }
  };

  const handleBatchContactos = async () => {
    if (!batchContactos.trim()) return;
    setSavingContacto(true);
    try {
      const r = await fetch('/api/contactos/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: batchContactos }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al importar contactos');
      const data = await r.json();
      await fetchContactos();
      setBatchContactos('');
      setShowBatchContacto(false);
      setMessage({ type: 'success', text: `${data.count} contactos importados correctamente.${data.skipped ? ` ${data.skipped} omitido(s) por duplicado.` : ''}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingContacto(false);
    }
  };

  const handleDeleteContacto = async (id: number) => {
    try {
      const r = await fetch(`/api/contactos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al eliminar contacto');
      await fetchContactos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveGrupo = async () => {
    if (!editGrupo) return;
    setSavingGrupo(true);
    try {
      const isNew = !editGrupoId;
      const miembros = editGrupo.miembros.map(m => ({ tipoOrigen: m.tipoOrigen, origenId: m.origenId }));
      const url = isNew ? '/api/grupos-contactos' : `/api/grupos-contactos/${editGrupoId}`;
      const method = isNew ? 'POST' : 'PUT';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editGrupo.nombre, miembros }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al guardar grupo');
      await fetchGrupos();
      setEditGrupo(null);
      setEditGrupoId(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingGrupo(false);
    }
  };

  const handleDeleteGrupo = async (id: number) => {
    try {
      const r = await fetch(`/api/grupos-contactos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error || 'Error al eliminar grupo');
      await fetchGrupos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const searchGrupoContacts = useCallback(async (term: string, source: string) => {
    if (!term || term.length < 1) { setGrupoSearchResults([]); return; }
    try {
      const r = await fetch(`/api/email-contacts`);
      const data = await r.json();
      const q = term.toLowerCase();
      let results: Array<{ tipoOrigen: string; origenId: number; label: string; email: string }> = [];
      if (source === 'contacto') {
        results = (data.contactos || [])
          .filter((c: any) => c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
          .map((c: any) => ({ tipoOrigen: 'contacto', origenId: c.id, label: `${c.nombre} <${c.email}>`, email: c.email }));
      } else if (source === 'empresa') {
        results = (data.empresas || [])
          .filter((e: any) => e.nombre.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
          .map((e: any) => ({ tipoOrigen: 'empresa', origenId: e.id, label: `${e.nombre} <${e.email}>`, email: e.email }));
      } else if (source === 'estudiante') {
        results = (data.alumnos || [])
          .filter((a: any) => a.nombre.toLowerCase().includes(q) || a.apellidos?.toLowerCase().includes(q) || a.emailEduca?.toLowerCase().includes(q) || a.emailPersonal?.toLowerCase().includes(q))
          .map((a: any) => {
            const email = a.emailEduca || a.emailPersonal || '';
            return { tipoOrigen: 'estudiante', origenId: a.id, label: `${a.nombre} ${a.apellidos || ''} <${email}>`, email };
          });
      } else if (source === 'tutor') {
        results = (data.tutores || [])
          .filter((t: any) => t.nombre.toLowerCase().includes(q) || t.apellidos?.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
          .map((t: any) => ({ tipoOrigen: 'tutor', origenId: t.id, label: `${t.nombre} ${t.apellidos || ''} - ${t.empresaNombre || ''} <${t.email}>`, email: t.email }));
      }
      // Filter out already added members
      const existingKeys = new Set((editGrupo?.miembros || []).map(m => `${m.tipoOrigen}-${m.origenId}`));
      results = results.filter(r => !existingKeys.has(`${r.tipoOrigen}-${r.origenId}`));
      setGrupoSearchResults(results);
    } catch {}
  }, [editGrupo?.miembros]);

  return (
    <div className="space-y-6">
      {/* Email Config Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Configuración de Correo</h3>
              <p className="text-sm text-slate-500">
                Credenciales necesarias para enviar notificaciones automáticas a alumnos y empresas.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
              Configuración de correo guardada correctamente.
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Servidor SMTP</label>
                <input type="text" name="smtp_host" value={emailConfig.smtp_host} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Puerto</label>
                <input type="number" name="smtp_port" value={emailConfig.smtp_port} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Usuario EducaMadrid</label>
                <input type="text" name="smtp_user" value={emailConfig.smtp_user} onChange={handleChange} placeholder="usuario de educamadrid sin el @educa.madrid.org" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="smtp_pass"
                    value={emailConfig.smtp_pass}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <input type="hidden" name="smtp_email" value={emailConfig.smtp_email} />
            {emailConfig.smtp_user ? (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">El FROM de los correos será:</p>
                <p className="text-sm font-semibold text-slate-800">
                  {profesorNombre && profesorApellidos ? `${profesorNombre} ${profesorApellidos}` : 'Nombre Apellidos'} &lt;{emailConfig.smtp_email}&gt;
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-xs text-amber-700 font-medium">Es necesario configurar el usuario de EducaMadrid</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => onChange({ ...emailConfig, smtp_secure: !emailConfig.smtp_secure })}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
            >
              {emailConfig.smtp_secure ? (
                <CheckSquare className="h-5 w-5 text-blue-500 shrink-0" />
              ) : (
                <Square className="h-5 w-5 text-slate-400 shrink-0" />
              )}
              <span className="text-sm text-slate-700">
                Usar conexión segura SSL/TLS (Puerto 465). Dejar desmarcado para STARTTLS (Puerto 587).
              </span>
            </button>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Envío masivo</h4>
              <div className="max-w-xs">
                <label className={labelClass}>Delay entre envíos (ms)</label>
                <input
                  type="number"
                  name="send_delay_ms"
                  value={emailConfig.send_delay_ms}
                  onChange={handleChange}
                  className={inputClass}
                  min={0}
                  step={100}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tiempo de espera entre cada correo en envíos masivos. Valor recomendado: 1500ms (1.5 segundos).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-800 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {saving ? 'Guardando...' : 'Guardar Configuración de Correo'}
                </span>
              </button>

              <button type="button" onClick={onTest} disabled={testing || !profesorEmail} className="px-6 py-2.5 bg-white text-sky-600 border border-sky-200 text-sm font-semibold rounded-xl hover:bg-sky-50 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {testing ? 'Enviando...' : 'Probar Configuración'}
                </span>
              </button>

              <button type="button" onClick={handleDelete} className="px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-auto">
                <span className="flex items-center justify-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </span>
              </button>
            </div>
          </form>

          {testResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm border flex items-center gap-2 ${
              testResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Plantillas Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Plantillas de correo</h3>
                <p className="text-sm text-slate-500">
                  Gestiona las plantillas de correo electrónico.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNewTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva plantilla
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              type="button"
              onClick={() => { setFilterPlace(''); setFilterGroup(''); setFilterTipo(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !filterPlace && !filterGroup ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {['empresa', 'relaciones', 'alumno'].map(place => (
              <button
                key={place}
                type="button"
                onClick={() => { setFilterPlace(filterPlace === place ? '' : place); setFilterGroup(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterPlace === place ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {place === 'empresa' ? 'Empresas' : place === 'relaciones' ? 'Relaciones' : 'Alumnos'}
              </button>
            ))}
            {filterPlace === 'relaciones' && <span className="mx-1 text-slate-300">|</span>}
            {filterPlace === 'relaciones' && ['varios-registros', 'registro-individual'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setFilterGroup(filterGroup === g ? '' : g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterGroup === g ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g === 'varios-registros' ? 'Varios registros' : 'Registro individual'}
              </button>
            ))}
            <span className="mx-1 text-slate-300">|</span>
            {['sistema', 'personal'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTipo(filterTipo === t ? '' : t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTipo === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'sistema' ? 'Sistema' : 'Personales'}
              </button>
            ))}
          </div>

          {(() => {
            const filtered = plantillas.filter(p => {
              if (filterPlace && p.place !== filterPlace) return false;
              if (filterGroup && p.grupo !== filterGroup) return false;
              if (filterTipo && p.tipo !== filterTipo) return false;
              return true;
            });
            if (filtered.length === 0) return <p className="text-sm text-slate-400 text-center py-8">No hay plantillas para este ámbito.</p>;
            return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((p) => {
                const IconComponent = p.tipo === 'sistema' ? (ICON_MAP[p.icon] || FileText) : PencilRuler;
                const isHex = p.color?.startsWith('#');
                const c = isHex ? null : (COLOR_MAP[p.color] || COLOR_MAP.slate);
                const placeLabels: Record<string, string> = { empresa: 'Empresas', relaciones: 'Relaciones', alumno: 'Alumnos' };
                const groupLabels: Record<string, string> = { 'varios-registros': 'Varios registros', 'registro-individual': 'Registro individual' };
                const hexColor = isHex ? p.color : '#64748b';
                const cardStyle = isHex ? {
                  borderColor: hexColor + '40',
                  backgroundColor: hexColor + '08',
                } : {};
                const iconStyle = isHex ? {
                  backgroundColor: hexColor + '20',
                  color: hexColor,
                } : {};
                return (
                  <div
                    key={p.id ?? p.plantillaId}
                    className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all text-left relative group ${p.plantillaId === 'otros' ? 'cursor-default hover:border-slate-200 hover:bg-transparent' : ''} ${c?.border || 'border-slate-200'} ${c?.bg || ''}`}
                    style={Object.keys(cardStyle).length ? cardStyle : undefined}
                    onClick={() => p.plantillaId !== 'otros' && handleEditTemplate(p)}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${c?.iconBg || ''} ${c?.iconText || ''}`} style={Object.keys(iconStyle).length ? iconStyle : undefined}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{p.name}</p>
                        {p.tipo === 'sistema' ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">Sistema</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">Personal</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                          {p.plantillaId === 'otros' ? 'Todos' : (placeLabels[p.place] || p.place)}
                        </span>
                        {p.grupo && groupLabels[p.grupo] && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            p.grupo === 'varios-registros'
                              ? 'text-emerald-600 bg-emerald-50'
                              : 'text-blue-600 bg-blue-50'
                          }`}>
                            {groupLabels[p.grupo]}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.plantillaId !== 'otros' && (
                      <button
                        type="button"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleEditTemplate(p); }}
                      >
                        <Pencil className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                    {p.tipo !== 'sistema' && (
                      <button
                        type="button"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'template', id: p.id! }); }}
                      >
                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      </div>

      {/* Marcadores Personalizados Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Marcadores personalizados</h3>
                <p className="text-sm text-slate-500">
                  Gestiona los marcadores globales <code className="text-xs bg-slate-200 px-1 py-0.5 rounded">{'{{per_nombre}}'}</code> para reutilizar en todas las plantillas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNewMarker}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir marcador
            </button>
          </div>
        </div>
        <div className="p-6">
          {marcadores.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No hay marcadores personalizados.</p>
          ) : (
            <div className="space-y-3">
              {marcadores.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/30 group cursor-pointer hover:bg-slate-50 transition-all"
                  onClick={() => handleEditMarker(m)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{'{{per_' + m.nombre + '}}'}</code>
                      <p className="text-xs text-slate-400 truncate">{m.descripcion}</p>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 line-clamp-2 font-mono bg-white rounded p-2 border border-slate-100" dangerouslySetInnerHTML={{ __html: m.valor }} />
                  </div>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleEditMarker(m); }}
                  >
                    <Pencil className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                  {m.id && (
                    <button
                      type="button"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'marker', id: m.id! }); }}
                    >
                      <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contactos Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Contactos</h3>
                <p className="text-sm text-slate-500">
                  Gestiona tus contactos para usar en el autocompletado de correo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setBatchContactos(''); setShowBatchContacto(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Importar múltiples
              </button>
              <button
                type="button"
                onClick={() => setEditContacto({ id: 0, nombre: '', email: '', telefono: '' })}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nuevo contacto
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {contactos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No hay contactos.</p>
          ) : (
            <div className="space-y-3">
              {contactos.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/30 group cursor-pointer hover:bg-slate-50 transition-all"
                  onClick={() => setEditContacto({ ...c })}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{c.nombre}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-indigo-600">{c.email}</span>
                      {c.telefono && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.telefono}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setEditContacto({ ...c }); }}
                  >
                    <Pencil className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'contacto', id: c.id }); }}
                  >
                    <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grupos Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Grupos de contactos</h3>
                <p className="text-sm text-slate-500">
                  Crea grupos de contactos para agilizar el envío de correos a múltiples destinatarios.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setEditGrupo({ nombre: '', miembros: [] }); setEditGrupoId(null); setGrupoSearchResults([]); }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo grupo
            </button>
          </div>
        </div>
        <div className="p-6">
          {grupos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No hay grupos de contactos.</p>
          ) : (
            <div className="space-y-3">
              {grupos.map((g) => (
                <div
                  key={g.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/30 group cursor-pointer hover:bg-slate-50 transition-all"
                  onClick={() => {
                    setEditGrupo({
                      nombre: g.nombre,
                      miembros: (g.miembros || []).map(m => ({ tipoOrigen: m.tipoOrigen, origenId: m.origenId, label: `${m.nombre} <${m.email}>` }))
                    });
                    setEditGrupoId(g.id);
                    setGrupoSearchResults([]);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{g.nombre}</p>
                      <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                        {(g.miembros || []).length} miembros
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(g.miembros || []).slice(0, 5).map((m, i) => (
                        <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-40">
                          {m.nombre}
                        </span>
                      ))}
                      {(g.miembros || []).length > 5 && (
                        <span className="text-[10px] text-slate-400">+{g.miembros.length - 5} más</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditGrupo({
                        nombre: g.nombre,
                        miembros: (g.miembros || []).map(m => ({ tipoOrigen: m.tipoOrigen, origenId: m.origenId, label: `${m.nombre} <${m.email}>` }))
                      });
                      setEditGrupoId(g.id);
                      setGrupoSearchResults([]);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'grupo', id: g.id }); }}
                  >
                    <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Edit Modal */}
      <Modal open={!!editTemplate} onClose={() => setEditTemplate(null)} maxWidth="max-w-5xl">
        {editTemplate && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editTemplate.id ? 'Editar plantilla' : 'Nueva plantilla personal'}
              </h3>
              <button type="button" onClick={() => setEditTemplate(null)} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input type="text" value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Descripción</label>
                  <input type="text" value={editTemplate.description} onChange={e => setEditTemplate({ ...editTemplate, description: e.target.value })} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Asunto</label>
                  <input type="text" value={editTemplate.subject} onChange={e => setEditTemplate({ ...editTemplate, subject: e.target.value })} className={inputClass} />
                </div>
              </div>

              {editTemplate.tipo !== 'sistema' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Icono</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: editTemplate.color + '20', color: editTemplate.color }}>
                      <PencilRuler className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-600">Personalizada</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editTemplate.color?.startsWith('#') ? editTemplate.color : '#3B82F6'}
                      onChange={e => setEditTemplate({ ...editTemplate, color: e.target.value })}
                      className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
                    />
                    <span className="text-xs text-slate-500">{editTemplate.color?.startsWith('#') ? editTemplate.color : 'Personalizado'}</span>
                  </div>
                </div>
              </div>
              )}

              {editTemplate.tipo !== 'sistema' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <CustomSelect
                    label="Destinatario por defecto"
                    options={[
                      { id: 'to', label: 'Para' },
                      { id: 'cc', label: 'CC' },
                      { id: 'bcc', label: 'CCO' },
                    ]}
                    value={editTemplate.recipientTarget}
                    onChange={v => setEditTemplate({ ...editTemplate, recipientTarget: v as string })}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Ámbito"
                    options={[
                      { id: 'empresa', label: 'Empresa' },
                      { id: 'relaciones', label: 'Relaciones' },
                      { id: 'alumno', label: 'Alumno' },
                    ]}
                    value={editTemplate.place}
                    onChange={v => setEditTemplate({ ...editTemplate, place: v as string })}
                  />
                </div>
              </div>
              )}

              <div>
                <label className={labelClass}>Cuerpo</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden editor-body">
                  <style>{`.editor-body .ProseMirror p { margin-bottom: 1.25em; } .editor-body .ProseMirror ul { margin-bottom: 1.25em; }`}</style>
                  <EditorContext.Provider value={{ editor: templateEditor }}>
                    <Toolbar variant="fixed">
                      <Spacer />
                      <ToolbarGroup>
                        <UndoRedoButton action="undo" />
                        <UndoRedoButton action="redo" />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <HeadingDropdownMenu modal={false} levels={[1, 2, 3]} />
                        <ListDropdownMenu modal={false} types={['bulletList', 'orderedList']} />
                        <BlockquoteButton />
                        <CodeBlockButton />
                        <TableDropdownMenu editor={templateEditor} />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <MarkButton type="bold" />
                        <MarkButton type="italic" />
                        <MarkButton type="underline" />
                        <MarkButton type="strike" />
                        <MarkButton type="code" />
                        <ColorHighlightPopover />
                        <LinkPopover />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <MarkButton type="superscript" />
                        <MarkButton type="subscript" />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <TextAlignButton align="left" />
                        <TextAlignButton align="center" />
                        <TextAlignButton align="right" />
                        <TextAlignButton align="justify" />
                      </ToolbarGroup>
                      <Spacer />
                    </Toolbar>
                    <EditorContent editor={templateEditor} />
                  </EditorContext.Provider>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['{{nombreEmpresa}}','{{profesor}}','{{centro}}','{{curso.descripcion}}','{{@contacto}}','{{@nombreEmpresa}}','{{per_...}}'].map(m => (
                    <code
                      key={m}
                      className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200"
                      onClick={() => templateEditor?.chain().focus().insertContent(m).run()}
                    >
                      {m}
                    </code>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <div>
                {editTemplate.id && editTemplate.tipo !== 'sistema' && (
                  <button
                    type="button"
                    onClick={() => { setEditTemplate(null); setDeleteConfirm({ type: 'template', id: editTemplate.id! }); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditTemplate(null)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !editTemplate.name}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingTemplate ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Marker Edit Modal */}
      <Modal open={!!editMarker} onClose={() => setEditMarker(null)} maxWidth="max-w-3xl">
        {editMarker && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editMarker.id ? 'Editar marcador personalizado' : 'Nuevo marcador personalizado'}
              </h3>
              <button type="button" onClick={() => setEditMarker(null)} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className={labelClass}>Nombre del marcador</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-purple-600 bg-purple-50 px-1.5 py-1 rounded">{'{{per_'}</code>
                  <input
                    type="text"
                    value={editMarker.nombre}
                    onChange={e => setEditMarker({ ...editMarker, nombre: e.target.value })}
                    className={inputClass}
                    placeholder="ej: nombre_centro"
                    required
                  />
                  <code className="text-xs text-purple-600 bg-purple-50 px-1.5 py-1 rounded">{'}}'}</code>
                </div>
              </div>
              <div>
                <label className={labelClass}>Valor (HTML)</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden editor-body">
                  <style>{`.editor-body .ProseMirror p { margin-bottom: 1.25em; } .editor-body .ProseMirror ul { margin-bottom: 1.25em; }`}</style>
                  <EditorContext.Provider value={{ editor: markerEditor }}>
                    <Toolbar variant="fixed">
                      <Spacer />
                      <ToolbarGroup>
                        <UndoRedoButton action="undo" />
                        <UndoRedoButton action="redo" />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <HeadingDropdownMenu modal={false} levels={[1, 2, 3]} />
                        <ListDropdownMenu modal={false} types={['bulletList', 'orderedList']} />
                        <BlockquoteButton />
                        <CodeBlockButton />
                        <TableDropdownMenu editor={markerEditor} />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <MarkButton type="bold" />
                        <MarkButton type="italic" />
                        <MarkButton type="underline" />
                        <MarkButton type="strike" />
                        <MarkButton type="code" />
                        <ColorHighlightPopover />
                        <LinkPopover />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <MarkButton type="superscript" />
                        <MarkButton type="subscript" />
                      </ToolbarGroup>
                      <ToolbarSeparator />
                      <ToolbarGroup>
                        <TextAlignButton align="left" />
                        <TextAlignButton align="center" />
                        <TextAlignButton align="right" />
                        <TextAlignButton align="justify" />
                      </ToolbarGroup>
                      <Spacer />
                    </Toolbar>
                    <EditorContent editor={markerEditor} />
                  </EditorContext.Provider>
                </div>
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <input
                  type="text"
                  value={editMarker.descripcion}
                  onChange={e => setEditMarker({ ...editMarker, descripcion: e.target.value })}
                  className={inputClass}
                  placeholder="ej: Nombre completo del centro educativo"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <div>
                {editMarker.id && (
                  <button
                    type="button"
                    onClick={() => { setEditMarker(null); setDeleteConfirm({ type: 'marker', id: editMarker.id! }); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditMarker(null)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMarker}
                  disabled={savingMarker || !editMarker.nombre}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {savingMarker ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingMarker ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Contact Edit Modal */}
      <Modal open={!!editContacto} onClose={() => setEditContacto(null)} maxWidth="max-w-md">
        {editContacto && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editContacto.id ? 'Editar contacto' : 'Nuevo contacto'}
              </h3>
              <button type="button" onClick={() => setEditContacto(null)} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input
                  type="text"
                  value={editContacto.nombre}
                  onChange={e => setEditContacto({ ...editContacto, nombre: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={editContacto.email}
                  onChange={e => setEditContacto({ ...editContacto, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  type="text"
                  value={editContacto.telefono}
                  onChange={e => setEditContacto({ ...editContacto, telefono: e.target.value })}
                  className={inputClass}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <div>
                {editContacto.id && (
                  <button
                    type="button"
                    onClick={() => { const id = editContacto.id; setEditContacto(null); setDeleteConfirm({ type: 'contacto', id }); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditContacto(null)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveContacto}
                  disabled={savingContacto || !editContacto.nombre || !editContacto.email}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {savingContacto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingContacto ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Group Edit Modal */}
      <Modal open={!!editGrupo} onClose={() => { setEditGrupo(null); setEditGrupoId(null); setGrupoSearchResults([]); }} maxWidth="max-w-2xl">
        {editGrupo && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editGrupoId ? 'Editar grupo' : 'Nuevo grupo'}
              </h3>
              <button type="button" onClick={() => { setEditGrupo(null); setEditGrupoId(null); setGrupoSearchResults([]); }} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto max-h-96">
              <div>
                <label className={labelClass}>Nombre del grupo</label>
                <input
                  type="text"
                  value={editGrupo.nombre}
                  onChange={e => setEditGrupo({ ...editGrupo, nombre: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              {/* Member search */}
              <div>
                <label className={labelClass}>Añadir miembros</label>
                <div className="flex items-center gap-2 mb-3">
                  {(['contacto', 'empresa', 'estudiante', 'tutor'] as const).map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => { setGrupoSearchSource(src); setGrupoSearchTerm(''); setGrupoSearchResults([]); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        grupoSearchSource === src
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {src === 'contacto' ? 'Contactos' : src === 'empresa' ? 'Empresas' : src === 'estudiante' ? 'Estudiantes' : 'Tutores'}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={grupoSearchTerm}
                  onChange={e => { setGrupoSearchTerm(e.target.value); searchGrupoContacts(e.target.value, grupoSearchSource); }}
                  placeholder="Buscar..."
                  className={inputClass}
                />
                {grupoSearchResults.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {grupoSearchResults.map((r, i) => (
                      <button
                        key={`${r.tipoOrigen}-${r.origenId}`}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs border-b border-slate-50 last:border-0 hover:bg-slate-50 flex items-center justify-between"
                        onClick={() => {
                          setEditGrupo({
                            ...editGrupo,
                            miembros: [...editGrupo.miembros, { tipoOrigen: r.tipoOrigen, origenId: r.origenId, label: r.label }]
                          });
                          setGrupoSearchTerm('');
                          setGrupoSearchResults([]);
                        }}
                      >
                        <span>{r.label}</span>
                        <Plus className="h-3 w-3 text-rose-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Current members */}
              <div>
                <label className={labelClass}>Miembros ({editGrupo.miembros.length})</label>
                {editGrupo.miembros.length === 0 ? (
                  <p className="text-xs text-slate-400">Aún no hay miembros. Busca y añade contactos arriba.</p>
                ) : (
                  <div className="space-y-2">
                    {editGrupo.miembros.map((m, i) => (
                      <div key={`${m.tipoOrigen}-${m.origenId}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-200 px-1 py-0.5 rounded">
                            {m.tipoOrigen === 'contacto' ? 'Contacto' : m.tipoOrigen === 'empresa' ? 'Empresa' : m.tipoOrigen === 'estudiante' ? 'Estudiante' : 'Tutor'}
                          </span>
                          <span className="text-xs text-slate-700">{m.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nuevos = editGrupo.miembros.filter((_, idx) => idx !== i);
                            setEditGrupo({ ...editGrupo, miembros: nuevos });
                          }}
                          className="p-1 rounded hover:bg-slate-200 transition-colors"
                        >
                          <X className="h-3 w-3 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <div>
                {editGrupoId && (
                  <button
                    type="button"
                    onClick={() => { const id = editGrupoId; setEditGrupo(null); setEditGrupoId(null); setDeleteConfirm({ type: 'grupo', id }); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setEditGrupo(null); setEditGrupoId(null); setGrupoSearchResults([]); }} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrupo}
                  disabled={savingGrupo || !editGrupo.nombre || editGrupo.miembros.length < 2}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  {savingGrupo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingGrupo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Batch Import Contactos Modal */}
      <Modal open={showBatchContacto} onClose={() => { setShowBatchContacto(false); setBatchContactos(''); }} maxWidth="max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Importar múltiples contactos</h3>
          <button type="button" onClick={() => { setShowBatchContacto(false); setBatchContactos(''); }} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className={labelClass}>Introduce los contactos</label>
            <p className="text-xs text-slate-500 mb-2">
              Formato: <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">Nombre Apellidos &lt;email&gt;</code>, separados por coma.
            </p>
            <textarea
              value={batchContactos}
              onChange={e => setBatchContactos(e.target.value)}
              className="w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans min-h-32 resize-y"
              placeholder="Juan Pérez <juan@ejemplo.com>, María López <maria@ejemplo.com>, ..."
              rows={6}
            />
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
            <strong>Ejemplo:</strong><br />
            <code className="text-[10px]">Juan Pérez &lt;juan.perez@email.com&gt;, Ana García &lt;ana.garcia@email.com&gt;, Carlos Rodríguez &lt;carlos@email.com&gt;</code>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button type="button" onClick={() => { setShowBatchContacto(false); setBatchContactos(''); }} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleBatchContactos}
            disabled={savingContacto || !batchContactos.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {savingContacto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingContacto ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="max-w-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Confirmar eliminación</h3>
              <p className="text-sm text-slate-500">
                {deleteConfirm?.type === 'template'
                  ? '¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer.'
                  : deleteConfirm?.type === 'marker'
                    ? '¿Estás seguro de que deseas eliminar este marcador personalizado? Esta acción no se puede deshacer.'
                    : deleteConfirm?.type === 'grupo'
                      ? '¿Estás seguro de que deseas eliminar este grupo? Los contactos en el grupo no se eliminarán, solo el grupo.'
                      : '¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer.'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === 'template') await handleDeleteTemplate(deleteConfirm.id);
                else if (deleteConfirm.type === 'marker') await handleDeleteMarker(deleteConfirm.id);
                else if (deleteConfirm.type === 'grupo') await handleDeleteGrupo(deleteConfirm.id);
                else await handleDeleteContacto(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* Alert / Message Modal */}
      <Modal open={!!message} onClose={() => setMessage(null)} maxWidth="max-w-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${message?.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {message?.type === 'error' ? <X className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {message?.type === 'error' ? 'Error' : 'Operación completada'}
              </h3>
              <p className="text-sm text-slate-500">{message?.text}</p>
            </div>
          </div>
          <div className="flex items-center justify-end mt-6">
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
