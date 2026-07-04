import React from 'react';
import {Trash2, X} from 'lucide-react';

import {useComunicacionesDat} from './hooks/useComunicacionesDat.ts';
import {ComunicacionesDatListado} from './components/ComunicacionesDatListado.tsx';
import {ComunicacionDatDetalle} from './components/ComunicacionDatDetalle.tsx';
import {ComunicacionDatFormModal} from './components/ComunicacionDatFormModal.tsx';
import {GestorDocumentalModal} from '../../components/GestorDocumentalModal.tsx';

interface Props {
    cursoId: number;
    detalleAcademicoId?: number;
}

export default function ComunicacionesDatView({cursoId, detalleAcademicoId}: Props) {
    const ctx = useComunicacionesDat(cursoId, detalleAcademicoId);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

            <ComunicacionesDatListado
                items={ctx.filteredAndSortedItems}
                selectedItem={ctx.selectedItem}
                onSelectItem={ctx.setSelectedItem}
                onEdit={ctx.handleEdit}
                onDeleteRequest={ctx.setShowDeleteConfirm}
                onNew={ctx.handleNew}
                onUploadDocument={ctx.handleOpenDocManager}
                listSearchTerm={ctx.listSearchTerm}
                onListSearchChange={ctx.setListSearchTerm}
                statusFilter={ctx.statusFilter}
                onStatusFilterChange={ctx.setStatusFilter}
                sortBy={ctx.sortBy}
                sortOrder={ctx.sortOrder}
                onSortByFecha={() => {
                    if (ctx.sortBy === 'fecha') ctx.setSortOrder(ctx.sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                        ctx.setBy('fecha');
                        ctx.setSortOrder('desc');
                    }
                }}
                onSortByEstado={() => {
                    if (ctx.sortBy === 'estado') ctx.setSortOrder(ctx.sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                        ctx.setBy('estado');
                        ctx.setSortOrder('asc');
                    }
                }}
            />

            <div
                className="w-full lg:w-85 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden min-h-75">
                <ComunicacionDatDetalle
                    item={ctx.selectedItem}
                    onOpenDocManager={ctx.handleOpenDocManager}
                    onAdvanceStatus={ctx.advanceStatus}
                    onMoveBackStatus={ctx.moveBackStatus}
                />
            </div>

            {ctx.showDeleteConfirm !== null && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
                    <div
                        className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => ctx.setShowDeleteConfirm(null)}
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
                                Esta acción eliminará la comunicación de forma permanente y no se puede deshacer.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => ctx.setShowDeleteConfirm(null)}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => ctx.handleDelete(ctx.showDeleteConfirm!)}
                                    className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ComunicacionDatFormModal
                open={ctx.showForm}
                editingItem={ctx.editingItem ? {id: ctx.editingItem.id, fecha: ctx.editingItem.fecha} : null}
                detalleAcademicoId={detalleAcademicoId}
                onSave={ctx.handleSave}
                onClose={() => {
                    ctx.setShowForm(false);
                    ctx.setEditingItem(null);
                }}
            />

            {ctx.docManagerTarget && (
                <GestorDocumentalModal
                    open={ctx.showDocManager}
                    onClose={ctx.handleCloseDocManager}
                    entidad="com-dat"
                    entidadId={ctx.docManagerTarget.id!}
                    entityNombre={ctx.docManagerTarget.fecha || ''}
                    entityRef=""
                    prefijo="CDAT"
                    detalleAcademicoId={detalleAcademicoId}
                    estado={ctx.docManagerTarget.estado}
                    alumnos={ctx.docManagerTarget.alumnos}
                    fechaComunicacion={ctx.docManagerTarget.fecha}
                    onEntityUpdated={ctx.fetchData}
                />
            )}
        </div>
    );
}
