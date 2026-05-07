import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface Props {
  url?: string;
  name?: string;
  showText?: boolean;
  onClick?: () => Promise<void>;
  className?: string;
}

export function BotonDescargaDOCX({ url, name, showText = true, onClick, className }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Si nos pasan un onClick personalizado, lo ejecutamos
      if (onClick) {
        await onClick();
      } 
      // Si no, usamos la lógica por defecto de URL
      else if (url && name) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al descargar el archivo');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('No se pudo descargar el documento Word.');
    } finally {
      setIsDownloading(false);
    }
  };

  const defaultStyles = "p-2.5 h-8 text-blue-600 hover:text-blue-700 transition-all hover:bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex items-center gap-1.5 disabled:opacity-50";

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={className || defaultStyles}
      title="Descargar Word"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <FileText className="h-4 w-4 shrink-0" />
      )}
      {showText && <span className='text-[9px] font-bold truncate'>DOCX</span>}
    </button>
  );
}