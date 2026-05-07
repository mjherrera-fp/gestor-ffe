import React, { useState } from 'react';
import { File as FilePdf, Loader2 } from 'lucide-react';

interface Props {
  url?: string;
  name?: string;
  showText?: boolean;
  onClick?: () => Promise<void>;
  className?: string;
}

export function BotonDescargaPDF({ url, name, showText = true, onClick, className }: Props) {
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
      alert('Hubo un error al generar el PDF oficial.');
    } finally {
      setIsDownloading(false);
    }
  };

  const defaultStyles = "p-2.5 h-8 text-red-600 hover:text-red-700 transition-all hover:bg-red-50 rounded-xl border border-red-100 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button 
      onClick={descargarPDF}
      disabled={isDownloading}
      className={className || defaultStyles}
      title="Descargar Anexo en PDF"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <FilePdf className="h-4 w-4 shrink-0" />
      )}
      {showText && <span className="text-[9px] font-bold truncate">PDF</span>}
    </button>
  );
}