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
                    <h3 className="text-lg font-black text-slate-800">
                        {editingItem ? 'Editar comunicación' : 'Nueva comunicación'}
                    </h3>
                    <button type="button" onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha de la comunicación</label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={e => setFecha(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    />
                </div>

                <div className="mb-3 flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={showConComunicacion} onChange={handleToggleConComunicacion}
                               className="sr-only peer"/>
                        <div
                            className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"/>
                    </label>
                    <span
                        className="text-[10px] font-medium text-slate-500">Mostrar estudiantes con comunicación previa</span>
                </div>

                <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Estudiantes con relación completada {loading && <Loader2 className="h-3 w-3 animate-spin inline"/>}
          </span>
                    <button type="button" onClick={toggleAll}
                            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 uppercase">
                        {alumnos.every(a => a.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2 mb-6">
                    {alumnos.length === 0 && (
                        <p className="text-center text-[10px] text-slate-400 py-6">No hay estudiantes disponibles</p>
                    )}
                    {alumnos.map(a => (
                        <label key={a.id}
                               className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={a.selected}
                                onChange={() => toggleAlumno(a.id!)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-200 h-3.5 w-3.5"
                            />
                            <span className="text-xs font-medium text-slate-700">{a.apellidos}, {a.nombre}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{a.dni}</span>
                        </label>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={!fecha || alumnos.filter(a => a.selected).length === 0}
                    className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {editingItem ? 'Guardar cambios' : 'Crear comunicación'}
                </button>
            </form>
        </Modal>
    );
}
