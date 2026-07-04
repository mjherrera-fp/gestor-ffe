import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, Cloud, Download, Eye, FileText, Loader2, Trash2, Upload, X} from 'lucide-react';
import {Modal} from './ui/Modal.tsx';

interface DocumentoItem {
    id: number;
    nombreFichero: string;
    comentario?: string;
    version: number;
    fechaSubida: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    entidad: string;
    entidadId: number;
    entityNombre: string;
    entityRef: string;
    prefijo: string;
    detalleAcademicoId?: number;
    estado?: string;
    onEntityUpdated?: () => void;
    alumnos?: Array<{ nombre: string; apellidos: string; dni: string; detalleAcademicoId: number }>;
    alumnoId?: number;
    fechaComunicacion?: string;
}

function defaultFilename(entityRef: string, entityNombre: string, prefijo: string): string {
    const parts = entityRef.split('/');
    const ref = parts.length > 1 ? parts[parts.length - 1].trim() : entityRef.trim();
    const paddedRef = ref.padStart(4, '0');
    const sanitized = entityNombre.replace(/[<>:"/\\|?*]/g, '_').trim();
    return `${prefijo}_${paddedRef}_${sanitized}.pdf`;
}

export function GestorDocumentalModal({
                                          open,
                                          onClose,
                                          entidad,
                                          entidadId,
                                          entityNombre,
                                          entityRef,
                                          prefijo,
                                          detalleAcademicoId,
                                          estado,
                                          onEntityUpdated,
                                          alumnos,
                                          alumnoId,
                                          fechaComunicacion
                                      }: Props) {
    const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [nombreFichero, setNombreFichero] = useState('');
    const [comentario, setComentario] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<DocumentoItem | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [nextcloudUploading, setNextcloudUploading] = useState(false);
    const [nextcloudConfirmOpen, setNextcloudConfirmOpen] = useState(false);
    const [nextcloudFolderPaths, setNextcloudFolderPaths] = useState<string[]>([]);
    const [nextcloudDocId, setNextcloudDocId] = useState<number | null>(null);
    const [nextcloudResult, setNextcloudResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [relacionCodigoGrupo, setRelacionCodigoGrupo] = useState('');
    const [cloudConfigured, setCloudConfigured] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const apiBase = `/api/documentos/${entidad}`;

    const defaultName = useMemo(() => {
        if (entidad === 'relacion' && alumnos && alumnos.length > 0 && relacionCodigoGrupo) {
            const dnis = alumnos.map(a => a.dni).join('_');
            return `RELA_${relacionCodigoGrupo}_${dnis}.pdf`;
        }
        if ((entidad === 'plan-formativo' || entidad === 'seguimiento' || entidad === 'valoracion') && alumnos && alumnos.length > 0 && relacionCodigoGrupo) {
            const dni = alumnos[0].dni;
            return `${prefijo}_${relacionCodigoGrupo}_${dni}.pdf`;
        }
        if (entidad === 'com-dat' && relacionCodigoGrupo && fechaComunicacion) {
            const fechaNum = fechaComunicacion.replace(/-/g, '');
            return `CDAT_${relacionCodigoGrupo}_${fechaNum}.pdf`;
        }
        return defaultFilename(entityRef, entityNombre, prefijo);
    }, [entityRef, entityNombre, prefijo, entidad, alumnos, relacionCodigoGrupo, fechaComunicacion]);

    const fetchDocumentos = useCallback(async () => {
        setLoading(true);
        try {
            const params = alumnoId
                ? `?relacionId=${entidadId}&alumnoId=${alumnoId}`
                : entidad === 'com-dat'
                    ? `?comunicacionDatId=${entidadId}`
                    : `?${entidad}Id=${entidadId}`;
            const res = await fetch(`${apiBase}${params}`);
            if (res.ok) setDocumentos(await res.json());
        } catch { /* ignore */
        }
        setLoading(false);
    }, [apiBase, entidadId, alumnoId]);

    useEffect(() => {
        if (open) {
            fetchDocumentos();
            setFile(null);
            setComentario('');
            setViewingDoc(null);
            if ((entidad === 'relacion' || entidad === 'plan-formativo' || entidad === 'seguimiento' || entidad === 'valoracion' || entidad === 'com-dat') && alumnos && alumnos.length > 0) {
                const daId = alumnos[0].detalleAcademicoId;
                fetch('/api/detalles-academicos')
                    .then(r => r.json())
                    .then(list => {
                        const da = list.find((d: any) => d.id === daId);
                        if (da) {
                            setRelacionCodigoGrupo(da.codigoGrupo || '');
                            if (entidad === 'relacion') {
                                setNombreFichero(`RELA_${da.codigoGrupo || ''}_${alumnos.map(a => a.dni).join('_')}.pdf`);
                            } else if (entidad === 'com-dat' && fechaComunicacion) {
                                const fechaNum = fechaComunicacion.replace(/-/g, '');
                                setNombreFichero(`CDAT_${da.codigoGrupo || ''}_${fechaNum}.pdf`);
                            } else {
                                setNombreFichero(`${prefijo}_${da.codigoGrupo || ''}_${alumnos[0].dni}.pdf`);
                            }
                        }
                    })
                    .catch(() => {
                    });
            } else {
                setNombreFichero(defaultName);
            }

            if (estado === 'COMPLETADO' || estado === 'PENDIENTE_ENVIAR_DIRECTOR' || estado === 'RECIBIDO') {
                fetch('/api/profesor/config/cloud')
                    .then(r => r.json())
                    .then(config => {
                        setCloudConfigured(!!(config.server_url && config.username && config.password));
                    })
                    .catch(() => setCloudConfigured(false));
            } else {
                setCloudConfigured(false);
            }
        }
    }, [open, fetchDocumentos, defaultName, entidad, alumnos, estado]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'application/pdf') setFile(droppedFile);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        if (alumnoId) {
            fd.append('relacionId', String(entidadId));
            fd.append('alumnoId', String(alumnoId));
        } else if (entidad === 'com-dat') {
            fd.append('comunicacionDatId', String(entidadId));
        } else {
            fd.append(`${entidad}Id`, String(entidadId));
        }
        fd.append('comentario', comentario);
        fd.append('nombreFichero', nombreFichero || defaultName);
        try {
            const res = await fetch(`${apiBase}`, {method: 'POST', body: fd});
            if (res.ok) {
                setFile(null);
                setComentario('');
                if (inputRef.current) inputRef.current.value = '';
                fetchDocumentos();
            }
        } catch { /* ignore */
        }
        setUploading(false);
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirmId === null) return;
        try {
            const res = await fetch(`${apiBase}/${deleteConfirmId}`, {method: 'DELETE'});
            if (res.ok) {
                setDeleteConfirmId(null);
                fetchDocumentos();
            }
        } catch { /* ignore */
        }
    };

    const handleView = (doc: DocumentoItem) => {
        setViewingDoc(doc);
    };

    const handleCloseView = () => {
        setViewingDoc(null);
    };

    const handleUploadToNextCloud = async () => {
        if (nextcloudDocId === null) return;
        setNextcloudUploading(true);
        setNextcloudResult(null);
        try {
            const downloadRes = await fetch(`${apiBase}/${nextcloudDocId}/download`);
            if (!downloadRes.ok) throw new Error('No se pudo descargar el documento');
            const blob = await downloadRes.blob();
            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const chunkSize = 16384;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            const base64 = btoa(binary);

            const doc = documentos.find(d => d.id === nextcloudDocId);
            const filename = doc?.nombreFichero || 'documento.pdf';

            let successCount = 0;
            const errors: string[] = [];

            for (const folderPath of nextcloudFolderPaths) {
                try {
                    const uploadRes = await fetch('/api/nextcloud/upload', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            folder: folderPath,
                            filename,
                            contentBase64: base64,
                        }),
                    });
                    if (!uploadRes.ok) {
                        const err = await uploadRes.json().catch(() => ({error: 'Error al subir'}));
                        throw new Error(err.error || 'Error al subir a NextCloud');
                    }
                    successCount++;
                } catch (err: any) {
                    errors.push(`Error en "${folderPath}": ${err.message}`);
                }
            }

            if (successCount === 0 && errors.length > 0) {
                throw new Error(errors.join('\n'));
            }

            // Si venía de PENDIENTE_ENVIAR_DIRECTOR, avanzar automáticamente
            if (estado === 'PENDIENTE_ENVIAR_DIRECTOR' && successCount > 0) {
                if (entidad === 'relacion') {
                    const relRes = await fetch(`/api/relaciones-alumnos/${entidadId}`);
                    if (relRes.ok) {
                        const rel = await relRes.json();
                        await fetch(`/api/relaciones-alumnos/${entidadId}`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({...rel, estado: 'PENDIENTE_FIRMA_DIRECTOR'}),
                        });
                        onEntityUpdated?.();
                    }
                } else if (entidad === 'com-dat') {
                    await fetch(`/api/comunicaciones-dat/${entidadId}/estado`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({estado: 'PENDIENTE_FIRMA_DIRECTOR'}),
                    });
                    onEntityUpdated?.();
                } else {
                    const convRes = await fetch(`/api/convenios/${entidadId}`);
                    if (convRes.ok) {
                        const conv = await convRes.json();
                        await fetch(`/api/convenios/${entidadId}`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({convenio: {...conv, estado: 'PENDIENTE_FIRMA_DIRECTOR'}}),
                        });
                        onEntityUpdated?.();
                    }
                }
            }

            const msg = successCount > 1
                ? `Documento subido correctamente a ${successCount} carpetas de NextCloud`
                : 'Documento subido correctamente a NextCloud';
            setNextcloudResult({type: 'success', message: msg});
        } catch (e: any) {
            setNextcloudResult({type: 'error', message: e.message || 'Error al subir a NextCloud'});
        }
        setNextcloudUploading(false);
    };

    const openNextCloudConfirm = async (docId: number) => {
        setNextcloudDocId(docId);
        setNextcloudResult(null);
        try {
            const configRes = await fetch('/api/profesor/config/cloud');
            if (!configRes.ok) {
                setNextcloudResult({
                    type: 'error',
                    message: 'NextCloud no configurado. Ve a Configuración > Cloud para configurarlo.'
                });
                setNextcloudConfirmOpen(true);
                return;
            }
            const config: Record<string, string> = await configRes.json();

            if (entidad === 'com-dat' && (estado === 'PENDIENTE_FIRMA_DIRECTOR' || estado === 'PENDIENTE_ENVIAR_DIRECTOR')) {
                const folder = config['folder_send_principal_com_dat'] || '';
                if (!folder) {
                    setNextcloudResult({
                        type: 'error',
                        message: 'No está definida la ruta en Configuración > Cloud > Carpeta enviar a dirección > Comunicación DAT'
                    });
                    setNextcloudConfirmOpen(true);
                    return;
                }
                setNextcloudFolderPaths([folder]);
                setNextcloudConfirmOpen(true);
            } else if (entidad === 'com-dat' && estado === 'COMPLETADO') {
                const folderKey = detalleAcademicoId ? `folder_${detalleAcademicoId}` : null;
                const folder = (folderKey && config[folderKey]) || config.folder_default || '/';
                setNextcloudFolderPaths([folder]);
                setNextcloudConfirmOpen(true);
            } else if (estado === 'PENDIENTE_ENVIAR_DIRECTOR') {
                const sendKey = entidad === 'relacion' ? 'folder_send_principal_rel' : 'folder_send_principal_conv';
                const label = entidad === 'relacion' ? 'Relaciones' : 'Convenio / Acuerdo';
                const folder = config[sendKey] || '';
                if (!folder) {
                    setNextcloudResult({
                        type: 'error',
                        message: `No está definida la ruta en Configuración > Cloud > Carpeta enviar a dirección > ${label}`
                    });
                    setNextcloudConfirmOpen(true);
                    return;
                }
                setNextcloudFolderPaths([folder]);
                setNextcloudConfirmOpen(true);
            } else if ((estado === 'COMPLETADO' || estado === 'RECIBIDO') && alumnos && alumnos.length > 0) {
                const folderKey = detalleAcademicoId ? `folder_${detalleAcademicoId}` : null;
                const baseFolder = (folderKey && config[folderKey]) || config.folder_default || '/';
                const paths = alumnos.map(a => {
                    const studentFolder = `${a.apellidos}, ${a.nombre}`;
                    return `${baseFolder.replace(/\/+$/, '')}/${studentFolder}`;
                });
                setNextcloudFolderPaths(paths);
                setNextcloudConfirmOpen(true);
            } else {
                const folderKey = detalleAcademicoId ? `folder_${detalleAcademicoId}` : null;
                const folder = (folderKey && config[folderKey]) || config.folder_default || '/';
                setNextcloudFolderPaths([folder]);
                setNextcloudConfirmOpen(true);
            }
        } catch {
            setNextcloudResult({type: 'error', message: 'Error al cargar configuración de NextCloud'});
            setNextcloudConfirmOpen(true);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const displayRef = useMemo(() => entityRef, [entityRef]);

    const subtitleLabel = useMemo(() => {
        switch (entidad) {
            case 'plan-formativo':
                return 'Plan Formativo';
            case 'seguimiento':
                return 'Seguimiento';
            case 'valoracion':
                return 'Valoracion';
            case 'com-dat':
                return 'Comunicaciones DAT';
            default:
                return null;
        }
    }, [entidad]);

    const cloudAllowed = useMemo(() => {
        if (!estado) return false;
        if (entidad === 'com-dat') {
            return estado === 'COMPLETADO' || estado === 'PENDIENTE_FIRMA_DIRECTOR' || estado === 'PENDIENTE_ENVIAR_DIRECTOR';
        }
        if (entidad === 'convenio' || entidad === 'relacion') {
            return estado === 'COMPLETADO' || estado === 'PENDIENTE_ENVIAR_DIRECTOR';
        }
        return estado === 'COMPLETADO' || estado === 'RECIBIDO';
    }, [estado, entidad]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="4xl" cardClass="rounded-3xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    {viewingDoc && (
                        <button onClick={handleCloseView}
                                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
                            <ArrowLeft className="h-5 w-5"/>
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-black text-slate-800">
                            {viewingDoc ? viewingDoc.nombreFichero : 'Gestor Documental'}
                        </h2>
                        {!viewingDoc && (
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {subtitleLabel === 'Comunicaciones DAT'
                                    ? `${subtitleLabel} - ${fechaComunicacion || entityNombre}`
                                    : subtitleLabel
                                        ? `${subtitleLabel}: ${entityNombre} (Relacion Ref: ${displayRef})`
                                        : `Ref: ${displayRef} — ${entityNombre}`
                                }
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
                    <X className="h-5 w-5"/>
                </button>
            </div>

            {viewingDoc ? (
                <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
                    <iframe
                        src={`${apiBase}/${viewingDoc.id}/download`}
                        className="w-full h-160 rounded-xl border border-slate-200"
                        title={viewingDoc.nombreFichero}
                    />
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400 font-medium">
                            {viewingDoc.comentario && (
                                <span className="italic">{viewingDoc.comentario}</span>
                            )}
                        </div>
                        <a
                            href={`${apiBase}/${viewingDoc.id}/download`}
                            download={viewingDoc.nombreFichero}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
                        >
                            <Download className="h-4 w-4"/> Descargar
                        </a>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
                    {/* Drop Zone + Comentario */}
                    <div className="space-y-4">
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => inputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                dragOver
                                    ? 'border-primary bg-primary/5'
                                    : file
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-slate-200 bg-slate-50 hover:border-primary/40 hover:bg-primary/5'
                            }`}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText className="h-10 w-10 text-emerald-500"/>
                                    <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            if (inputRef.current) inputRef.current.value = '';
                                        }}
                                        className="text-xs text-red-500 hover:text-red-600 font-semibold underline"
                                    >
                                        Quitar archivo
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-10 w-10 text-slate-300"/>
                                    <p className="text-sm font-bold text-slate-500">
                                        Arrastra el PDF aquí o haz clic para seleccionar
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">Solo PDF</p>
                                </div>
                            )}
                        </div>

                        {file && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1">
                                    Nombre del documento
                                </label>
                                <input
                                    type="text"
                                    value={nombreFichero}
                                    onChange={(e) => setNombreFichero(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                />
                            </div>
                        )}

                        <textarea
                            placeholder="Comentario (opcional)"
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            rows={2}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                        />

                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading || !nombreFichero.trim()}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                                !file || uploading || !nombreFichero.trim()
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                            }`}
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin"/>
                            ) : (
                                <Upload className="h-4 w-4"/>
                            )}
                            {uploading ? 'Subiendo...' : 'Subir Documento'}
                        </button>
                    </div>

                    {/* Histórico */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Histórico de documentos
                        </h3>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 text-slate-300 animate-spin"/>
                            </div>
                        ) : documentos.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2"/>
                                <p className="text-xs text-slate-400 font-medium italic">
                                    No hay documentos subidos
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documentos.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-slate-200 transition-all"
                                    >
                                        <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0">
                                            <FileText className="h-4 w-4"/>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary uppercase">
                          v{doc.version}
                        </span>
                                                <span className="text-xs font-bold text-slate-700 truncate">
                          {doc.nombreFichero}
                        </span>
                                            </div>
                                            <div
                                                className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                <span>{formatDate(doc.fechaSubida)}</span>
                                                {doc.comentario && (
                                                    <>
                                                        <span className="text-slate-200">|</span>
                                                        <span className="truncate italic">{doc.comentario}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleView(doc)}
                                                className="p-1.5 text-slate-400 hover:text-primary transition-all rounded-lg hover:bg-slate-50"
                                                title="Ver documento"
                                            >
                                                <Eye className="h-4 w-4"/>
                                            </button>
                                            {cloudConfigured && cloudAllowed && (
                                                <button
                                                    onClick={() => openNextCloudConfirm(doc.id)}
                                                    className="p-1.5 text-slate-400 hover:text-sky-600 transition-all rounded-lg hover:bg-slate-50"
                                                    title="Subir a NextCloud"
                                                >
                                                    <Cloud className="h-4 w-4"/>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDeleteConfirmId(doc.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-slate-50"
                                                title="Eliminar documento"
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ── MODAL: Confirmar eliminación ── */}
            {deleteConfirmId !== null && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-70 p-4">
                    <div
                        className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5"/>
                        </button>
                        <div className="p-8 text-center">
                            <div
                                className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="h-8 w-8"/>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-8">
                                Esta acción eliminará el documento de forma permanente y no se puede deshacer.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: Confirmar subida a NextCloud ── */}
            {nextcloudConfirmOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-70 p-4">
                    <div
                        className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => {
                                setNextcloudConfirmOpen(false);
                                setNextcloudDocId(null);
                                setNextcloudResult(null);
                            }}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5"/>
                        </button>

                        {nextcloudResult ? (
                            /* ── Resultado ── */
                            <div className="p-8 text-center">
                                <div
                                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${nextcloudResult.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                    {nextcloudResult.type === 'success' ? (
                                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                             strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                        </svg>
                                    ) : (
                                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                             strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    )}
                                </div>
                                <h3 className={`text-xl font-black mb-3 ${nextcloudResult.type === 'success' ? 'text-slate-900' : 'text-red-600'}`}>
                                    {nextcloudResult.type === 'success' ? 'Subida completada' : 'Error de subida'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-8">{nextcloudResult.message}</p>
                                <button
                                    onClick={() => {
                                        setNextcloudConfirmOpen(false);
                                        setNextcloudDocId(null);
                                        setNextcloudResult(null);
                                    }}
                                    className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                                >
                                    Aceptar
                                </button>
                            </div>
                        ) : nextcloudUploading ? (
                            /* ── Subiendo ── */
                            <div className="p-8 text-center">
                                <div
                                    className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Loader2 className="h-8 w-8 animate-spin"/>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-3">Subiendo a NextCloud</h3>
                                <p className="text-sm text-slate-500 font-medium">Por favor, espera mientras se sube el
                                    documento...</p>
                            </div>
                        ) : (
                            /* ── Confirmación inicial ── */
                            <div className="p-8 text-center">
                                <div
                                    className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Cloud className="h-8 w-8"/>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-3">Subir a NextCloud</h3>
                                <p className="text-sm text-slate-500 font-medium mb-4">
                                    Se va a subir el documento seleccionado
                                    a {nextcloudFolderPaths.length > 1 ? `las ${nextcloudFolderPaths.length} carpetas` : 'la carpeta'} de
                                    NextCloud:
                                </p>
                                <div
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-8 text-xs font-mono font-bold text-slate-600 break-all space-y-1 max-h-40 overflow-y-auto">
                                    {nextcloudFolderPaths.map((p, i) => (
                                        <div key={i}>{p || '/'}</div>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setNextcloudConfirmOpen(false);
                                            setNextcloudDocId(null);
                                        }}
                                        className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUploadToNextCloud}
                                        className="flex-1 py-3 bg-sky-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
                                    >
                                        Subir
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default GestorDocumentalModal;
