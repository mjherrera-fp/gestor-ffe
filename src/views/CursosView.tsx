import React, { useState } from 'react';
import { Plus, History, Trash2, Archive, Calendar, Edit2, AlertTriangle, CheckCircle, X, RotateCcw } from 'lucide-react';
import { Curso } from '../types/index.ts';

interface Props {
  cursos: Curso[];
  onUpdate: () => void;
}

export default function CursosView({ cursos, onUpdate }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [formData, setFormData] = useState<Partial<Curso>>({
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    festivos: []
  });
  const [newFestivo, setNewFestivo] = useState('');

  const [confirmingAction, setConfirmingAction] = useState<{ id: number; type: 'delete' | 'archive' | 'restore' } | null>(null);

  const addFestivo = () => {
    if (!newFestivo) return;
    const festivos = [...(formData.festivos || []), newFestivo];
    setFormData({ ...formData, festivos });
    setNewFestivo('');
  };

  const removeFestivo = (date: string) => {
    const festivos = (formData.festivos || []).filter(f => f !== date);
    setFormData({ ...formData, festivos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/cursos/${editing.id}` : '/api/cursos';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setFormData({ descripcion: '', fechaInicio: '', fechaFin: '', festivos: [] });
        onUpdate();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/cursos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setConfirmingAction(null);
      onUpdate();
    } catch (error) {
      console.error(error);
      alert('Error al intentar eliminar el curso.');
    }
  };

  const handleArchive = async (id: number, shouldArchive: boolean) => {
    try {
      const res = await fetch(`/api/cursos/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: shouldArchive })
      });
      if (!res.ok) throw new Error('Error al cambiar estado');
      setConfirmingAction(null);
      onUpdate();
    } catch (error) {
      console.error(error);
      alert('Error al intentar cambiar el estado del curso.');
    }
  };

  const filteredCursos = showArchived ? cursos : cursos.filter(c => !c.archivado);

  return (
    <div className="space-y-6">
      {/* Custom Confirmation Dialog */}
      {confirmingAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              confirmingAction.type === 'delete' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {confirmingAction.type === 'delete' ? <Trash2 className="h-6 w-6" /> : (confirmingAction.type === 'restore' ? <RotateCcw className="h-6 w-6" /> : <Archive className="h-6 w-6" />)}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {confirmingAction.type === 'delete' ? '¿Eliminar curso?' : (confirmingAction.type === 'restore' ? '¿Restaurar curso?' : '¿Archivar curso?')}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              {confirmingAction.type === 'delete' 
                ? 'Se eliminará TODA la información asociada (alumnos, convenios, relaciones). Esta acción es irreversible.' 
                : confirmingAction.type === 'restore' 
                  ? 'El curso volverá a estar activo y disponible en todos los selectores.' 
                  : 'El curso dejará de aparecer en los selectores principales.'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmingAction(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (confirmingAction.type === 'delete') handleDelete(confirmingAction.id);
                  else if (confirmingAction.type === 'archive') handleArchive(confirmingAction.id, true);
                  else handleArchive(confirmingAction.id, false);
                }}
                className={`flex-1 py-2 rounded-lg text-white font-semibold ${
                  confirmingAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Sí, {confirmingAction.type === 'delete' ? 'Eliminar' : (confirmingAction.type === 'restore' ? 'Restaurar' : 'Archivar')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">Cursos Académicos</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${
              showArchived 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showArchived ? 'Ver Solo Activos' : 'Ver Todos (Inc. Archivados)'}
          </button>
          <button
            onClick={() => { 
              setShowForm(true); 
              setEditing(null); 
              setFormData({ descripcion: '', fechaInicio: '', fechaFin: '', festivos: [] });
            }}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            + Nuevo Curso
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-800">{editing ? 'Editar Curso' : 'Crear Nuevo Curso'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData.descripcion} 
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Ej: Curso 2025-2026"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                  <input 
                    required 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={formData.fechaInicio} 
                    onChange={e => setFormData({...formData, fechaInicio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
                  <input 
                    required 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={formData.fechaFin} 
                    onChange={e => setFormData({...formData, fechaFin: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-3 items-center justify-between">
                  Días Festivos
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest"> ({formData.festivos?.length || 0} añadidos)</span>
                </label>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="date"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={newFestivo}
                    onChange={e => setNewFestivo(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={addFestivo}
                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all"
                  >
                    Añadir
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.festivos?.map(date => (
                    <div key={date} className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-3 pr-1 py-1 rounded-full text-xs font-medium text-slate-600">
                      {new Date(date).toLocaleDateString()}
                      <button 
                        type="button" 
                        onClick={() => removeFestivo(date)}
                        className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(!formData.festivos || formData.festivos.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-2">No se han añadido días festivos todavía.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  {editing ? 'Actualizar' : 'Crear Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border-base shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-base bg-slate-50/50 flex justify-between items-center">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Historial de Cursos</span>
          {showArchived && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">Mostrando Histórico</span>
          )}
        </div>
        
        {/* Mobile List (Hidden on tablet/desktop) */}
        <div className="block lg:hidden divide-y divide-border-base">
          {filteredCursos.length === 0 ? (
             <div className="px-6 py-12 text-center text-text-muted text-sm italic">
                No hay cursos registrados.
             </div>
          ) : (
            filteredCursos.map(curso => (
              <div key={curso.id} className={`p-5 space-y-4 ${curso.archivado ? 'bg-slate-50/50 opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-text-main wrap-break-word">
                      {curso.descripcion}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted font-medium">
                      <Calendar className="h-3 w-3" />
                      {new Date(curso.fechaInicio).toLocaleDateString()} — {new Date(curso.fechaFin).toLocaleDateString()}
                    </div>
                  </div>
                  {curso.archivado ? (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200 shrink-0">Archivado</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-100 shrink-0">Activo</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> {curso.festivos?.length || 0} festivos
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setConfirmingAction({ id: curso.id!, type: curso.archivado ? 'restore' : 'archive' })}
                      className={`p-2 rounded-lg border shadow-sm ${curso.archivado ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      {curso.archivado ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => { setEditing(curso); setFormData(curso); setShowForm(true); }}
                      className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg shadow-sm"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setConfirmingAction({ id: curso.id!, type: 'delete' })}
                      className="p-2 bg-white text-red-500 border border-red-100 rounded-lg shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (Hidden on mobile/tablet-portrait) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-base">
                <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Período</th>
                <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-center">Festivos</th>
                <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base font-sans">
              {filteredCursos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted text-sm italic">
                    {showArchived ? 'No hay cursos registrados.' : 'No hay cursos activos. Usa el botón superior para ver el archivo.'}
                  </td>
                </tr>
              ) : (
                filteredCursos.map(curso => (
                  <tr key={curso.id} className={`group transition-colors ${curso.archivado ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4">
                      <span className={`font-bold text-sm ${curso.archivado ? 'text-slate-700' : 'text-text-main'}`}>
                        {curso.descripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 text-xs ${curso.archivado ? 'text-slate-600' : 'text-text-muted'}`}>
                        <Calendar className="h-3.5 w-3.5 opacity-50" />
                        {new Date(curso.fechaInicio).toLocaleDateString()} — {new Date(curso.fechaFin).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-500">
                      <span className={`px-2 py-0.5 rounded border ${curso.archivado ? 'bg-white text-slate-600 border-slate-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {curso.festivos?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {curso.archivado ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200">
                          Archivado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-100">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setConfirmingAction({ 
                              id: curso.id!, 
                              type: curso.archivado ? 'restore' : 'archive' 
                            });
                          }}
                          title={curso.archivado ? "Restaurar" : "Archivar"}
                          className={`p-2 transition-all rounded-lg cursor-pointer flex items-center justify-center border shadow-sm active:scale-95 z-10 ${
                            curso.archivado 
                              ? 'text-amber-800 bg-amber-100 border-amber-300 hover:bg-amber-200' 
                              : 'text-slate-500 bg-white border-slate-200 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {curso.archivado ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditing(curso); 
                            setFormData(curso); 
                            setShowForm(true); 
                          }}
                          title="Editar"
                          className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-primary hover:border-primary-light hover:bg-primary-light transition-all rounded-lg cursor-pointer flex items-center justify-center shadow-sm active:scale-95 z-10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setConfirmingAction({ id: curso.id!, type: 'delete' });
                          }}
                          title="Eliminar"
                          className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all rounded-lg cursor-pointer flex items-center justify-center shadow-sm active:scale-95 z-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {cursos.length > 0 && !cursos.some(c => !c.archivado) && (
        <div className="bg-amber-50 rounded-xl p-4 flex gap-3 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            No hay cursos activos. Para gestionar alumnos y empresas, debe haber al menos un curso no archivado.
          </p>
        </div>
      )}
    </div>
  );
}
