import { useState, useRef, useEffect } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Aviso } from '../types/index.ts';

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
      <button
        onClick={() => setOpen(prev => !prev)}
        title="Avisos"
        className="relative p-2 rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all flex items-center justify-center"
      >
        <Bell className="h-5 w-5" />
        {totalActivos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
            {totalActivos > 9 ? '9+' : totalActivos}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Avisos pospuestos ({pospuestos.length})
              </span>
              <button
                onClick={() => { onAbrirCrear(); setOpen(false); }}
                title="Crear aviso manual"
                className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-primary-light transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {pospuestos.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No hay avisos pospuestos
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {pospuestos.map(aviso => (
                  <div key={aviso.id} className="px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800">{aviso.asunto}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{aviso.descripcion}</p>
                      </div>
                      <button
                        onClick={() => onDescartar(aviso.id)}
                        title="Descartar"
                        className="shrink-0 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
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
