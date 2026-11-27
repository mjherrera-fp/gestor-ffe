import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const dismissedKey = (version: string) => `ffe-update-dismissed-${version}`;

interface UpdaterCtxValue {
  status: UpdateStatus | null;
  relevant: UpdateStatus | null;
  visible: boolean;
  dismiss: (v?: string) => void;
  reShow: (v?: string) => void;
  /** Cierra el aviso del resultado de la ultima actualizacion (GF-77). */
  cerrarResultado: () => void;
}

/** Estados que cuentan como acabo la actualizacion aplicada al reiniciar. */
const esResultado = (s: UpdateStatus | null) => s?.state === 'updated' || s?.state === 'apply-error';

const UpdaterCtx = createContext<UpdaterCtxValue | null>(null);

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissedVersions, setDismissedVersions] = useState<Record<string, boolean>>({});
  const [resultadoCerrado, setResultadoCerrado] = useState(false);

  useEffect(() => {
    if (!window.updater) return;
    const off = window.updater.onStatus((s) => {
      setStatus(s);
      if (s.state === 'available' || s.state === 'ready') {
        const v = s.version || '';
        setDismissedVersions((d) =>
          d[v] !== undefined ? d : { ...d, [v]: localStorage.getItem(dismissedKey(v)) === '1' }
        );
      }
    });
    window.updater.checkNow();
    return off;
  }, []);

  const dismiss = (v?: string) => {
    if (!v) return;
    setDismissedVersions((d) => ({ ...d, [v]: true }));
    localStorage.setItem(dismissedKey(v), '1');
  };

  // Al cerrar el aviso de error la descarga sigue pendiente: se vuelve a
  // comprobar para que el icono de la cabecera permita reintentar, pero sin
  // abrir otra vez el aviso grande encima.
  const cerrarResultado = () => {
    setResultadoCerrado(true);
    if (status?.state === 'apply-error') {
      dismiss(status.version);
      window.updater?.checkNow();
    }
  };

  const reShow = (v?: string) => {
    if (!v) return;
    setDismissedVersions((d) => {
      const next = { ...d };
      delete next[v];
      return next;
    });
    localStorage.removeItem(dismissedKey(v));
  };

  const value = useMemo<UpdaterCtxValue>(() => {
    const relevant =
      status && (status.state === 'available' || status.state === 'ready') ? status : null;
    const visible = Boolean(
      status &&
        (status.state === 'downloading' ||
          (esResultado(status) && !resultadoCerrado) ||
          (relevant && !dismissedVersions[relevant.version || '']))
    );
    return { status, relevant, visible, dismiss, reShow, cerrarResultado };
  }, [status, dismissedVersions, resultadoCerrado]);

  return <UpdaterCtx.Provider value={value}>{children}</UpdaterCtx.Provider>;
}

export function useUpdaterStatus() {
  const ctx = useContext(UpdaterCtx);
  if (!ctx) throw new Error('useUpdaterStatus debe usarse dentro de <UpdaterProvider>');
  return ctx;
}