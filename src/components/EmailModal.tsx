import React, {useEffect, useMemo, useRef, useState} from 'react';
import {EditorContent, EditorContext, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import {TaskItem, TaskList} from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {Image} from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import {Selection} from '@tiptap/extensions';
import {TextStyle, Color, FontSize} from '@tiptap/extension-text-style';
import {Table, TableCell, TableHeader, TableRow} from '@tiptap/extension-table';
import {HorizontalRule} from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/table-node/table-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import {
  AlertTriangle,
  Briefcase,
  Download,
  FileText,
  GraduationCap as StudentIcon,
  Info,
  Loader2,
  Paperclip,
  Send,
  Settings,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import {EmailAttachment, EmailSendRequest, GrupoContacto} from '../types/email.ts';
import {deleteAttachment, uploadAttachment} from '../utils/emailUtils.ts';
import {Title} from './Title.tsx';
import {mostrarToast} from '../utils/toast.ts';
import {Toolbar, ToolbarGroup, ToolbarSeparator} from '@/components/tiptap-ui-primitive/toolbar';
import {UndoRedoButton} from '@/components/tiptap-ui/undo-redo-button';
import {HeadingDropdownMenu} from '@/components/tiptap-ui/heading-dropdown-menu';
import {ListDropdownMenu} from '@/components/tiptap-ui/list-dropdown-menu';
import {BlockquoteButton} from '@/components/tiptap-ui/blockquote-button';
import {CodeBlockButton} from '@/components/tiptap-ui/code-block-button';
import {MarkButton} from '@/components/tiptap-ui/mark-button';
import {TextAlignButton} from '@/components/tiptap-ui/text-align-button';
import {ColorHighlightPopover} from '@/components/tiptap-ui/color-highlight-popover';
import {TextColorPopover} from '@/components/tiptap-ui/text-color-popover';
import {LinkPopover} from '@/components/tiptap-ui/link-popover';
import {TableDropdownMenu} from '@/components/tiptap-ui/table-dropdown-menu';
import {FontSizeDropdown} from '@/components/tiptap-ui/font-size-dropdown';
import {ClearFormattingButton} from '@/components/tiptap-ui/clear-formatting-button';
import {HorizontalRuleButton} from '@/components/tiptap-ui/horizontal-rule-button';
import {EmojiPicker} from '@/components/tiptap-ui/emoji-picker';
import {ImageInsertButton} from '@/components/tiptap-ui/image-insert-button';
import {WordCharacterCount} from '@/components/tiptap-ui/word-character-count';
import { useEmailHabilitado } from '../hooks/useEnvioEmail.ts';

interface EmailContact {
  id: number;
  nombre: string;
  apellidos?: string;
  email: string;
  emailEduca?: string;
  emailPersonal?: string;
  empresaNombre?: string;
  telefono?: string;
  type: 'empresa' | 'tutor' | 'alumno' | 'contacto';
  groupName?: string;
}

interface AutocompleteFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  contacts: EmailContact[];
  grupos?: GrupoContacto[];
  active: boolean;
  onFocus: () => void;
  onBlur: () => void;
  suggestedContacts?: EmailContact[];
  allEmails?: string[];
  blurTimerRef?: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

function EmailAutocompleteField({ value, onChange, placeholder, contacts, grupos = [], active, onFocus, onBlur, suggestedContacts = [], allEmails = [], blurTimerRef }: AutocompleteFieldProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const parts = value.split(',');
  const lastPart = parts.length > 0 ? parts[parts.length - 1].trim() : '';
  const cursorAtEnd = value.endsWith(lastPart);
  const searchTerm = cursorAtEnd ? lastPart.toLowerCase() : '';

  const filtered = searchTerm.length > 0 && !searchTerm.includes('@')
    ? contacts.filter(c => {
        const q = searchTerm;
        return c.nombre.toLowerCase().includes(q)
          || (c.apellidos && c.apellidos.toLowerCase().includes(q))
          || c.email.toLowerCase().includes(q)
          || (c.emailEduca && c.emailEduca.toLowerCase().includes(q))
          || (c.emailPersonal && c.emailPersonal.toLowerCase().includes(q))
          || (c.telefono && c.telefono.includes(q))
          || (c.groupName && c.groupName.toLowerCase().includes(q));
      }).slice(0, 20)
    : [];

  const getContactEmail = (c: EmailContact): string =>
    c.type === 'alumno' ? (c.emailEduca || c.emailPersonal || '') : c.email;

  interface SuggestionItem {
    contact: EmailContact;
    email: string;
    label: string;
  }

  interface GroupSuggestion {
    type: 'grupo';
    grupo: GrupoContacto;
    label: string;
  }

  type SuggestionEntry = SuggestionItem | GroupSuggestion;

  const availableSuggestions: SuggestionItem[] = suggestedContacts.flatMap(c => {
    if (c.type === 'alumno') {
      const items: SuggestionItem[] = [];
      if (c.emailEduca && !allEmails.includes(c.emailEduca))
        items.push({ contact: c, email: c.emailEduca, label: `${c.nombre} ${c.apellidos || ''} <${c.emailEduca}>` });
      if (c.emailPersonal && !allEmails.includes(c.emailPersonal))
        items.push({ contact: c, email: c.emailPersonal, label: `${c.nombre} ${c.apellidos || ''} <${c.emailPersonal}>` });
      return items;
    }
    const email = c.email;
    return email && !allEmails.includes(email)
      ? [{ contact: c, email, label: `${c.apellidos ? `${c.nombre} ${c.apellidos}` : c.nombre}${c.type === 'tutor' && c.empresaNombre ? ` - ${c.empresaNombre}` : ''} <${email}>` }]
      : [];
  });

  const groupSuggestions: GroupSuggestion[] = grupos
    .filter(g => g.miembros.some(m => m.email && !allEmails.includes(m.email)))
    .map(g => ({
      type: 'grupo' as const,
      grupo: g,
      label: `${g.nombre} (${g.miembros.filter(m => m.email).length})`
    }));

  const showSuggestions = active && !searchTerm && (availableSuggestions.length > 0 || groupSuggestions.length > 0);
  const show = active && filtered.length > 0;
  const dropdownItems = showSuggestions ? [...availableSuggestions, ...groupSuggestions] as SuggestionEntry[] : filtered;

  useEffect(() => { setHighlightedIndex(-1); }, [filtered.length, availableSuggestions.length, groupSuggestions.length]);

  const handleSelect = (contact: EmailContact) => {
    const email = getContactEmail(contact);
    if (!email) return;
    const prefix = parts.slice(0, -1).join(',');
    const newVal = prefix ? `${prefix}, ${email}, ` : `${email}, `;
    onChange(newVal);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (suggestion: SuggestionEntry) => {
    if ('type' in suggestion && suggestion.type === 'grupo') {
      const emails = suggestion.grupo.miembros.filter(m => m.email).map(m => m.email);
      const newVal = value ? `${value}, ${emails.join(', ')}, ` : `${emails.join(', ')}, `;
      onChange(newVal);
    } else {
      const s = suggestion as SuggestionItem;
      const newVal = value ? `${value}, ${s.email}, ` : `${s.email}, `;
      onChange(newVal);
    }
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!show && !showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, dropdownItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const item = dropdownItems[highlightedIndex];
      if (showSuggestions) {
        handleSelectSuggestion(item as unknown as SuggestionEntry);
      } else {
        handleSelect(item as unknown as EmailContact);
      }
      } else if (e.key === 'Escape') {
        // Se consume la tecla: sin esto seguiria hasta document y cerraria
        // el modal entero, perdiendo el correo a medio escribir.
        e.stopPropagation();
        setHighlightedIndex(-1);
        onBlur();
      }
  };

  const handleFocus = () => {
    if (blurTimerRef?.current) clearTimeout(blurTimerRef.current);
    onFocus();
  };

  const handleBlur = () => {
    blurTimerRef!.current = setTimeout(() => {
      setHighlightedIndex(-1);
      onBlur();
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (blurTimerRef?.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const contactIcon = (c: EmailContact) => {
    switch (c.type) {
      case 'empresa': return <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />;
      case 'tutor': return <User className="h-3.5 w-3.5 text-warning-strong shrink-0" />;
      case 'alumno': return <StudentIcon className="h-3.5 w-3.5 text-success shrink-0" />;
      case 'contacto': return <User className="h-3.5 w-3.5 text-primary shrink-0" />;
    }
  };

  const contactLabel = (c: EmailContact) => {
    const name = c.apellidos ? `${c.nombre} ${c.apellidos}` : c.nombre;
    const email = c.type === 'alumno' ? (c.emailEduca || c.emailPersonal) : c.email;
    const extra = c.type === 'tutor' && c.empresaNombre ? ` - ${c.empresaNombre}` : '';
    const groupTag = c.groupName ? ` [${c.groupName}]` : '';
    return `${name}${extra}${groupTag} <${email}>`;
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-surface-card border border-border-base rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
      />
      {showSuggestions && (
        <div className="absolute z-70 left-0 right-0 top-full mt-1 bg-surface-card border border-border-base rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-[9px] font-bold text-text-muted uppercase tracking-wider bg-surface-subtle border-b border-border-base">
            Sugerencias
          </div>
          {dropdownItems.map((item, i) => {
            const isGroup = 'type' in item && item.type === 'grupo';
            const s = item as (SuggestionItem | GroupSuggestion);
            return (
              <button
                key={isGroup ? `grp-${(s as GroupSuggestion).grupo.id}` : `sug-${(s as SuggestionItem).contact.type}-${(s as SuggestionItem).contact.id}-${(s as SuggestionItem).email}`}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-border-base last:border-0 ${
                  i === highlightedIndex ? 'bg-primary-light text-primary' : 'text-text-main hover:bg-surface-hover'
                }`}
              >
                {isGroup
                  ? <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                  : contactIcon((s as SuggestionItem).contact)}
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {show && !showSuggestions && (
        <div className="absolute z-70 left-0 right-0 top-full mt-1 bg-surface-card border border-border-base rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.map((c, i) => (
            <button
              key={`${c.type}-${c.id}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(c); }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-border-base last:border-0 ${
                i === highlightedIndex ? 'bg-primary-light text-primary' : 'text-text-main hover:bg-surface-hover'
              }`}
            >
              {contactIcon(c)}
              <span className="truncate">{contactLabel(c)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string[];
  initialBcc?: string[];
  initialAttachments?: EmailAttachment[];
  initialSubject?: string;
  initialBody?: string;
  perRecipientData?: Record<string, Record<string, string>>;
  /** Marcadores que la plantilla usaba y no se pudieron resolver. */
  marcadoresVacios?: string[];
  onGoToConfig?: () => void;
  contextualContactIds?: Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }>;
}

export function EmailModal({
  isOpen,
  onClose,
  initialTo = [],
  initialBcc = [],
  initialAttachments = [],
  initialSubject = '',
  initialBody = '',
  perRecipientData,
  marcadoresVacios = [],
  onGoToConfig,
  contextualContactIds = [],
}: EmailModalProps) {
  const emailHabilitado = useEmailHabilitado();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendIndividual, setSendIndividual] = useState(false);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [gruposContactos, setGruposContactos] = useState<GrupoContacto[]>([]);
  const [activeAutocomplete, setActiveAutocomplete] = useState<'to' | 'cc' | 'bcc' | null>(null);
  const [configOk, setConfigOk] = useState<boolean>(true);
  const [signature, setSignature] = useState<string>('');
  const signatureAppendedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Destinatarios sin datos de personalización. Van en la lista de avisos. */
  const [destinatariosSinDatos, setDestinatariosSinDatos] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      signatureAppendedRef.current = false;
      setSignature('');
      // El aviso se calcula al abrir. Sin limpiarlo, al cancelar un envío
      // individual a medias y abrir otro que sí tiene los datos, el modal
      // seguiría amenazando con un destinatario que ya no está en la lista.
setDestinatariosSinDatos([]);
      fetch('/api/profesor/config/correo')
        .then(res => res.json())
          .then(cfg => {
            setConfigOk(!!cfg.smtp_user);
            setSignature(cfg.firma_correo || '');
          })
        .catch(() => setConfigOk(false));
    }
  }, [isOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false },
      }),
      Underline,
      Placeholder.configure({ placeholder: 'Escribe el contenido del correo aquí...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      HorizontalRule,
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTo(initialTo.join(', '));
      setBcc(initialBcc.join(', '));
      setCc('');
      setSubject(initialSubject);
      setAttachments(initialAttachments);
      setError('');
      setSending(false);
      setSendIndividual(initialTo.length > 1 || hasGroupMarkers);
      const cleanBody = initialBody.replace(/<p[^>]*>\s*<br[^>]*>\s*<\/p>/gi, '');
      editor?.commands.setContent(cleanBody);
      editor?.chain().selectAll().setTextAlign('justify').setTextSelection(1).run();
    }
  }, [isOpen]);

  // Append signature once when loaded
  useEffect(() => {
    if (!signature || !editor || signatureAppendedRef.current) return;
    let bodyHtml = editor.getHTML().replace(/<br\s*class="ProseMirror-trailingBreak">/g, '');
    if (bodyHtml == "<p style=\"text-align: justify;\"></p>") {
      bodyHtml = "<p style=\"text-align: justify;\"><br></p>"
    }
    editor.commands.setContent(bodyHtml + signature);
    signatureAppendedRef.current = true;
  }, [signature, editor, isOpen]);

  /**
   * `{{@clave}}` que no tiene valor para algún destinatario.
   *
   * Es distinto de `destinatariosSinDatos`: ahí al destinatario no le hay
   * ficha y el envío se detiene. Aquí la tiene y lo que falta es un campo
   * concreto (`{{@contacto}}` en una empresa sin persona de contacto). El hueco
   * sale igual, así que no bloquea: lo que hace es nombrarlo, porque
   * "Estimado/a, " en un correo a la empresa se lee como descuido del profesor
   * cuando en realidad es un dato sin rellenar.
   */
  const marcadoresPorDestinatarioVacios = useMemo(() => {
    const usados = [...new Set(
      [...(editor?.getHTML() || '').matchAll(/\{\{@([\w.]+)\}\}/g)].map(m => m[1])
    )];
    if (!perRecipientData || usados.length === 0) return [];
    const huecos: Array<{ clave: string; correo: string }> = [];
    for (const correo of to.split(',').map(s => s.trim()).filter(Boolean)) {
      const data = perRecipientData[correo] || {};
      for (const clave of usados) {
        if (!data[clave]) huecos.push({ clave, correo });
      }
    }
    return huecos;
  }, [editor, to, perRecipientData]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      try {
        const attachment = await uploadAttachment(files[i], files[i].name);
        setAttachments(prev => [...prev, attachment]);
      } catch {
        setError('Error al subir el archivo adjunto');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Descarga en un .zip todos los adjuntos, tal y como se van a enviar.
  const [descargandoAdjuntos, setDescargandoAdjuntos] = useState(false);
  const handleDescargarAdjuntos = async () => {
    if (attachments.length === 0) return;
    setDescargandoAdjuntos(true);
    try {
      const res = await fetch('/api/email/adjuntos/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjuntos: attachments.map(a => ({ filename: a.filename, path: a.path })) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'adjuntos.zip';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      mostrarToast('No se pudieron descargar los adjuntos.', 'error');
    } finally {
      setDescargandoAdjuntos(false);
    }
  };

  const handleRemoveAttachment = async (attachment: EmailAttachment) => {
    try {
      await deleteAttachment(attachment.path);
    } catch {}
    setAttachments(prev => prev.filter(a => a.id !== attachment.id));
  };

  useEffect(() => {
    if (isOpen) {
      fetch('/api/email-contacts')
        .then(res => res.json())
        .then((data: { empresas: any[]; tutores: any[]; alumnos: any[]; contactos: any[]; grupos: any[] }) => {
          const all: EmailContact[] = [
            ...data.empresas.map(e => ({ ...e, type: 'empresa' as const, apellidos: undefined, emailEduca: undefined, emailPersonal: undefined })),
            ...data.tutores.map(t => ({ ...t, type: 'tutor' as const, emailEduca: undefined, emailPersonal: undefined })),
            ...data.alumnos.map(a => ({ ...a, type: 'alumno' as const, email: '' })),
            ...data.contactos.map(c => ({ ...c, type: 'contacto' as const, apellidos: undefined, emailEduca: undefined, emailPersonal: undefined, empresaNombre: undefined })),
          ];
          const seen = new Set<string>();
          const deduped: EmailContact[] = [];
          for (const c of all) {
            const key = c.type === 'alumno' ? (c.emailEduca || c.emailPersonal || '') : c.email;
            if (key && seen.has(key)) continue;
            if (key) seen.add(key);
            deduped.push(c);
          }
          for (const g of data.grupos || []) {
            for (const m of g.miembros || []) {
              const key = m.email;
              if (key && seen.has(key)) continue;
              if (key) seen.add(key);
              deduped.push({
                id: m.origenId,
                nombre: m.nombre,
                email: m.email,
                type: m.tipoOrigen === 'tutor' ? 'tutor' as const : m.tipoOrigen === 'estudiante' ? 'alumno' as const : m.tipoOrigen === 'contacto' ? 'contacto' as const : 'empresa' as const,
                groupName: g.nombre,
                apellidos: undefined,
                emailEduca: undefined,
                emailPersonal: undefined,
                empresaNombre: undefined,
              });
            }
          }
          setContacts(deduped);
          setGruposContactos(data.grupos || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const parseEmails = (str: string): string[] =>
    str.split(',').map(s => s.trim()).filter(s => s.includes('@'));

  const suggestedContacts = useMemo(() => {
    if (!contextualContactIds.length || !contacts.length) return [];
    return contextualContactIds
      .map(ctx => contacts.find(c => c.type === ctx.type && c.id === ctx.id))
      .filter((c): c is EmailContact => c !== undefined);
  }, [contextualContactIds, contacts]);

  const allEmails = useMemo(() => {
    return [...parseEmails(to), ...parseEmails(cc), ...parseEmails(bcc)];
  }, [to, cc, bcc]);

  const handleSend = async () => {
    setError('');
    setSending(true);

    const toList = parseEmails(to);
    const ccList = parseEmails(cc);
    const bccList = parseEmails(bcc);

    const allRecipients = [...toList, ...ccList, ...bccList];
    if (allRecipients.length === 0) {
      setError('Debes especificar al menos un destinatario');
      setSending(false);
      return;
    }

    const html = (editor?.getHTML() || '').replace(/<p[^>]*>\s*<br[^>]*>\s*<\/p>/gi, '');

    if (html.includes('{{destinatario}}') && toList.length > 1) {
      setError('La plantilla contiene {{destinatario}} pero hay más de un correo en el campo Para. Usa {{@destinatarios}} en su lugar.');
      setSending(false);
      return;
    }

    const sendHtml = (h: string) => `<html lang="es"><head><meta charset="utf-8"><style>p{margin:0 0 1.25em 0 !important}h1{font-size:1.5em;font-weight:700;margin:0 0 0.5em 0 !important}h2{font-size:1.25em;font-weight:700;margin:0 0 0.5em 0 !important}h3{font-size:1.125em;font-weight:600;margin:0 0 0.5em 0 !important}blockquote{padding-left:1em;margin:1.5rem 0;border-left:4px solid #cbd5e1}blockquote p{margin:0}ul{list-style:disc outside;margin:0 0 1.25em 0 !important}ol{list-style:decimal outside;margin:0 0 1.25em 0 !important}li{margin:0 !important}li>p{margin:0 !important}table{border-collapse:collapse;width:100%;margin:0 0 1.25em 0}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#333">${h}</body></html>`;

    const stripMarkers = (h: string) => h.replace(/\{\{@\w+\}\}/g, '');

    const sendIndividualMode = sendIndividual && toList.length > 1;
    const hasGroupMarkers = html.includes('{{@');

    if (sendIndividualMode && perRecipientData && hasGroupMarkers) {
      // Se mira antes de enviar nada. Antes, un destinatario sin datos se saltaba
      // con `continue`: no recibía el correo y no pasaba nada, con lo que el
      // profesor creía que sí había salido. Ahora se avisa y no se envía, que es
      // distinto pero mucho más honesto: el envío parcial no deja rastro de lo
      // que falta, y reenviar después duplicaría lo que ya salió.
      const sinDatos = toList.filter(correo => !perRecipientData[correo]);
      if (sinDatos.length > 0) {
        setDestinatariosSinDatos(sinDatos);
        setSending(false);
        return;
      }

      // Un destinatario puede tener ficha y aun así no tener el campo que pide
      // la plantilla. El hueco sale igual y ya está avisado arriba; aquí solo
      // se sustituye lo que hay.

      for (let i = 0; i < toList.length; i++) {
        const data = perRecipientData[toList[i]];
        // Un marcador sin valor se queda vacío, nunca `{{@algo}}` en crudo: lo
        // lee la empresa, no el profesor.
        const personalizedHtml = html.replace(/\{\{@([\w.]+)\}\}/g, (_, key: string) => data[key] ?? '');
        const payload: EmailSendRequest = {
          to: [toList[i]],
          cc: ccList,
          bcc: bccList,
          subject,
          html: sendHtml(personalizedHtml),
          attachments: attachments.map(a => ({ filename: a.filename, path: a.path })),
          sendIndividual: false,
          delayMs: 1500,
        };
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error((await res.json()).error || 'Error al enviar');
          if (i < toList.length - 1) await new Promise(r => setTimeout(r, 1500));
        } catch (err: any) {
          setError(err.message || 'Error al enviar el correo');
          setSending(false);
          return;
        }
      }
      onClose();
      setSending(false);
      return;
    }

    setDestinatariosSinDatos([]);
    const finalHtml = hasGroupMarkers ? stripMarkers(html) : html;

    const payload: EmailSendRequest = {
      to: toList,
      cc: ccList,
      bcc: bccList,
      subject,
      html: sendHtml(finalHtml),
      attachments: attachments.map(a => ({ filename: a.filename, path: a.path })),
      sendIndividual: sendIndividualMode,
      delayMs: 1500,
    };

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al enviar');
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo');
    } finally {
      setSending(false);
    }
  };

  // GF-76: con el envio desactivado o sin configurar no hay modal de correo.
  if (!isOpen || !emailHabilitado) return null;

  const totalRecipients = parseEmails(to).length + parseEmails(cc).length + parseEmails(bcc).length;
  const hasGroupMarkers = initialBody.includes('{{@');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm p-2">
      <div className="bg-surface-card rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-base bg-surface-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <Send className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-text-main">Nuevo Correo Electrónico</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {configOk === false ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-md">
              <div className="p-3 rounded-full bg-warning-soft text-warning-strong w-fit mx-auto mb-4">
                <Settings className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-text-main mb-2">Configuración de correo pendiente</h3>
              <p className="text-sm text-text-muted mb-6">
                No hay configuración SMTP. Para poder enviar correos electrónicos debes configurar
                tus credenciales de EducaMadrid en la sección de Configuración.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => { onGoToConfig?.(); onClose(); }}
                  className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Ir a Configuración
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel: Attachments */}
            <div className="w-64 lg:w-72 shrink-0 border-r border-border-base bg-surface-subtle/50 overflow-y-auto p-4 space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Paperclip className="h-4 w-4" />
                Añadir adjunto
              </button>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Adjuntos</h3>
                  {attachments.length > 0 && (
                    <Title text="Descargar todos los adjuntos en un .zip">
                      <button
                        type="button"
                        onClick={handleDescargarAdjuntos}
                        disabled={descargandoAdjuntos}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline uppercase tracking-wider disabled:opacity-50"
                      >
                        {descargandoAdjuntos ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        Descargar todos
                      </button>
                    </Title>
                  )}
                </div>
                {attachments.length > 0 ? (
                  <div className="space-y-1.5">
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        className="bg-surface-card border border-border-base rounded-lg px-3 py-2 space-y-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-text-muted shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Title text={att.filename}>
                              <span className="block text-xs text-text-main font-medium truncate">{att.filename}</span>
                            </Title>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-text-muted">{(att.size / 1024).toFixed(1)} KB</span>
                            <span className="text-[10px] text-text-muted font-mono">{att.filename.split('.').pop()?.toUpperCase()}</span>
                            {att.source === 'generated' && (
                              <>
                                <span className="text-border-base">·</span>
                                <span className="text-[9px] font-bold text-primary uppercase">Generado</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att)}
                            className="p-1 text-text-muted hover:text-danger rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">Ningún archivo adjunto</p>
                )}
              </div>
            </div>

            {/* Right panel: Form */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-danger-soft text-danger-strong rounded-lg text-sm border border-danger/20">
                    {error}
                  </div>
                )}

                {/* Lo que va a salir con un hueco. No bloquea el envío: el
                    correo se manda igual, pero un "Estimado/a, " sin nombre
                    detrás es un fallo que conviene ver antes de que lo vea la
                    empresa. */}
                {(marcadoresVacios.length > 0 || destinatariosSinDatos.length > 0 || marcadoresPorDestinatarioVacios.length > 0) && (
                  <div className="p-3 bg-warning-soft text-warning-strong rounded-lg text-sm border border-warning/20">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Se enviará con estos huecos:
                    </div>
                    {marcadoresVacios.length > 0 && (
                      <ul className="mt-1.5 ml-5 list-disc space-y-0.5">
                        {marcadoresVacios.map(m => (
                          <li key={m}>
                            <code className="font-mono text-xs">{`{{${m}}}`}</code> se queda vacío
                          </li>
                        ))}
                      </ul>
                    )}
                    {destinatariosSinDatos.length > 0 && (
                      <p className="mt-1.5 ml-5 list-disc">
                        Sin datos de personalización, sus <code className="font-mono text-xs">{`{{@...}}`}</code> saldrán vacíos:{' '}
                        {destinatariosSinDatos.join(', ')}
                      </p>
                    )}
                    {marcadoresPorDestinatarioVacios.length > 0 && (
                      <ul className="mt-1.5 ml-5 list-disc space-y-0.5">
                        {marcadoresPorDestinatarioVacios.map(({ clave, correo }) => (
                          <li key={`${clave}-${correo}`}>
                            <code className="font-mono text-xs">{`{{@${clave}}}`}</code> no tiene valor para {correo}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Para */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Para</label>
                    {parseEmails(to).length > 1 && !hasGroupMarkers && (
                      <button
                        type="button"
                        onClick={() => setSendIndividual(!sendIndividual)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                          sendIndividual
                            ? 'bg-primary-light text-primary border-primary-light'
                            : 'bg-surface-hover text-text-muted border-border-base'
                        }`}
                      >
                        {sendIndividual ? 'Enviar 1 a 1' : 'Agrupado'}
                      </button>
                    )}
                    {hasGroupMarkers && (
                      <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border bg-primary-light text-primary border-primary-light">
                        Enviar 1 a 1
                      </span>
                    )}
                  </div>
                  <EmailAutocompleteField
                    value={to}
                    onChange={setTo}
                    placeholder="email@ejemplo.com, otro@ejemplo.com"
                    contacts={contacts}
                    grupos={gruposContactos}
                    active={activeAutocomplete === 'to'}
                    onFocus={() => setActiveAutocomplete('to')}
                    onBlur={() => setActiveAutocomplete(null)}
                    suggestedContacts={suggestedContacts}
                    allEmails={allEmails}
                    blurTimerRef={blurTimerRef}
                  />
                  {sendIndividual && parseEmails(to).length > 1 && (
                    <p className="text-[10px] text-warning-strong mt-1">
                      Se enviará un correo individual a cada destinatario con 1.5s de espera entre envíos
                    </p>
                  )}
                </div>

                {/* Permutar Para / CCO */}
                {!hasGroupMarkers && (parseEmails(to).length > 0 || parseEmails(bcc).length > 0) && (
                  <div className="flex items-center justify-end gap-3 -mt-1">
                    {parseEmails(to).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newBcc = bcc ? `${bcc}, ${to}` : to;
                          setBcc(newBcc);
                          setTo('');
                          setSendIndividual(false);
                        }}
                        className="text-[10px] font-semibold text-text-muted hover:text-primary transition-colors"
                      >
                        Pasar destinatarios a CCO →
                      </button>
                    )}
                    {parseEmails(to).length > 0 && parseEmails(bcc).length > 0 && (
                      <span className="text-border-base text-[10px]">|</span>
                    )}
                    {parseEmails(bcc).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTo = to ? `${to}, ${bcc}` : bcc;
                          setTo(newTo);
                          setBcc('');
                          setSendIndividual(true);
                        }}
                        className="text-[10px] font-semibold text-text-muted hover:text-primary transition-colors"
                      >
                        ← Pasar destinatarios al Para
                      </button>
                    )}
                  </div>
                )}

                {!hasGroupMarkers && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">CC</label>
                      <EmailAutocompleteField
                        value={cc}
                        onChange={setCc}
                        placeholder="con.copia@ejemplo.com"
                        contacts={contacts}
                        grupos={gruposContactos}
                        active={activeAutocomplete === 'cc'}
                        onFocus={() => setActiveAutocomplete('cc')}
                        onBlur={() => setActiveAutocomplete(null)}
                        suggestedContacts={suggestedContacts}
                        allEmails={allEmails}
                        blurTimerRef={blurTimerRef}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">CCO</label>
                      <EmailAutocompleteField
                        value={bcc}
                        onChange={setBcc}
                        placeholder="cco@ejemplo.com"
                        contacts={contacts}
                        grupos={gruposContactos}
                        active={activeAutocomplete === 'bcc'}
                        onFocus={() => setActiveAutocomplete('bcc')}
                        onBlur={() => setActiveAutocomplete(null)}
                        suggestedContacts={suggestedContacts}
                        allEmails={allEmails}
                        blurTimerRef={blurTimerRef}
                      />
                    </div>
                  </>
                )}

                {/* Asunto */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Asunto</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Asunto del correo"
                    className="w-full bg-surface-card border border-border-base rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                {/* WYSIWYG Editor */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Cuerpo</label>
                  <div className="border border-border-base rounded-lg overflow-hidden editor-body">
                    <style>{`.editor-body .ProseMirror p { margin-bottom: 1.25em; } .editor-body .ProseMirror ul { margin-bottom: 1.25em; }`}</style>
                    <EditorContext.Provider value={{ editor }}>
                      <Toolbar variant="fixed">
                        <ToolbarGroup>
                          <UndoRedoButton action="undo" />
                          <UndoRedoButton action="redo" />
                        </ToolbarGroup>
                        <ToolbarSeparator />
                        <ToolbarGroup>
                          <HeadingDropdownMenu modal={false} levels={[1, 2, 3]} />
                          <ListDropdownMenu modal={false} types={['bulletList', 'orderedList', 'taskList']} />
                          <BlockquoteButton />
                          <HorizontalRuleButton editor={editor} />
                          <CodeBlockButton />
                          <TableDropdownMenu editor={editor} />
                        </ToolbarGroup>
                        <ToolbarSeparator />
                        <ToolbarGroup>
                          <MarkButton type="bold" />
                          <MarkButton type="italic" />
                          <MarkButton type="underline" />
                          <MarkButton type="strike" />
                          <MarkButton type="code" />
                          <TextColorPopover />
                          <FontSizeDropdown modal={false} />
                          <ClearFormattingButton editor={editor} />
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
                        <ToolbarSeparator />
                        <ToolbarGroup>
                          <ImageInsertButton editor={editor} />
                          <EmojiPicker editor={editor} />
                        </ToolbarGroup>
                      </Toolbar>
                      <EditorContent editor={editor} />
                      <div className="flex justify-end px-3 py-1.5 text-[11px] text-text-muted border-t border-border-base">
                        <WordCharacterCount editor={editor} />
                      </div>
                    </EditorContext.Provider>
                  </div>
                </div>

                {hasGroupMarkers && (
                  <div className="flex items-center gap-2 p-3 bg-warning-soft text-warning-strong rounded-lg text-xs border border-warning/20">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>El cuerpo contiene marcadores <code className="font-mono font-bold">{'{{@...}}'}</code> que se sustituirán automáticamente al enviar según el destinatario. Por este motivo solo será posible enviar correos 1 a 1 a destinatarios en el Para.</span>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-base bg-surface-subtle shrink-0">
                <span className="text-xs text-text-muted">
                  {totalRecipients > 0 ? `${totalRecipients} destinatario${totalRecipients > 1 ? 's' : ''}` : 'Sin destinatarios'}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-hover rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || totalRecipients === 0}
                    className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
