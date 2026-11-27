import { CheckCircle2, Download, ExternalLink, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { useUpdaterStatus } from './useUpdaterStatus.tsx';

// UpdateStatus es un tipo global declarado en src/global.d.ts. Aquí no hace
// falta redeclararlo: esta copia local además inventaba un estado 'check-failed'
// que ni el updater del proceso principal emite nunca, así que las dos
// definiciones podian divergir sin que nada lo detectara.

// El banner va arriba a la derecha, pero por debajo del header: este mide
// h-18 lg:h-20 y en su derecha van el avatar y los botones de historico, tema,
// descarga, avisos y configuracion. Un top-5 lo dejaria encima justo de esos
// iconos, incluido el que lo dispara, y el banner puede quedarse dias en
// pantalla. top-24 (96px) salva los 80px del header mas aire.
const SUBTLE_TEXT = 'font-bold text-text-main uppercase tracking-wider';

export function UpdateBanner() {
  const { status, visible, dismiss, cerrarResultado } = useUpdaterStatus();

  if (!window.updater || !visible || !status) return null;

  // GF-77: como ha ido la actualizacion aplicada al reiniciar.
  if (status.state === 'updated') {
    return (
      <div className="fixed top-24 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-success/20 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success-soft flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-success-strong" />
            </div>
            <div>
              <p className="font-bold text-sm text-text-main leading-tight">Actualización completada</p>
              <p className="text-xs text-text-muted mt-0.5">Ya estás en la versión {status.version}.</p>
            </div>
          </div>
          <button onClick={cerrarResultado} className="text-text-muted hover:text-text-main p-1 -m-1" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (status.state === 'apply-error') {
    return (
      <div className="fixed top-24 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-danger/20 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-danger-soft flex items-center justify-center shrink-0">
              <TriangleAlert className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="font-bold text-sm text-text-main leading-tight">
                No se pudo actualizar{status.version ? ` a la ${status.version}` : ''}
              </p>
              <p className="text-xs text-text-muted mt-0.5 break-words">{status.message}</p>
            </div>
          </div>
          <button onClick={cerrarResultado} className="text-text-muted hover:text-text-main p-1 -m-1" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => window.updater!.applyAndRestart()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
          <button
            onClick={cerrarResultado}
            className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-text-muted uppercase tracking-widest hover:bg-surface-subtle transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (status.state === 'available' || status.state === 'ready') {
    const isReady = status.state === 'ready';
    return (
      <div className="fixed top-24 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-border-base overflow-hidden">
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
      <div className="fixed top-24 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-border-base p-5">
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
      <div className="fixed top-24 right-5 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-danger/20 p-5">
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