import React from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface Props {
  url: string;
  name: string;
  showText?: boolean;
}

export function BotonDescargaDOCX({ url, name, showText = true }: Props) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
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
    } catch (error) {
      console.error('Error:', error);
      alert('No se pudo descargar el documento Word.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="p-2.5 text-blue-600 hover:text-blue-700 transition-all hover:bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
      title="Descargar Word"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      
      {showText && (
        <span className="text-[10px] font-bold uppercase md:inline hidden">
          DOCX
        </span>
      )}
    </button>
  );
}