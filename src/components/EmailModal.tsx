import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useEditor, EditorContent, EditorContext } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Image } from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import { Selection } from '@tiptap/extensions';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/table-node/table-node.scss";
import {
  X, Send, Settings, Paperclip, Trash2, Loader2, FileText, User, Briefcase, GraduationCap as StudentIcon
} from 'lucide-react';
import { EmailAttachment, EmailSendRequest } from '../types/email.ts';
import { uploadAttachment, deleteAttachment } from '../utils/emailUtils.ts';
import { Title } from './Title.tsx';
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

interface EmailContact {
  id: number;
  nombre: string;
  apellidos?: string;
  email: string;
  emailEduca?: string;
  emailPersonal?: string;
  empresaNombre?: string;
  type: 'empresa' | 'tutor' | 'alumno';
}

interface AutocompleteFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  contacts: EmailContact[];
  active: boolean;
  onFocus: () => void;
  onBlur: () => void;
  suggestedContacts?: EmailContact[];
  allEmails?: string[];
  blurTimerRef?: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

function EmailAutocompleteField({ value, onChange, placeholder, contacts, active, onFocus, onBlur, suggestedContacts = [], allEmails = [], blurTimerRef }: AutocompleteFieldProps) {
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
          || (c.emailPersonal && c.emailPersonal.toLowerCase().includes(q));
      }).slice(0, 20)
    : [];

  const getContactEmail = (c: EmailContact): string =>
    c.type === 'alumno' ? (c.emailEduca || c.emailPersonal || '') : c.email;

  interface SuggestionItem {
    contact: EmailContact;
    email: string;
    label: string;
  }

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

  const showSuggestions = active && !searchTerm && availableSuggestions.length > 0;
  const show = active && filtered.length > 0;

  // Reset highlight when results change
  useEffect(() => { setHighlightedIndex(-1); }, [filtered.length]);

  const handleSelect = (contact: EmailContact) => {
    const email = getContactEmail(contact);
    if (!email) return;
    const prefix = parts.slice(0, -1).join(',');
    const newVal = prefix ? `${prefix}, ${email}, ` : `${email}, `;
    onChange(newVal);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (suggestion: SuggestionItem) => {
    const newVal = value ? `${value}, ${suggestion.email}, ` : `${suggestion.email}, `;
    onChange(newVal);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const dropdownItems: (EmailContact | SuggestionItem)[] = showSuggestions ? availableSuggestions : filtered;

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
        handleSelectSuggestion(item as SuggestionItem);
      } else {
        handleSelect(item as EmailContact);
      }
    } else if (e.key === 'Escape') {
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
      case 'empresa': return <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
      case 'tutor': return <User className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
      case 'alumno': return <StudentIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    }
  };

  const contactLabel = (c: EmailContact) => {
    const name = c.apellidos ? `${c.nombre} ${c.apellidos}` : c.nombre;
    const email = c.type === 'alumno' ? (c.emailEduca || c.emailPersonal) : c.email;
    const extra = c.type === 'tutor' && c.empresaNombre ? ` - ${c.empresaNombre}` : '';
    return `${name}${extra} <${email}>`;
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
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
      />
      {showSuggestions && (
        <div className="absolute z-70 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
            Sugerencias
          </div>
          {availableSuggestions.map((s, i) => (
            <button
              key={`sug-${s.contact.type}-${s.contact.id}-${s.email}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-50 last:border-0 ${
                i === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {contactIcon(s.contact)}
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}
      {show && !showSuggestions && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.map((c, i) => (
            <button
              key={`${c.type}-${c.id}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(c); }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-50 last:border-0 ${
                i === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
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
  onGoToConfig,
  contextualContactIds = [],
}: EmailModalProps) {
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
  const [activeAutocomplete, setActiveAutocomplete] = useState<'to' | 'cc' | 'bcc' | null>(null);
  const [configOk, setConfigOk] = useState<boolean>(true);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/profesor/config/correo')
        .then(res => res.json())
        .then(cfg => setConfigOk(!!cfg.smtp_user))
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
      setSendIndividual(initialTo.length > 1);
      editor?.commands.setContent(initialBody);
      editor?.chain().selectAll().setTextAlign('justify').setTextSelection(1).run();
    }
  }, [isOpen]);

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
        .then((data: { empresas: any[]; tutores: any[]; alumnos: any[] }) => {
          const all: EmailContact[] = [
            ...data.empresas.map(e => ({ ...e, type: 'empresa' as const, apellidos: undefined, emailEduca: undefined, emailPersonal: undefined })),
            ...data.tutores.map(t => ({ ...t, type: 'tutor' as const, emailEduca: undefined, emailPersonal: undefined })),
            ...data.alumnos.map(a => ({ ...a, type: 'alumno' as const, email: '' })),
          ];
          setContacts(all);
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

    const editorHtml = editor?.getHTML() || '';
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#333">
<style>p{margin:0 0 1.25em 0 !important}h1{font-size:1.5em;font-weight:700;margin:0 0 0.5em 0 !important}h2{font-size:1.25em;font-weight:700;margin:0 0 0.5em 0 !important}h3{font-size:1.125em;font-weight:600;margin:0 0 0.5em 0 !important}blockquote{padding-left:1em;margin:1.5rem 0;border-left:4px solid #cbd5e1}blockquote p{margin:0}ul{list-style:disc outside;margin:0 0 1.25em 0 !important}ol{list-style:decimal outside;margin:0 0 1.25em 0 !important}li{margin:0 !important}li>p{margin:0 !important}table{border-collapse:collapse;width:100%;margin:0 0 1.25em 0}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style>
${editorHtml}
</div>`;

    const payload: EmailSendRequest = {
      to: sendIndividual && toList.length > 1 ? toList : allRecipients,
      cc: sendIndividual && toList.length > 1 ? [] : [],
      subject,
      html,
      attachments: attachments.map(a => ({ filename: a.filename, path: a.path })),
      sendIndividual: sendIndividual && toList.length > 1,
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

  if (!isOpen) return null;

  const totalRecipients = parseEmails(to).length + parseEmails(cc).length + parseEmails(bcc).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Send className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Nuevo Correo Electrónico</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {configOk === false ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-md">
              <div className="p-3 rounded-full bg-amber-100 text-amber-600 w-fit mx-auto mb-4">
                <Settings className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Configuración de correo pendiente</h3>
              <p className="text-sm text-slate-500 mb-6">
                No hay configuración SMTP. Para poder enviar correos electrónicos debes configurar
                tus credenciales de EducaMadrid en la sección de Configuración.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => { onGoToConfig?.(); onClose(); }}
                  className="px-5 py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20 flex items-center gap-2"
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
            <div className="w-64 lg:w-72 shrink-0 border-r border-slate-200 bg-slate-50/50 overflow-y-auto p-4 space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <Paperclip className="h-4 w-4" />
                Añadir adjunto
              </button>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Adjuntos</h3>
                {attachments.length > 0 ? (
                  <div className="space-y-1.5">
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Title text={att.filename}>
                              <span className="block text-xs text-slate-700 font-medium truncate">{att.filename}</span>
                            </Title>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</span>
                            <span className="text-[10px] text-slate-400 font-mono">{att.filename.split('.').pop()?.toUpperCase()}</span>
                            {att.source === 'generated' && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[9px] font-bold text-blue-500 uppercase">Generado</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Ningún archivo adjunto</p>
                )}
              </div>
            </div>

            {/* Right panel: Form */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                    {error}
                  </div>
                )}

                {/* Para */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Para</label>
                    {parseEmails(to).length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSendIndividual(!sendIndividual)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                          sendIndividual
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {sendIndividual ? 'Enviar 1 a 1' : 'Agrupado'}
                      </button>
                    )}
                  </div>
                  <EmailAutocompleteField
                    value={to}
                    onChange={setTo}
                    placeholder="email@ejemplo.com, otro@ejemplo.com"
                    contacts={contacts}
                    active={activeAutocomplete === 'to'}
                    onFocus={() => setActiveAutocomplete('to')}
                    onBlur={() => setActiveAutocomplete(null)}
                    suggestedContacts={suggestedContacts}
                    allEmails={allEmails}
                    blurTimerRef={blurTimerRef}
                  />
                  {sendIndividual && parseEmails(to).length > 1 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Se enviará un correo individual a cada destinatario con 1.5s de espera entre envíos
                    </p>
                  )}
                </div>

                {/* Permutar Para / CCO */}
                {(parseEmails(to).length > 0 || parseEmails(bcc).length > 0) && (
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
                        className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        Pasar destinatarios a CCO →
                      </button>
                    )}
                    {parseEmails(to).length > 0 && parseEmails(bcc).length > 0 && (
                      <span className="text-slate-300 text-[10px]">|</span>
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
                        className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        ← Pasar destinatarios al Para
                      </button>
                    )}
                  </div>
                )}

                {/* CC */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CC</label>
                  <EmailAutocompleteField
                    value={cc}
                    onChange={setCc}
                    placeholder="con.copia@ejemplo.com"
                    contacts={contacts}
                    active={activeAutocomplete === 'cc'}
                    onFocus={() => setActiveAutocomplete('cc')}
                    onBlur={() => setActiveAutocomplete(null)}
                    suggestedContacts={suggestedContacts}
                    allEmails={allEmails}
                    blurTimerRef={blurTimerRef}
                  />
                </div>

                {/* BCC */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CCO</label>
                  <EmailAutocompleteField
                    value={bcc}
                    onChange={setBcc}
                    placeholder="cco@ejemplo.com"
                    contacts={contacts}
                    active={activeAutocomplete === 'bcc'}
                    onFocus={() => setActiveAutocomplete('bcc')}
                    onBlur={() => setActiveAutocomplete(null)}
                    suggestedContacts={suggestedContacts}
                    allEmails={allEmails}
                    blurTimerRef={blurTimerRef}
                  />
                </div>

                {/* Asunto */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Asunto</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Asunto del correo"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* WYSIWYG Editor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cuerpo</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden editor-body">
                    <style>{`.editor-body .ProseMirror p { margin-bottom: 1.25em; } .editor-body .ProseMirror ul { margin-bottom: 1.25em; }`}</style>
                    <EditorContext.Provider value={{ editor }}>
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
                          <TableDropdownMenu editor={editor} />
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
                      <EditorContent editor={editor} />
                    </EditorContext.Provider>
                  </div>
                </div>


              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <span className="text-xs text-slate-400">
                  {totalRecipients > 0 ? `${totalRecipients} destinatario${totalRecipients > 1 ? 's' : ''}` : 'Sin destinatarios'}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || totalRecipients === 0}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
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
