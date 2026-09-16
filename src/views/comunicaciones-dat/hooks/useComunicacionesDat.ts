import {useCallback, useEffect, useMemo, useState} from 'react';
import {ComunicacionDAT, ComunicacionDATEstado} from '../../../types/index.ts';

export function useComunicacionesDat(cursoId: number, detalleAcademicoId?: number) {
    const [items, setItems] = useState<ComunicacionDAT[]>([]);
    const [selectedItem, setSelectedItem] = useState<ComunicacionDAT | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<ComunicacionDAT | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [showDocManager, setShowDocManager] = useState(false);
    const [docManagerTarget, setDocManagerTarget] = useState<ComunicacionDAT | null>(null);
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'fecha' | 'estado'>('fecha');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const fetchData = useCallback(async () => {
        if (!detalleAcademicoId) return;
        try {
            const res = await fetch(`/api/comunicaciones-dat?detalleAcademicoId=${detalleAcademicoId}`);
            if (res.ok) {
                const data: ComunicacionDAT[] = await res.json();
                setItems(data);
            }
        } catch { /* ignore */
        }
    }, [detalleAcademicoId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!showForm && !showDeleteConfirm && !showDocManager) {
            fetchData();
        }
    }, [showForm, showDeleteConfirm, showDocManager, fetchData]);

    const filteredAndSortedItems = useMemo(() => {
        let result = [...items];

        if (statusFilter !== 'all') {
            result = result.filter(item => item.estado === statusFilter);
        }

        if (listSearchTerm) {
            const term = listSearchTerm.toLowerCase();
            result = result.filter(item => {
                const fechaMatch = item.fecha.toLowerCase().includes(term);
                const alumnoMatch = item.alumnos?.some(a =>
                    a.nombre.toLowerCase().includes(term) ||
                    a.apellidos.toLowerCase().includes(term) ||
                    a.dni.toLowerCase().includes(term)
                );
                return fechaMatch || alumnoMatch;
            });
        }

        result.sort((a, b) => {
            let cmp: number;
            if (sortBy === 'fecha') {
                cmp = a.fecha.localeCompare(b.fecha);
            } else {
                cmp = (a.estado || '').localeCompare(b.estado || '');
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [items, listSearchTerm, statusFilter, sortBy, sortOrder]);

    const setBy = (field: 'fecha' | 'estado') => setSortBy(field);

    const handleEdit = (item: ComunicacionDAT) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleNew = () => {
        setEditingItem(null);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`/api/comunicaciones-dat/${id}`, {method: 'DELETE'});
            setShowDeleteConfirm(null);
            if (selectedItem?.id === id) setSelectedItem(null);
            fetchData();
        } catch { /* ignore */
        }
    };

    const handleSave = async (fecha: string, alumnoIds: number[]) => {
        if (editingItem) {
            await fetch(`/api/comunicaciones-dat/${editingItem.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fecha}),
            });
        } else {
            await fetch('/api/comunicaciones-dat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fecha, alumnoIds, detalleAcademicoId}),
            });
        }
        setShowForm(false);
        setEditingItem(null);
        fetchData();
    };

    const advanceStatus = async (item: ComunicacionDAT) => {
        const next: Record<string, string> = {
            PENDIENTE_ENVIAR_DIRECTOR: 'PENDIENTE_FIRMA_DIRECTOR',
            PENDIENTE_FIRMA_DIRECTOR: 'COMPLETADO',
            COMPLETADO: 'COMPLETADO',
        };
        const nuevo = next[item.estado] || item.estado;
        await fetch(`/api/comunicaciones-dat/${item.id}/estado`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({estado: nuevo}),
        });
        if (selectedItem?.id === item.id) setSelectedItem({...item, estado: nuevo as ComunicacionDATEstado});
        fetchData();
    };

    const moveBackStatus = async (item: ComunicacionDAT) => {
        const prev: Record<string, string> = {
            PENDIENTE_ENVIAR_DIRECTOR: 'PENDIENTE_ENVIAR_DIRECTOR',
            PENDIENTE_FIRMA_DIRECTOR: 'PENDIENTE_ENVIAR_DIRECTOR',
            COMPLETADO: 'PENDIENTE_FIRMA_DIRECTOR',
        };
        const nuevo = prev[item.estado] || item.estado;
        await fetch(`/api/comunicaciones-dat/${item.id}/estado`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({estado: nuevo}),
        });
        if (selectedItem?.id === item.id) setSelectedItem({...item, estado: nuevo as ComunicacionDATEstado});
        fetchData();
    };

    const handleOpenDocManager = (item: ComunicacionDAT) => {
        setDocManagerTarget(item);
        setShowDocManager(true);
    };

    const handleCloseDocManager = () => {
        setShowDocManager(false);
        setDocManagerTarget(null);
    };

    return {
        items,
        selectedItem, setSelectedItem,
        showForm, editingItem,
        showDeleteConfirm, setShowDeleteConfirm,
        showDocManager, docManagerTarget,
        listSearchTerm, setListSearchTerm,
        statusFilter, setStatusFilter,
        sortBy, sortOrder, setBy, setSortOrder,
        filteredAndSortedItems,
        handleEdit, handleNew, handleDelete, handleSave,
        advanceStatus, moveBackStatus,
        handleOpenDocManager, handleCloseDocManager,
        setShowForm, setEditingItem,
        fetchData,
    };
}
