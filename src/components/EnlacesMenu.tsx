import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Title } from './Title.tsx';
import { useEnlaces } from '../hooks/useEnlaces.ts';

/** El dominio, para distinguir enlaces con nombres parecidos. */
const dominio = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

/**
 * Icono de la cabecera con los enlaces personalizados (Configuracion ->
 * Enlaces). Funciona como la campana de avisos: abre un desplegable con la
 * lista. Si no hay ningun enlace no se muestra.
 *
 * Los enlaces se abren con target="_blank": en la app de escritorio, main.js
 * manda cualquier ventana nueva a una web externa al navegador por defecto.
 */
export default function EnlacesMenu() {
  const { enlaces } = useEnlaces();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  if (enlaces.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <Title text="Enlaces">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-all flex items-center justify-center"
        >
          <Link2 className="h-5 w-5" />
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
            <div className="px-4 py-3 border-b border-border-base">
              <span className="text-[10px] font-bold uppercase text-text-muted">Enlaces ({enlaces.length})</span>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {enlaces.map(e => (
                <li key={e.id} className="border-b border-border-base last:border-0">
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-subtle/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-main truncate">{e.nombre}</p>
                      <p className="text-[10px] text-text-muted truncate">{dominio(e.url)}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
