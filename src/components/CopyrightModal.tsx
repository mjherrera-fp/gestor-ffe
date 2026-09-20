import { X, Copyright } from 'lucide-react';
import { Modal } from './ui/Modal.tsx';

interface CopyrightModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CopyrightModal({ open, onClose }: CopyrightModalProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Modal open={open} onClose={onClose} maxWidth="md">
      <div className="px-8 py-6 border-b border-border-base flex items-center justify-between bg-surface-subtle shrink-0">
        <h3 className="text-xl font-bold text-text-main">Información de Copyright</h3>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-8 space-y-4 text-sm text-text-main leading-relaxed overflow-y-auto flex-1">
        <p>
          Copyright (c) {currentYear} Manuel Jesús Herrera Morgaz. Todos los derechos reservados.
        </p>
        <p>
          Este software se distribuye bajo una licencia de código fuente disponible. Se permite usar,
          ver y estudiar el código. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">El código fuente está disponible en GitHub</a>.
        </p>
        <p>
          No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningún otro tipo sin
          autorización expresa del autor.
        </p>
        <p>
          Toda copia autorizada deberá mantener esta nota de copyright y atribuir al autor original.
        </p>
      </div>
      <div className="px-8 py-4 border-t border-border-base text-center shrink-0">
        <a
          href="https://github.com/mjherrera-fp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
        >
          <Copyright size={12} />
          mjherrera-fp
        </a>
      </div>
    </Modal>
  );
}
