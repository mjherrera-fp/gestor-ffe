import React, { useState } from 'react';
import { File as FilePdf, Loader2, LucideIcon } from 'lucide-react';
import { mostrarToast } from '../utils/toast.ts';
import { Title } from './Title.tsx';

interface Props {
  url?: string;
  name?: string;
  showText?: boolean;
  text?: string;
  onClick?: () => Promise<void>;
  className?: string;
  icon?: LucideIcon
}

export function BotonDescargaPDF({ url, name, showText = true, text, onClick, className, icon: Icon = FilePdf }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  const descargarPDF = async () => {
    try {
      setIsDownloading(true);
      
      if (onClick) {
        await onClick();
      } else if (url && name) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fallo al generar el PDF');

        const blob = await response.blob();
        const urlLocal = window.URL.createObjectURL(blob);
        const enlaceInvisible = document.createElement('a');
        enlaceInvisible.href = urlLocal;
        enlaceInvisible.download = name;
        
        document.body.appendChild(enlaceInvisible);
        enlaceInvisible.click();
        
        enlaceInvisible.remove();
        window.URL.revokeObjectURL(urlLocal);
      }
    } catch (error) {
      console.error(error);
      mostrarToast('Hubo un error al generar el PDF oficial', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const defaultStyles = "p-2.5 h-8 text-danger hover:text-danger/80 transition-all hover:bg-danger-soft rounded-xl border border-danger/20 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

  return (

      <button 
        onClick={descargarPDF}
        disabled={isDownloading}
        className={className || defaultStyles}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        {showText && <span className="text-[9px] font-bold truncate">{text || 'PDF'}</span>}
      </button>
  );
}