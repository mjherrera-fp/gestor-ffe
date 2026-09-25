import { Download, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useUpdaterStatus } from './useUpdaterStatus.tsx';

interface UpdateStatus {
  state: 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error' | 'check-failed';
  version?: string;
  received?: number;
  total?: number;
  message?: string;
  releaseUrl?: string;
}

const SUBTLE_TEXT = 'font-bold text-text-main uppercase tracking-wider';

export function UpdateBanner() {
  const { status, visible, dismiss } = useUpdaterStatus();

  if (!window.updater || !visible || !status) return null;

  if (status.state === 'available' || status.state === 'ready') {
    const isReady = status.state === 'ready';
    return (
      <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-border-base overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-text-main leading-tight">
                  Nueva versión disponible
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {isReady
                    ? `La versión ${status.version} está descargada y lista.`
                    : `Existe la versión ${status.version}.`}
                </p>
                {status.releaseUrl && (
                  <a
                    href={status.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline underline-offset-2 mt-1"
                  >
                    Ver notas de la versión
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => dismiss(status.version)}
              className="text-text-muted hover:text-text-main p-1 -m-1"
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
              className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-text-muted uppercase tracking-widest hover:bg-surface-subtle transition-all"
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
      <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-border-base p-5">
        <p className={`text-xs ${SUBTLE_TEXT} mb-2`}>
          Descargando actualización {status.version}
        </p>
        <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-text-muted mt-1.5">{pct}%</p>
      </div>
    );
  }

  if (status.state === 'error') {
    return (
      <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-danger/20 p-5">
        <p className={`text-xs ${SUBTLE_TEXT} text-[10px] text-danger mb-1`}>
          No se pudo descargar la actualización
        </p>
        <p className="text-[11px] text-text-muted mb-3 break-words">
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
            className="px-4 py-2 rounded-xl text-[10px] font-bold text-text-muted uppercase tracking-widest hover:bg-surface-subtle transition-all"
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