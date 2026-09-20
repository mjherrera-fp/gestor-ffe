import { useState, useEffect } from 'react';
import { Settings, Loader2, FileDown, FolderOpen, Square, CheckSquare, Circle, CheckCircle2, FileText, ExternalLink, FolderUp, Info, Handshake } from 'lucide-react';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

export function TabDocumentos() {
  // ── Estado creación de ficheros ──
  const [modoCreacion, setModoCreacion] = useState('descargar');
  const [carpetaEstudiante, setCarpetaEstudiante] = useState(false);
  const [loadingCreacion, setLoadingCreacion] = useState(true);
  const [savingCreacion, setSavingCreacion] = useState(false);
  const [successCreacion, setSuccessCreacion] = useState('');
  const [errorCreacion, setErrorCreacion] = useState('');

  // ── Estado anexo de relación ──
  const [anexoRelacionModo, setAnexoRelacionModo] = useState('app');
  const [anexoRelacionUrl, setAnexoRelacionUrl] = useState('');
  const [loadingAnexo, setLoadingAnexo] = useState(true);
  const [savingAnexo, setSavingAnexo] = useState(false);
  const [successAnexo, setSuccessAnexo] = useState('');
  const [errorAnexo, setErrorAnexo] = useState('');

  // ── Estado convenios ──
  const [conveniosUrl, setConveniosUrl] = useState('');
  const [loadingConvenios, setLoadingConvenios] = useState(true);
  const [savingConvenios, setSavingConvenios] = useState(false);
  const [successConvenios, setSuccessConvenios] = useState('');
  const [errorConvenios, setErrorConvenios] = useState('');

  // ── Estado envío a la DAT ──
  const [datModo, setDatModo] = useState('necesario');
  const [loadingDat, setLoadingDat] = useState(true);
  const [savingDat, setSavingDat] = useState(false);
  const [successDat, setSuccessDat] = useState('');
  const [errorDat, setErrorDat] = useState('');

  // ── Cargar configuraciones ──
  useEffect(() => {
    fetch('/api/profesor/config/creacion-ficheros')
      .then(r => r.json())
      .then(data => {
        setModoCreacion(data.modo || 'descargar');
        setCarpetaEstudiante(data.carpeta_estudiante === '1');
      })
      .catch(() => setErrorCreacion('Error al cargar configuración de creación de ficheros'))
      .finally(() => setLoadingCreacion(false));

    fetch('/api/profesor/config/anexo-relacion')
      .then(r => r.json())
      .then(data => {
        setAnexoRelacionModo(data.modo || 'app');
        setAnexoRelacionUrl(data.url || '');
      })
      .catch(() => setErrorAnexo('Error al cargar configuración del anexo de relación'))
      .finally(() => setLoadingAnexo(false));

    fetch('/api/profesor/config/convenios')
      .then(r => r.json())
      .then(data => {
        setConveniosUrl(data.url || '');
      })
      .catch(() => setErrorConvenios('Error al cargar configuración de convenios'))
      .finally(() => setLoadingConvenios(false));

    fetch('/api/profesor/config/dat')
      .then(r => r.json())
      .then(data => {
        setDatModo(data.modo || 'necesario');
      })
      .catch(() => setErrorDat('Error al cargar configuración de envío a la DAT'))
      .finally(() => setLoadingDat(false));
  }, []);

  // ── Handlers creación de ficheros ──
  const handleSubmitCreacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreacion(true);
    setSuccessCreacion('');
    setErrorCreacion('');
    try {
      const res = await fetch('/api/profesor/config/creacion-ficheros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: modoCreacion, carpeta_estudiante: carpetaEstudiante ? '1' : '0' }),
      });
      if (res.ok) {
        setSuccessCreacion('Configuración de creación de ficheros guardada correctamente.');
      } else {
        setErrorCreacion('Error al guardar configuración de creación de ficheros');
      }
    } catch {
      setErrorCreacion('Error de conexión');
    } finally {
      setSavingCreacion(false);
    }
  };

  // ── Handlers anexo de relación ──
  const handleSubmitAnexo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnexo(true);
    setSuccessAnexo('');
    setErrorAnexo('');
    try {
      if (anexoRelacionModo === 'externo' && !anexoRelacionUrl.trim()) {
        setErrorAnexo('Debes indicar la URL del anexo de relación externo.');
        return;
      }
      const res = await fetch('/api/profesor/config/anexo-relacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: anexoRelacionModo, url: anexoRelacionUrl }),
      });
      if (res.ok) {
        setSuccessAnexo('Configuración del anexo de relación guardada correctamente.');
      } else {
        setErrorAnexo('Error al guardar configuración del anexo de relación');
      }
    } catch {
      setErrorAnexo('Error de conexión');
    } finally {
      setSavingAnexo(false);
    }
  };

  // ── Handlers convenios ──
  const handleSubmitConvenios = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConvenios(true);
    setSuccessConvenios('');
    setErrorConvenios('');
    try {
      const res = await fetch('/api/profesor/config/convenios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: conveniosUrl }),
      });
      if (res.ok) {
        setSuccessConvenios('Configuración de convenios guardada correctamente.');
      } else {
        setErrorConvenios('Error al guardar configuración de convenios');
      }
    } catch {
      setErrorConvenios('Error de conexión');
    } finally {
      setSavingConvenios(false);
    }
  };

  // ── Handlers envío a la DAT ──
  const handleSubmitDat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDat(true);
    setSuccessDat('');
    setErrorDat('');
    try {
      const res = await fetch('/api/profesor/config/dat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: datModo }),
      });
      if (res.ok) {
        setSuccessDat('Configuración de envío a la DAT guardada correctamente.');
      } else {
        setErrorDat('Error al guardar configuración de envío a la DAT');
      }
    } catch {
      setErrorDat('Error de conexión');
    } finally {
      setSavingDat(false);
    }
  };

  const loading = loadingCreacion || loadingConvenios || loadingAnexo || loadingDat;

  if (loading) {
    return (
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-8 text-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── SECCIÓN CREACIÓN DE FICHEROS ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-soft text-success-strong">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Creación de ficheros</h3>
              <p className="text-sm text-text-muted">
                Elige cómo se generan los documentos (PDF, DOCX, XLSX) al descargarlos.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorCreacion && (
            <div className="mb-4 p-3 bg-danger-soft text-danger rounded-lg text-sm border border-danger/20">{errorCreacion}</div>
          )}
          {successCreacion && (
            <div className="mb-4 p-3 bg-success-soft text-success-strong rounded-lg text-sm border border-success/20">
              {successCreacion}
            </div>
          )}
          <form onSubmit={handleSubmitCreacion} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModoCreacion('descargar')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  modoCreacion === 'descargar'
                    ? 'bg-primary-light border-primary shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                {modoCreacion === 'descargar' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-border-base mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileDown className={`h-4 w-4 ${modoCreacion === 'descargar' ? 'text-primary' : 'text-text-muted'}`} />
                    <span className={`text-sm font-semibold ${modoCreacion === 'descargar' ? 'text-primary' : 'text-text-main'}`}>Descargar</span>
                  </div>
                  <p className={`text-xs mt-1 ${modoCreacion === 'descargar' ? 'text-primary' : 'text-text-muted'}`}>
                    Los documentos se descargan por el navegador a la carpeta de descargas del sistema.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setModoCreacion('crear')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  modoCreacion === 'crear'
                    ? 'bg-success-soft border-success shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                {modoCreacion === 'crear' ? (
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-border-base mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`h-4 w-4 ${modoCreacion === 'crear' ? 'text-success' : 'text-text-muted'}`} />
                    <span className={`text-sm font-semibold ${modoCreacion === 'crear' ? 'text-success-strong' : 'text-text-main'}`}>Guardar en carpeta docs/</span>
                  </div>
                  <p className={`text-xs mt-1 ${modoCreacion === 'crear' ? 'text-success' : 'text-text-muted'}`}>
                    Los documentos se guardan automáticamente en la carpeta <code className="bg-surface-hover px-1 rounded text-xs">docs/</code> junto al ejecutable de la aplicación.
                  </p>
                </div>
              </button>
            </div>
            <div className="pt-4 border-t border-border-base">
              <button
                type="button"
                onClick={() => setCarpetaEstudiante(!carpetaEstudiante)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-subtle border border-border-base hover:bg-surface-hover transition-colors text-left"
              >
                {carpetaEstudiante ? (
                  <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-text-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text-main">Crear una carpeta por estudiante</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Si está marcado, dentro de la carpeta de cada empresa se crearán subcarpetas por alumno con sus documentos individuales.
                  </p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-border-base">
              <button type="submit" disabled={savingCreacion} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {savingCreacion ? 'Guardando...' : 'Guardar Configuración'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── SECCIÓN CONVENIOS ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Convenios</h3>
              <p className="text-sm text-text-muted">
                Configura un enlace externo a la plataforma de convenios, si la hay.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorConvenios && (
            <div className="mb-4 p-3 bg-danger-soft text-danger rounded-lg text-sm border border-danger/20">{errorConvenios}</div>
          )}
          {successConvenios && (
            <div className="mb-4 p-3 bg-success-soft text-success-strong rounded-lg text-sm border border-success/20">
              {successConvenios}
            </div>
          )}
          <form onSubmit={handleSubmitConvenios} className="space-y-6">
            <div>
              <label className={labelClass}>URL de convenios</label>
              <input
                type="url"
                value={conveniosUrl}
                onChange={(e) => setConveniosUrl(e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
              <p className="text-[10px] text-text-muted mt-1">
                Si se informa, en la pantalla de Convenios aparecerá un botón que abre este enlace junto al botón "Nuevo Convenio".
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-border-base">
              <button type="submit" disabled={savingConvenios} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {savingConvenios ? 'Guardando...' : 'Guardar Configuración'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── SECCIÓN ANEXO DE RELACIÓN ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Anexo de Relación</h3>
              <p className="text-sm text-text-muted">
                Elige cómo se genera el anexo de relación de alumnos: con la aplicación o mediante un enlace externo.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {errorAnexo && (
            <div className="mb-4 p-3 bg-danger-soft text-danger rounded-lg text-sm border border-danger/20">{errorAnexo}</div>
          )}
          {successAnexo && (
            <div className="mb-4 p-3 bg-success-soft text-success-strong rounded-lg text-sm border border-success/20">
              {successAnexo}
            </div>
          )}
          <form onSubmit={handleSubmitAnexo} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnexoRelacionModo('app')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  anexoRelacionModo === 'app'
                    ? 'bg-primary-light border-primary shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                {anexoRelacionModo === 'app' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-border-base mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-4 w-4 ${anexoRelacionModo === 'app' ? 'text-primary' : 'text-text-muted'}`} />
                    <span className={`text-sm font-semibold ${anexoRelacionModo === 'app' ? 'text-primary' : 'text-text-main'}`}>Con la app</span>
                  </div>
                  <p className={`text-xs mt-1 ${anexoRelacionModo === 'app' ? 'text-primary' : 'text-text-muted'}`}>
                    El anexo se genera con la aplicación. Se muestran los botones de descarga DOCX y PDF y el correo incluye el documento adjunto.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAnexoRelacionModo('externo')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  anexoRelacionModo === 'externo'
                    ? 'bg-success-soft border-success shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                {anexoRelacionModo === 'externo' ? (
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-border-base mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ExternalLink className={`h-4 w-4 ${anexoRelacionModo === 'externo' ? 'text-success' : 'text-text-muted'}`} />
                    <span className={`text-sm font-semibold ${anexoRelacionModo === 'externo' ? 'text-success-strong' : 'text-text-main'}`}>Enlace externo</span>
                  </div>
                  <p className={`text-xs mt-1 ${anexoRelacionModo === 'externo' ? 'text-success' : 'text-text-muted'}`}>
                    El anexo se abre desde una URL externa. En relación se mostrará un botón que abre el enlace y el correo no adjuntará el documento.
                  </p>
                </div>
              </button>
            </div>
            {anexoRelacionModo === 'externo' && (
              <div>
                <label className={labelClass}>URL del anexo de relación</label>
                <input
                  type="url"
                  value={anexoRelacionUrl}
                  onChange={(e) => setAnexoRelacionUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
                <p className="text-[10px] text-text-muted mt-1">
                  En la pantalla de Relaciones, el apartado Anexo de Relación mostrará un botón que abre este enlace en el navegador.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 pt-4 border-t border-border-base">
              <button type="submit" disabled={savingAnexo} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {savingAnexo ? 'Guardando...' : 'Guardar Configuración'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── SECCIÓN ENVÍO A LA DAT ─── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <FolderUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">Enviar a la DAT</h3>
              <p className="text-sm text-text-muted">
                Indica si es necesario enviar la documentación a la DAT.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4 flex items-start gap-2 p-3 bg-primary-light/40 text-primary rounded-lg text-sm border border-primary/15">
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
            <p>Es necesario reiniciar la aplicación para que los cambios tomen efecto.</p>
          </div>
          {errorDat && (
            <div className="mb-4 p-3 bg-danger-soft text-danger rounded-lg text-sm border border-danger/20">{errorDat}</div>
          )}
          {successDat && (
            <div className="mb-4 p-3 bg-success-soft text-success-strong rounded-lg text-sm border border-success/20">
              {successDat}
            </div>
          )}
          <form onSubmit={handleSubmitDat} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDatModo('necesario')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  datModo === 'necesario'
                    ? 'bg-primary-light border-primary shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                {datModo === 'necesario' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-border-base mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderUp className={`h-4 w-4 ${datModo === 'necesario' ? 'text-primary' : 'text-text-muted'}`} />
                    <span className={`text-sm font-semibold ${datModo === 'necesario' ? 'text-primary' : 'text-text-main'}`}>Es necesario</span>
                  </div>
                  <p className={`text-xs mt-1 ${datModo === 'necesario' ? 'text-primary' : 'text-text-muted'}`}>
                    Se muestra la opción de menú "Enviar a la DAT" y las columnas "Fecha Envío DAT" y "Estado DAT" en el panel.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDatModo('no')}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  datModo === 'no'
                    ? 'bg-success-soft border-success shadow-sm'
                    : 'bg-surface-subtle border-border-base hover:bg-surface-hover'
                }`}
              >
                {datModo === 'no' ? (
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-border-base mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderUp className={`h-4 w-4 ${datModo === 'no' ? 'text-success' : 'text-text-muted'}`} />
                    <span className={`text-sm font-semibold ${datModo === 'no' ? 'text-success-strong' : 'text-text-main'}`}>No es necesario</span>
                  </div>
                  <p className={`text-xs mt-1 ${datModo === 'no' ? 'text-success' : 'text-text-muted'}`}>
                    Se oculta la opción de menú "Enviar a la DAT" y la información de la DAT en el panel.
                  </p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-border-base">
              <button type="submit" disabled={savingDat} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <span className="flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  {savingDat ? 'Guardando...' : 'Guardar Configuración'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}