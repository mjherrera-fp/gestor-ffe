import {useEffect, useState} from 'react';
import {Cloud, Eye, EyeOff, FolderOpen, Info, Loader2, Save, X} from 'lucide-react';
import {Modal} from '../../../components/ui/Modal.tsx';

interface DetalleAcademico {
    id: number;
    centroNombre?: string;
    nombreCorto?: string;
    codigoGrupo?: string;
}

interface FolderItem {
    name: string;
    path: string;
}

function FolderPickerModal({open, onClose, onSelect, serverUrl, username, password}: {
    open: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    serverUrl: string;
    username: string;
    password: string
}) {
    const [currentPath, setCurrentPath] = useState('/');
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setCurrentPath('/');
        loadFolders('/');
    }, [open]);

    const loadFolders = async (path: string) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/nextcloud/list-folders', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({path, server_url: serverUrl, username, password}),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({error: 'Error al conectar'}));
                const diag = err.diag ? ' | ' + JSON.stringify(err.diag) : '';
                throw new Error(err.error + diag);
            }
            const data = await res.json();
            setFolders(data.folders || []);
        } catch (e: any) {
            setError(e.message || 'Error de conexión');
            setFolders([]);
        }
        setLoading(false);
    };

    const navigateTo = (folderPath: string) => {
        setCurrentPath(folderPath);
        loadFolders(folderPath);
    };

    const goUp = () => {
        const parent = currentPath === '/' ? '/' : currentPath.split('/').slice(0, -1).join('/') || '/';
        navigateTo(parent);
    };

    const breadcrumbs = currentPath === '/' ? ['/'] : ['/', ...currentPath.split('/').filter(Boolean)];

    return (
        <Modal open={open} onClose={onClose} maxWidth="lg" cardClass="rounded-3xl">
            <div className="px-6 pt-6 pb-4 border-b border-border-base flex items-center justify-between">
                <h3 className="text-lg font-black text-text-main">Seleccionar carpeta</h3>
                <button onClick={onClose}
                        className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-hover transition-all">
                    <X className="h-5 w-5"/>
                </button>
            </div>
            <div className="p-6 space-y-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-xs font-bold text-text-muted">
                    {breadcrumbs.map((part, i) => (
                        <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-muted">/</span>}
                            <button
                                onClick={() => navigateTo(i === 0 ? '/' : breadcrumbs.slice(1, i + 1).join('/'))}
                                className="hover:text-primary transition-colors"
                            >
                {part || '...'}
              </button>
            </span>
                    ))}
                </div>

                {error && (
                    <div
                        className="bg-danger-soft border border-danger/20 rounded-xl px-4 py-3 text-xs font-medium text-danger">
                        {error}
                    </div>
                )}

                {/* Lista de carpetas */}
                <div className="border border-border-base rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 text-border-base animate-spin"/>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="py-8 text-center text-xs text-text-muted font-medium italic">
                            No hay subcarpetas
                        </div>
                    ) : (
                        <div className="divide-y divide-border-base">
                            {currentPath !== '/' && (
                                <button
                                    onClick={goUp}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-surface-subtle transition-colors text-left"
                                >
                                    <FolderOpen className="h-4 w-4 text-text-muted"/>
                                    ..
                                </button>
                            )}
                            {folders.map((folder) => (
                                <button
                                    key={folder.path}
                                    onClick={() => navigateTo(folder.path)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-text-main hover:bg-surface-subtle transition-colors text-left"
                                >
                                    <FolderOpen className="h-4 w-4 text-warning-strong"/>
                                    {folder.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-bold text-text-muted hover:bg-surface-hover rounded-xl border border-border-base transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSelect(currentPath)}
                        className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                    >
                        Seleccionar esta carpeta
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function TabCloud() {
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [detalles, setDetalles] = useState<DetalleAcademico[]>([]);
    const [folders, setFolders] = useState<Record<number, string>>({});
    const [sendAddressFolders, setSendAddressFolders] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [folderPickerOpen, setFolderPickerOpen] = useState(false);
    const [folderPickerTarget, setFolderPickerTarget] = useState<number | string | null>(null);
    const SEND_ADDRESS_KEYS: Record<string, string> = {
        folder_send_principal_conv: 'Convenio / Acuerdo',
        folder_send_principal_rel: 'Relaciones',
        folder_send_principal_com_dat: 'Comunicación DAT',
        folder_send_principal_camb_cond: 'Cambio de condiciones',
        folder_send_exclusion: 'Exclusiones',
    };

    useEffect(() => {
        loadConfig();
        loadDetalles();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/profesor/config/cloud');
            if (!res.ok) return;
            const config: Record<string, string> = await res.json();
            setServerUrl(config.server_url || '');
            setUsername(config.username || '');
            setPassword(config.password || '');
            const foldersMap: Record<number, string> = {};
            const sendMap: Record<string, string> = {};
            for (const [key, val] of Object.entries(config)) {
                if (!val) continue;
                if (key in SEND_ADDRESS_KEYS) {
                    sendMap[key] = val;
                } else if (key.startsWith('folder_')) {
                    const id = Number(key.replace('folder_', ''));
                    if (!isNaN(id)) foldersMap[id] = val;
                }
            }
            setFolders(foldersMap);
            setSendAddressFolders(sendMap);
        } catch { /* ignore */
        }
    };

    const loadDetalles = async () => {
        try {
            const res = await fetch('/api/detalles-academicos');
            if (res.ok) setDetalles(await res.json());
        } catch { /* ignore */
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        const data: Record<string, string> = {
            server_url: serverUrl,
            username,
            password,
            ...sendAddressFolders,
        };
        for (const [id, folder] of Object.entries(folders)) {
            if (folder) data[`folder_${id}`] = folder;
        }
        try {
            const res = await fetch('/api/profesor/config/cloud', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            });
            if (res.ok) setSuccess(true);
        } catch { /* ignore */
        }
        setSaving(false);
    };

    const handleFolderSelected = (path: string) => {
        if (folderPickerTarget !== null) {
            if (folderPickerTarget in SEND_ADDRESS_KEYS) {
                setSendAddressFolders(prev => ({...prev, [folderPickerTarget as string]: path}));
            } else {
                setFolders(prev => ({...prev, [folderPickerTarget as number]: path}));
            }
        }
        setFolderPickerOpen(false);
        setFolderPickerTarget(null);
    };

    const getDetalleLabel = (d: DetalleAcademico) => {
        const displayName = d.nombreCorto || d.codigoGrupo || `ID ${d.id}`;
        const centro = d.centroNombre || '';
        return centro ? `${displayName} (${centro})` : displayName;
    };

    return (
        <div className="bg-surface-card rounded-2xl border border-border-base overflow-hidden">
            <div className="px-6 py-5 border-b border-border-base flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-light text-primary">
                    <Cloud className="h-5 w-5"/>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-text-main">Configuración de NextCloud</h2>
                    <p className="text-sm text-text-muted">Integración con NextCloud para almacenar documentos</p>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Servidor */}
                <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase ml-1 mb-1">Servidor
                        URL</label>
                    <input
                        type="text"
                        value={serverUrl}
                        onChange={e => setServerUrl(e.target.value)}
                        placeholder="https://nextcloud.midominio.es"
                        className="w-full bg-surface-card border border-border-base rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                </div>

                {/* Usuario */}
                <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase ml-1 mb-1">Usuario</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-surface-card border border-border-base rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                </div>

                {/* Contraseña */}
                <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase ml-1 mb-1">Contraseña</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-surface-card border border-border-base rounded-xl px-4 py-2.5 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                        />
                        <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </button>
                    </div>
                </div>

                {/* Aviso contraseña app */}
                <div className="bg-warning-soft border border-warning/20 rounded-xl px-4 py-3 flex items-start gap-3">
                    <Info className="h-4 w-4 text-warning-strong shrink-0 mt-0.5"/>
                    <div className="text-xs text-warning-strong leading-relaxed">
                        <p className="font-bold mb-1">Necesitas una contraseña de aplicación</p>
                        <p>
                            NextCloud no acepta la contraseña de tu cuenta para conexiones desde aplicaciones externas.
                            Genera una nueva contraseña en{' '}
                            <strong>Ajustes &gt; Seguridad &gt; Contraseñas de aplicación</strong> de tu NextCloud.
                        </p>
                    </div>
                </div>

                {/* Separador */}
                <hr className="border-border-base"/>

                {/* Carpetas por grupo */}
                <div>
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Carpetas por
                        ciclo</h3>
                    <div className="space-y-2">
                        {detalles.map(d => (
                            <div key={d.id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap min-w-40 truncate"
                      title={getDetalleLabel(d)}>
                  {getDetalleLabel(d)}
                </span>
                                <input
                                    type="text"
                                    value={folders[d.id] || ''}
                                    onChange={e => setFolders(prev => ({...prev, [d.id]: e.target.value}))}
                                    placeholder="/NextCloud/Ruta"
                                    className="flex-1 bg-surface-card border border-border-base rounded-lg px-3 py-1.5 text-[11px] font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                />
                                <button
                                    onClick={async () => {
                                        await handleSave();
                                        setFolderPickerTarget(d.id);
                                        setFolderPickerOpen(true);
                                    }}
                                    className="p-1.5 text-text-muted hover:text-primary transition-all rounded-lg hover:bg-surface-subtle"
                                    title="Seleccionar carpeta"
                                >
                                    <FolderOpen className="h-4 w-4"/>
                                </button>
                            </div>
                        ))}
                        {detalles.length === 0 && (
                            <p className="text-xs text-text-muted italic font-medium">No hay ciclos disponibles</p>
                        )}
                    </div>
                </div>

                {/* Carpeta enviar a dirección */}
                <div>
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Carpeta enviar a
                        dirección</h3>
                    <div className="space-y-2">
                        {Object.entries(SEND_ADDRESS_KEYS).map(([key, label]) => (
                            <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap min-w-40 truncate">
                  {label}
                </span>
                                <input
                                    type="text"
                                    value={sendAddressFolders[key] || ''}
                                    onChange={e => setSendAddressFolders(prev => ({...prev, [key]: e.target.value}))}
                                    placeholder="/NextCloud/Ruta"
                                    className="flex-1 bg-surface-card border border-border-base rounded-lg px-3 py-1.5 text-[11px] font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                />
                                <button
                                    onClick={async () => {
                                        await handleSave();
                                        setFolderPickerTarget(key);
                                        setFolderPickerOpen(true);
                                    }}
                                    className="p-1.5 text-text-muted hover:text-primary transition-all rounded-lg hover:bg-surface-subtle"
                                    title="Seleccionar carpeta"
                                >
                                    <FolderOpen className="h-4 w-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Botón guardar */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                        {saving ? 'Guardando...' : 'Guardar configuración'}
                    </button>
                    {success && <span className="text-xs text-success font-bold">Configuración guardada correctamente</span>}
                </div>
            </div>

            <FolderPickerModal
                open={folderPickerOpen}
                onClose={() => {
                    setFolderPickerOpen(false);
                    setFolderPickerTarget(null);
                }}
                onSelect={handleFolderSelected}
                serverUrl={serverUrl}
                username={username}
                password={password}
            />
        </div>
    );
}

export default TabCloud;
