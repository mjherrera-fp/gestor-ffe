import React, {useEffect, useState} from 'react';
import {Loader2, X} from 'lucide-react';
import {Alumno} from '../../../types/index.ts';
import {Modal} from '../../../components/ui/Modal.tsx';

interface Props {
    open: boolean;
    editingItem: { id?: number; fecha: string } | null;
    detalleAcademicoId?: number;
    onSave: (fecha: string, alumnoIds: number[]) => void;
    onClose: () => void;
}

export function ComunicacionDatFormModal({open, editingItem, detalleAcademicoId, onSave, onClose}: Props) {
    const [fecha, setFecha] = useState('');
    const [alumnos, setAlumnos] = useState<(Alumno & { selected: boolean })[]>([]);
    const [loading, setLoading] = useState(false);
    const [showConComunicacion, setShowConComunicacion] = useState(false);

    useEffect(() => {
        if (open) {
            setFecha(editingItem?.fecha || new Date().toISOString().split('T')[0]);
            setShowConComunicacion(false);
            loadAlumnos(false);
        }
    }, [open, editingItem, detalleAcademicoId]);

    const loadAlumnos = async (incluirConComunicacion: boolean) => {
        if (!detalleAcademicoId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/alumnos/con-relacion-completada?detalleAcademicoId=${detalleAcademicoId}&incluirConComunicacion=${incluirConComunicacion}`);
            if (res.ok) {
                const data: Alumno[] = await res.json();
                setAlumnos(data.map(a => ({...a, selected: false})));
            }
        } catch { /* ignore */
        }
        setLoading(false);
    };

    const handleToggleConComunicacion = () => {
        const next = !showConComunicacion;
        setShowConComunicacion(next);
        loadAlumnos(next);
    };

    const toggleAlumno = (id: number) => {
        setAlumnos(prev => prev.map(a => a.id === id ? {...a, selected: !a.selected} : a));
    };

    const toggleAll = () => {
        const allSelected = alumnos.every(a => a.selected);
        setAlumnos(prev => prev.map(a => ({...a, selected: !allSelected})));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedIds = alumnos.filter(a => a.selected).map(a => a.id!);
        if (!fecha || selectedIds.length === 0) return;
        onSave(fecha, selectedIds);
    };

    return (
        <Modal open={open} onClose={onClose} maxWidth="lg">
            <form onSubmit={handleSubmit} className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-text-main">
                        {editingItem ? 'Editar comunicación' : 'Nueva comunicación'}
                    </h3>
                    <button type="button" onClick={onClose}
                            className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-hover transition-all">
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-text-main mb-1.5">Fecha de la comunicación</label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={e => setFecha(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border-base rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                <div className="mb-3 flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={showConComunicacion} onChange={handleToggleConComunicacion}
                               className="sr-only peer"/>
                        <div
                            className="w-9 h-5 bg-border-base peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success peer-focus:ring-2 peer-focus:ring-success/30"/>
                    </label>
                    <span
                        className="text-[10px] font-medium text-text-muted">Mostrar estudiantes con comunicación previa</span>
                </div>

                <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Estudiantes con relación completada {loading && <Loader2 className="h-3 w-3 animate-spin inline"/>}
          </span>
                    <button type="button" onClick={toggleAll}
                            className="text-[9px] font-bold text-primary hover:text-primary/90 uppercase">
                        {alumnos.every(a => a.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 border border-border-base rounded-xl p-2 mb-6">
                    {alumnos.length === 0 && (
                        <p className="text-center text-[10px] text-text-muted py-6">No hay estudiantes disponibles</p>
                    )}
                    {alumnos.map(a => (
                        <label key={a.id}
                               className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-subtle cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={a.selected}
                                onChange={() => toggleAlumno(a.id!)}
                                className="rounded border-border-base text-primary focus:ring-primary/30 h-3.5 w-3.5"
                            />
                            <span className="text-xs font-medium text-text-main">{a.apellidos}, {a.nombre}</span>
                            <span className="text-[10px] text-text-muted ml-auto">{a.dni}</span>
                        </label>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={!fecha || alumnos.filter(a => a.selected).length === 0}
                    className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {editingItem ? 'Guardar cambios' : 'Crear comunicación'}
                </button>
            </form>
        </Modal>
    );
}
