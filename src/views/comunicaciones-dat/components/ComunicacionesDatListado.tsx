import React from 'react';
import {Archive, FolderUp, Pencil, Plus, Search, Trash2, X} from 'lucide-react';
import {ComunicacionDAT, ComunicacionDATEstado} from '../../../types/index.ts';
import {CustomSelect} from '../../../components/CustomSelect.tsx';
import {Title} from '../../../components/Title.tsx';
import {COM_DAT_STATUS_LABELS} from '../utils/comunicacionesDatUtils.ts';

interface Props {
    items: ComunicacionDAT[];
    selectedItem: ComunicacionDAT | null;
    onSelectItem: (item: ComunicacionDAT) => void;
    onEdit: (item: ComunicacionDAT) => void;
    onDeleteRequest: (id: number) => void;
    onNew: () => void;
    onUploadDocument: (item: ComunicacionDAT) => void;
    listSearchTerm: string;
    onListSearchChange: (v: string) => void;
    statusFilter: string;
    onStatusFilterChange: (v: string) => void;
    sortBy: string;
    sortOrder: string;
    onSortByFecha: () => void;
    onSortByEstado: () => void;
}

const STATUS_OPTIONS = [
    {id: 'all', label: 'Todos los estados'},
    ...Object.values(ComunicacionDATEstado).map(e => ({
        id: e,
        label: COM_DAT_STATUS_LABELS[e] || e,
    })),
];

const STATUS_BADGE_COLORS: Record<string, string> = {
    PENDIENTE_ENVIAR_DIRECTOR: 'bg-amber-50 text-amber-600 border-amber-200',
    PENDIENTE_FIRMA_DIRECTOR: 'bg-blue-50 text-blue-600 border-blue-200',
    COMPLETADO: 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

export function ComunicacionesDatListado({
                                             items,
                                             selectedItem,
                                             onSelectItem,
                                             onEdit,
                                             onDeleteRequest,
                                             onNew,
                                             onUploadDocument,
                                             listSearchTerm,
                                             onListSearchChange,
                                             statusFilter,
                                             onStatusFilterChange,
                                             sortBy,
                                             sortOrder,
                                             onSortByFecha,
                                             onSortByEstado,
                                         }: Props) {
    return (
        <div className="w-full lg:flex-1 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full">

            <div className="px-6 py-4 border-b border-border-base space-y-4 relative z-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <FolderUp className="h-5 w-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Comunicaciones DAT
            </span>
                    </div>
                    <button
                        onClick={onNew}
                        className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4"/> Nueva Comunicación
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center w-full">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted"/>
                        <input
                            type="text"
                            placeholder="Buscar por fecha o estudiante..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                            value={listSearchTerm}
                            onChange={e => onListSearchChange(e.target.value)}
                        />
                        {listSearchTerm && (
                            <button
                                onClick={() => onListSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                            >
                                <X className="h-3 w-3"/>
                            </button>
                        )}
                    </div>

                    <CustomSelect
                        value={statusFilter}
                        onChange={onStatusFilterChange}
                        options={STATUS_OPTIONS}
                    />

                    <div className="flex w-full bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <button
                            onClick={onSortByFecha}
                            className={`flex-1 text-[9px] font-bold uppercase tracking-tight py-1 rounded-md transition-all ${sortBy === 'fecha' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
                        >
                            Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            onClick={onSortByEstado}
                            className={`flex-1 text-[9px] font-bold uppercase tracking-tight py-1 rounded-md transition-all ${sortBy === 'estado' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
                        >
                            Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile: tarjetas */}
            <div className="lg:hidden divide-y divide-border-base">
                {items.map(item => {
                    const fechaStr = item.fecha ? (() => {
                        const d = new Date(item.fecha);
                        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    })() : '';
                    return (
                        <div
                            key={item.id}
                            onClick={() => onSelectItem(item)}
                            className={`p-5 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-primary-light/40' : 'hover:bg-slate-50'}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-text-main truncate">{fechaStr}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {item.alumnos?.slice(0, 2).map(a => (
                                            <span key={a.id}
                                                  className="text-[9px] bg-slate-50 text-text-muted px-1.5 py-0.5 rounded-md border border-slate-100">
                        {a.apellidos}, {a.nombre}
                      </span>
                                        ))}
                                        {(item.alumnos?.length || 0) > 2 && (
                                            <span
                                                className="text-[9px] text-text-muted">+{item.alumnos!.length - 2}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0">
                  <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE_COLORS[item.estado] || 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    {COM_DAT_STATUS_LABELS[item.estado] || item.estado}
                  </span>
                                </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onUploadDocument(item);
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                                >
                                    <Archive className="h-3 w-3"/> Documentos
                                </button>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onEdit(item);
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1"
                                >
                                    <Pencil className="h-3 w-3"/> Editar
                                </button>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onDeleteRequest(item.id!);
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1"
                                >
                                    <Trash2 className="h-3 w-3"/> Eliminar
                                </button>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <div className="px-5 py-12 text-center text-text-muted text-sm italic">
                        No se encontraron comunicaciones.
                    </div>
                )}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden lg:block overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-50 border-b border-border-base">
                        <th
                            onClick={onSortByFecha}
                            className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                        >
                            Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            Estudiantes
                        </th>
                        <th
                            onClick={onSortByEstado}
                            className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                        >
                            Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">
                            Acciones
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border-base">
                    {items.map(item => {
                        const fechaStr = item.fecha ? (() => {
                            const d = new Date(item.fecha);
                            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        })() : '';
                        return (
                            <tr
                                key={item.id}
                                onClick={() => onSelectItem(item)}
                                className={`cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
                            >
                                <td className="px-5 py-4">
                                    <p className="font-bold text-text-main text-sm">{fechaStr}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {item.alumnos?.slice(0, 3).map(a => (
                                            <span key={a.id}
                                                  className="text-[10px] bg-slate-50 text-text-muted px-1.5 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">
                          {a.apellidos}, {a.nombre}
                        </span>
                                        ))}
                                        {(item.alumnos?.length || 0) > 3 && (
                                            <span
                                                className="text-[10px] text-text-muted">+{item.alumnos!.length - 3}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                    <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE_COLORS[item.estado] || 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {COM_DAT_STATUS_LABELS[item.estado] || item.estado}
                    </span>
                                </td>
                                <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                        <Title text="Subir documentos">
                                            <button
                                                onClick={() => onUploadDocument(item)}
                                                className="p-2 text-slate-400 hover:text-primary transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                                            >
                                                <Archive className="h-4 w-4"/>
                                            </button>
                                        </Title>
                                        <Title text="Editar comunicación">
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-2 text-slate-400 hover:text-amber-600 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                                            >
                                                <Pencil className="h-4 w-4"/>
                                            </button>
                                        </Title>
                                        <Title text="Eliminar comunicación">
                                            <button
                                                onClick={() => onDeleteRequest(item.id!)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </button>
                                        </Title>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-text-muted text-sm italic">
                                No se encontraron comunicaciones.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
