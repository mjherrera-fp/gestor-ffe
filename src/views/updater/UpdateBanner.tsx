import { Download, RefreshCw, X } from 'lucide-react';
import { useUpdaterStatus } from './useUpdaterStatus.tsx';

interface UpdateStatus {
  state: 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error' | 'check-failed';
  version?: string;
  received?: number;
  total?: number;
  message?: string;
}

const SUBTLE_TEXT = 'font-bold text-slate-700 uppercase tracking-wider';

export function UpdateBanner() {
  const { status, visible, dismiss } = useUpdaterStatus();

  if (!window.updater || !visible || !status) return null;

  if (status.state === 'available' || status.state === 'ready') {
    const isReady = status.state === 'ready';
    return (
      <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 leading-tight">
                  Nueva versión disponible
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isReady
                    ? `La versión ${status.version} está descargada y lista.`
                    : `Existe la versión ${status.version}.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => dismiss(status.version)}
              className="text-slate-400 hover:text-slate-600 p-1 -m-1"
              aria-label="Descartar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => (isReady ? window.updater!.applyAndRestart() : window.updater!.download())}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
            >
              {isReady ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Reiniciar y actualizar
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  Descargar
                </>
              )}
            </button>
            <button
              onClick={() => dismiss(status.version)}
              className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Más tarde
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status.state === 'downloading') {
    const pct = status.total
      ? Math.min(100, Math.round(((status.received || 0) / status.total) * 100))
      : 0;
    return (
      <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5">
        <p className={`text-xs ${SUBTLE_TEXT} mb-2`}>
          Descargando actualización {status.version}
        </p>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">{pct}%</p>
      </div>
    );
  }

  if (status.state === 'error') {
    return (
      <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-red-100 p-5">
        <p className={`text-xs ${SUBTLE_TEXT} text-[10px] text-red-700 mb-1`}>
          No se pudo descargar la actualización
        </p>
        <p className="text-[11px] text-slate-500 mb-3 break-words">
          {status.message || 'Error desconocido'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.updater!.download()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
          <button
            onClick={() => dismiss(status.version)}
            className="px-4 py-2 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default UpdateBanner;