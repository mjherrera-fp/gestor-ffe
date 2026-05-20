import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  X, Send, Building2, GraduationCap, Paperclip, Bold, Italic, Underline,
  List, ListOrdered, Heading1, Heading2, Trash2, Loader2, FileText
} from 'lucide-react';
import { EmailTemplate, EmailAttachment, EmailSendRequest } from '../types/email.ts';
import { EMAIL_TEMPLATES } from '../data/emailTemplates.ts';
import { uploadAttachment, deleteAttachment } from '../utils/emailUtils.ts';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string[];
  initialBcc?: string[];
  initialAttachments?: EmailAttachment[];
}

export function EmailModal({
  isOpen,
  onClose,
  initialTo = [],
  initialBcc = [],
  initialAttachments = [],
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
      setSendIndividual(initialTo.length + initialBcc.length > 1);
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Para</label>
                <input
                  type="text"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="email@ejemplo.com, otro@ejemplo.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
              </div>

              {/* CC */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CC</label>
                <input
                  type="text"
                  value={cc}
                  onChange={e => setCc(e.target.value)}
                  placeholder="con.copia@ejemplo.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
              </div>

              {/* BCC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CCO</label>
                  {parseEmails(bcc).length > 1 && (
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
                <input
                  type="text"
                  value={bcc}
                  onChange={e => setBcc(e.target.value)}
                  placeholder="cco@ejemplo.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
                {sendIndividual && parseEmails(bcc).length > 1 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Se enviará un correo individual a cada destinatario con 1.5s de espera entre envíos
                  </p>
                )}
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
      </div>
    </div>
  );
}
