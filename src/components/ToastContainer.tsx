import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';
import { Aviso } from '../types/index.ts';

interface ToastContainerProps {
  avisos: Aviso[];
  onDescartar: (id: number) => void;
  onPosponer: (id: number) => void;
}

export default function ToastContainer({ avisos, onDescartar, onPosponer }: ToastContainerProps) {
  const pendientes = avisos.filter(a => a.estado === 'pendiente');

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {pendientes.map(aviso => (
          <motion.div
            key={aviso.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-surface-card rounded-2xl border border-border-base shadow-xl p-4 pointer-events-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-main uppercase">{aviso.asunto}</p>
                <p className="text-xs text-text-muted mt-1 whitespace-pre-line">{aviso.descripcion}</p>
              </div>
              <button
                onClick={() => onPosponer(aviso.id)}
                className="shrink-0 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border-base">
              <button
                onClick={() => onDescartar(aviso.id)}
                className="flex-1 text-[10px] font-bold uppercase text-white bg-danger hover:bg-danger/90 rounded-lg py-1.5 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={() => onPosponer(aviso.id)}
                className="flex-1 text-[10px] font-bold uppercase text-text-main bg-surface-hover hover:bg-surface-strong rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
              >
                <Clock className="h-3 w-3" />
                Posponer
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
