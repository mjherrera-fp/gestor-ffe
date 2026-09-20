import { useState, useRef, useEffect } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Aviso } from '../types/index.ts';
import { Title } from './Title.tsx';

interface NotificationBellProps {
  avisos: Aviso[];
  onDescartar: (id: number) => void;
  onAbrirCrear: () => void;
}

export default function NotificationBell({ avisos, onDescartar, onAbrirCrear }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const pospuestos = avisos.filter(a => a.estado === 'pospuesto');
  const totalActivos = avisos.filter(a => a.estado !== 'descartado').length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  return (
    <div ref={ref} className="relative">
      <Title text="Avisos">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="relative p-2 rounded-full text-text-muted hover:text-warning-strong hover:bg-warning-soft transition-all flex items-center justify-center"
        >
          <Bell className="h-5 w-5" />
          {totalActivos > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-warning text-white text-[8px] font-bold flex items-center justify-center">
              {totalActivos > 9 ? '9+' : totalActivos}
            </span>
          )}
        </button>
      </Title>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-surface-card rounded-2xl border border-border-base shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-base">
              <span className="text-[10px] font-bold uppercase text-text-muted">
                Avisos pospuestos ({pospuestos.length})
              </span>
              <Title text="Crear aviso manual">
                <button
                  onClick={() => { onAbrirCrear(); setOpen(false); }}
                  className="p-1 rounded-lg text-text-muted hover:text-primary hover:bg-primary-light transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </Title>
            </div>

            {pospuestos.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-muted">
                No hay avisos pospuestos
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {pospuestos.map(aviso => (
                  <div key={aviso.id} className="px-4 py-3 border-b border-border-base last:border-0 hover:bg-surface-subtle/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-text-main">{aviso.asunto}</p>
                        <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{aviso.descripcion}</p>
                      </div>
                      <Title text="Descartar">
                        <button
                          onClick={() => onDescartar(aviso.id)}
                          className="shrink-0 p-1 rounded text-text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Title>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
