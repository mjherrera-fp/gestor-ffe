import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { mostrarToast } from '../utils/toast.ts';
import { Title } from './Title.tsx';

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
      mostrarToast('No se pudo descargar el documento', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const defaultStyles = "p-2.5 h-8 text-primary hover:text-primary/80 transition-all hover:bg-primary-light rounded-xl border border-primary/20 shadow-sm flex items-center gap-1.5 disabled:opacity-50";

  return (
    <Title text="Descargar Word">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={className || defaultStyles}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <FileText className="h-4 w-4 shrink-0" />
        )}
        {showText && <span className='text-[9px] font-bold truncate'>DOCX</span>}
      </button>
    </Title>
  );
}