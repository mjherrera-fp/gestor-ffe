import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  X, Send, Settings, Building2, GraduationCap, Paperclip, Bold, Italic, Underline,
  List, ListOrdered, Heading1, Heading2, Trash2, Loader2, FileText, User, Briefcase, GraduationCap as StudentIcon
} from 'lucide-react';
import { EmailTemplate, EmailAttachment, EmailSendRequest } from '../types/email.ts';
import { EMAIL_TEMPLATES } from '../data/emailTemplates.ts';
import { uploadAttachment, deleteAttachment } from '../utils/emailUtils.ts';

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
}

function EmailAutocompleteField({ value, onChange, placeholder, contacts, active, onFocus, onBlur }: AutocompleteFieldProps) {
  const [focused, setFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parts = value.split(',');
  const lastPart = parts.length > 0 ? parts[parts.length - 1].trim() : '';
  const cursorAtEnd = value.endsWith(lastPart);

  useEffect(() => {
    if (cursorAtEnd) {
      setSearchTerm(lastPart.toLowerCase());
    }
  }, [value]);

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

  const show = active && focused && filtered.length > 0;

  // Reset highlight when results change
  useEffect(() => { setHighlightedIndex(-1); }, [filtered.length]);

  const handleSelect = (contact: EmailContact) => {
    const email = contact.type === 'alumno' ? (contact.emailEduca || contact.emailPersonal || '') : contact.email;
    if (!email) return;
    const prefix = parts.slice(0, -1).join(',');
    const newVal = prefix ? `${prefix}, ${email}, ` : `${email}, `;
    onChange(newVal);
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!show) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setHighlightedIndex(-1);
      setFocused(false);
      onBlur();
    }
  };

  const handleFocus = () => {
    setFocused(true);
    onFocus();
  };

  const handleBlur = () => {
    timerRef.current = setTimeout(() => {
      setFocused(false);
      setHighlightedIndex(-1);
      onBlur();
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
      {show && (
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
  onGoToConfig?: () => void;
}

export function EmailModal({
  isOpen,
  onClose,
  initialTo = [],
  initialBcc = [],
  initialAttachments = [],
  onGoToConfig,
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
  const [configOk, setConfigOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfigOk(null);
      fetch('/api/profesor/config/correo')
        .then(res => res.json())
        .then(cfg => setConfigOk(!!cfg.smtp_user))
        .catch(() => setConfigOk(false));
    }
  }, [isOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escribe el contenido del correo aquí...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-64 p-4',
      },
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTo(initialTo.join(', '));
      setBcc(initialBcc.join(', '));
      setCc('');
      setSubject('');
      setAttachments(initialAttachments);
      setError('');
      setSending(false);
      setSendIndividual(initialTo.length > 1);
      editor?.commands.setContent('');
    }
  }, [isOpen]);

  const handleSelectTemplate = useCallback((template: EmailTemplate) => {
    setSubject(template.subject);
    editor?.commands.setContent(template.body);
  }, [editor]);

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

    const html = editor?.getHTML() || '';

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

  const empresaTemplates = EMAIL_TEMPLATES.filter(t => t.category === 'empresa');
  const estudianteTemplates = EMAIL_TEMPLATES.filter(t => t.category === 'estudiante');
  const totalRecipients = parseEmails(to).length + parseEmails(cc).length + parseEmails(bcc).length;

  const ToolbarButton = ({ onClick, active, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );

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
        {configOk === null ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : configOk === false ? (
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
            {/* Left panel: Templates */}
            <div className="w-64 lg:w-72 shrink-0 border-r border-slate-200 bg-slate-50/50 overflow-y-auto p-4 space-y-6">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plantillas</h3>

              {empresaTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Empresa</span>
                  </div>
                  <div className="space-y-1">
                    {empresaTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-100"
                      >
                        <span className="block truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {estudianteTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Estudiante</span>
                  </div>
                  <div className="space-y-1">
                    {estudianteTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-transparent hover:border-emerald-100"
                      >
                        <span className="block truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
                        <Bold className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
                        <Italic className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}>
                        <Underline className="h-4 w-4" />
                      </ToolbarButton>
                      <span className="w-px h-5 bg-slate-200 mx-1" />
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
                        <Heading1 className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
                        <Heading2 className="h-4 w-4" />
                      </ToolbarButton>
                      <span className="w-px h-5 bg-slate-200 mx-1" />
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
                        <List className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
                        <ListOrdered className="h-4 w-4" />
                      </ToolbarButton>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjuntos</label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Paperclip className="h-3 w-3" />
                      Añadir archivos
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  {attachments.length > 0 ? (
                    <div className="space-y-1.5">
                      {attachments.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 truncate">{att.filename}</span>
                            <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(1)} KB)</span>
                            {att.source === 'generated' && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase">Generado</span>
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
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Ningún archivo adjunto</p>
                  )}
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
