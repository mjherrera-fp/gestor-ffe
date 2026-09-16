import React from 'react';
import {Archive, ArrowLeft, CheckCircle2, FileText} from 'lucide-react';
import {ComunicacionDAT, ComunicacionDATEstado} from '../../../types/index.ts';
import {COM_DAT_STATUS_LABELS, getStatusButton} from '../utils/comunicacionesDatUtils.ts';

interface Props {
    item: ComunicacionDAT | null;
    onOpenDocManager: (item: ComunicacionDAT) => void;
    onAdvanceStatus: (item: ComunicacionDAT) => void;
    onMoveBackStatus: (item: ComunicacionDAT) => void;
}

export function ComunicacionDatDetalle({item, onOpenDocManager, onAdvanceStatus, onMoveBackStatus}: Props) {
    if (!item) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <FileText className="h-12 w-12 text-slate-200"/>
                </div>
                <h3 className="text-base font-bold text-text-main mb-2">Selecciona una comunicación</h3>
                <p className="text-xs text-text-muted">
                    Elige una de la lista para ver los detalles.
                </p>
            </div>
        );
    }

    const statusBtn = getStatusButton(item.estado);
    const fechaStr = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
    }) : '';

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-border-base">
                <h2 className="text-lg font-bold text-text-main leading-tight">Comunicación DAT</h2>
                <p className="text-sm text-text-muted mt-1">{fechaStr}</p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Estado
                            Actual
                        </div>
                        <div
                            className={`text-sm font-bold ${item.estado === ComunicacionDATEstado.COMPLETADO ? 'text-emerald-500' : 'text-warning'}`}>
                            {COM_DAT_STATUS_LABELS[item.estado] || item.estado}
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenDocManager(item)}
                        className="h-8 px-2.5 flex items-center justify-center gap-1 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 text-[10px] font-bold uppercase"
                    >
                        <Archive className="h-3.5 w-3.5"/> DOCS
                    </button>
                </div>

                <div>
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Estudiantes
                    </div>
                    <div className="space-y-1">
                        {item.alumnos?.map(a => (
                            <div key={a.id}
                                 className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                                <span className="text-xs font-medium text-text-main">{a.apellidos}, {a.nombre}</span>
                                <span className="text-[10px] text-text-muted">{a.dni}</span>
                            </div>
                        ))}
                        {(!item.alumnos || item.alumnos.length === 0) && (
                            <p className="text-xs text-text-muted italic">Sin estudiantes asignados</p>
                        )}
                    </div>
                </div>

                <div className="pt-6 border-t border-border-base">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">
                        Acciones de Estado
                    </div>
                    <div className="space-y-3">
                        {statusBtn ? (
                            <button
                                onClick={() => onAdvanceStatus(item)}
                                className={`w-full text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:brightness-90 transition-all shadow-md ${statusBtn.color}`}
                            >
                                {React.createElement(statusBtn.icon, {className: 'h-4 w-4'})}
                                {statusBtn.label}
                            </button>
                        ) : (
                            <div
                                className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4"/> TRÁMITE COMPLETADO
                            </div>
                        )}

                        {item.estado !== ComunicacionDATEstado.PENDIENTE_ENVIAR_DIRECTOR && (
                            <button
                                onClick={() => onMoveBackStatus(item)}
                                className="w-full py-3 border border-border-base text-text-muted rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <ArrowLeft className="h-3.5 w-3.5"/> Regresar Estado Anterior
                            </button>
                        )}
                    </div>

                    {statusBtn && (
                        <p className="text-[10px] text-text-muted text-center mt-4">
                            Al pulsar '{statusBtn.label}', se actualizará el estado de la comunicación.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
