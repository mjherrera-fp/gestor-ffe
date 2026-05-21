import { X, Copyright } from 'lucide-react';
import { motion } from 'motion/react';

interface CopyrightModalProps {
  onClose: () => void;
}

export default function CopyrightModal({ onClose }: CopyrightModalProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">Información de Copyright</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Copyright (c) {currentYear} Manuel Jesús Herrera Morgaz. Todos los derechos reservados.
          </p>
          <p>
            Este software se distribuye bajo una licencia de código fuente disponible. Se permite usar,
            ver y estudiar el código. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">El código fuente está disponible en GitHub</a>.
          </p>
          <p>
            No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningún otro tipo sin
            autorización expresa del autor.
          </p>
          <p>
            Toda copia autorizada deberá mantener esta nota de copyright y atribuir al autor original.
          </p>
        </div>
        <div className="px-8 py-4 border-t border-slate-100 text-center">
          <a
            href="https://github.com/mjherrera-fp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors"
          >
            <Copyright size={12} />
            mjherrera-fp
          </a>
        </div>
      </motion.div>
    </div>
  );
}
