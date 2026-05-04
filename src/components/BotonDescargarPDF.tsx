import React, { useState } from 'react';
import { File as FilePdf, Loader2} from 'lucide-react';

// Nuevo mini-componente para gestionar la descarga individual de cada fila
export function BotonDescargaPDF({ url, name, showText = false }: { url: string, name: string, showText?: boolean }) {
  const [estaCargando, setEstaCargando] = useState(false);

  const descargarPDF = async () => {
    try {
      setEstaCargando(true);
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
    } catch (error) {
      console.error(error);
      alert('Hubo un error al generar el PDF oficial.');
    } finally {
      setEstaCargando(false);
    }
  };

  return (
    <button 
      onClick={descargarPDF}
      disabled={estaCargando}
      className="p-2.5 text-red-600 hover:text-red-700 transition-all hover:bg-red-50 rounded-xl border border-red-100 shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Descargar Anexo en PDF"
    >
      {estaCargando ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FilePdf className="h-4 w-4" />
      )}
      {showText && <span className="text-xs font-semibold">{estaCargando ? 'Generando...' : 'PDF'}</span>}
    </button>
  );
}