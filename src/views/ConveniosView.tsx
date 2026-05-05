import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, ChevronRight, User, Building2, Calendar, 
  ArrowRight, CheckCircle2, Clock, Send, ShieldCheck, Mail, Briefcase, Trash2, ArrowLeft,
  Pencil, X, GraduationCap
} from 'lucide-react';
import { Convenio, Alumno, Empresa, TutorEmpresa, ConvenioEstado, Curso, CentroEducativo } from '../types/index.ts';

interface Props {
  cursoId: number;
}

type ConvenioExtendido = Convenio & { empresaNombre: string; centroNombre: string; };
export default function ConveniosView({ cursoId }: Props) {
  const [convenios, setConvenios] = useState<ConvenioExtendido[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centros, setCentros] = useState<CentroEducativo[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedCentro, setSelectedCentro] = useState<number | null>(null);
  const [selectedConvenio, setSelectedConvenio] = useState<ConvenioExtendido | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [searchTermEmpresa, setSearchTermEmpresa] = useState('');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setBy] = useState<'empresa' | 'estado'>('empresa');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    numConvenio: '',
    fechaConvenio: new Date().toISOString().split('T')[0],
    isActive: false
  });

  const fetchData = async () => {
    const [convRes, emRes, ceRes] = await Promise.all([
      fetch(`/api/convenios?cursoId=${cursoId}`),
      fetch('/api/empresas'),
      fetch('/api/centros')
    ]);
    const conveniosData = await convRes.json();
    setConvenios(Array.isArray(conveniosData) ? conveniosData : []);
    setEmpresas(await emRes.json());
    
    const centrosData = await ceRes.json();
    setCentros(centrosData);
    
    // Pre-load first center if not editing
    if (!isEditing && centrosData.length > 0 && !selectedCentro) {
      setSelectedCentro(centrosData[0].id!);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cursoId]);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresa || !selectedCentro) return;

    const convenio: Convenio = {
      numConvenio: formData.numConvenio,
      fechaConvenio: formData.fechaConvenio,
      estado: formData.isActive ? ConvenioEstado.COMPLETADO : (selectedConvenio?.estado || ConvenioEstado.PENDIENTE_ENVIAR),
      empresaId: selectedEmpresa,
      cursoId,
      centroId: selectedCentro
    };
    
    const url = isEditing ? `/api/convenios/${editingId}` : '/api/convenios';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenio })
    });
    if (res.ok) {
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      setFormData({ 
        numConvenio: '', 
        fechaConvenio: new Date().toISOString().split('T')[0], 
        isActive: false
      });
      setSelectedEmpresa(null);
      // Keep selectedCentro as the default for next one or reset to first
      if (centros.length > 0) setSelectedCentro(centros[0].id!);
      setSearchTermEmpresa('');
      fetchData();
    }
  };

  const handleEdit = (conv: ConvenioExtendido) => {
    setIsEditing(true);
    setEditingId(conv.id!);
    setSelectedEmpresa(conv.empresaId);
    setSelectedCentro(conv.centroId || (centros.length > 0 ? centros[0].id! : null));
    setSearchTermEmpresa(conv.empresaNombre);
    setFormData({
      numConvenio: conv.numConvenio,
      fechaConvenio: conv.fechaConvenio,
      isActive: conv.estado === ConvenioEstado.COMPLETADO
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/convenios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar convenio');
      setShowDeleteConfirm(null);
      setSelectedConvenio(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error: No se pudo eliminar el convenio. Podría tener relaciones de alumnos asociadas.');
    }
  };

  const advanceStatus = async (convenio: ConvenioExtendido) => {
    let nextEstado = convenio.estado;
    switch (convenio.estado) {
      case ConvenioEstado.PENDIENTE_ENVIAR: nextEstado = ConvenioEstado.PENDIENTE_FIRMA_EMPRESA; break;
      case ConvenioEstado.PENDIENTE_FIRMA_EMPRESA: nextEstado = ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR; break;
      case ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR: nextEstado = ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR; break;
      case ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR: nextEstado = ConvenioEstado.COMPLETADO; break;
    }
    
    await fetch(`/api/convenios/${convenio.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenio: { ...convenio, estado: nextEstado } })
    });
    
    const updated = { ...convenio, estado: nextEstado };
    setSelectedConvenio(updated);
    fetchData();
  };

  const moveBackStatus = async (convenio: ConvenioExtendido) => {
    let prevEstado = convenio.estado;
    switch (convenio.estado) {
      case ConvenioEstado.PENDIENTE_FIRMA_EMPRESA: prevEstado = ConvenioEstado.PENDIENTE_ENVIAR; break;
      case ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR: prevEstado = ConvenioEstado.PENDIENTE_FIRMA_EMPRESA; break;
      case ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR: prevEstado = ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR; break;
      case ConvenioEstado.COMPLETADO: prevEstado = ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR; break;
    }
    
    if (prevEstado === convenio.estado) return;

    await fetch(`/api/convenios/${convenio.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenio: { ...convenio, estado: prevEstado } })
    });
    
    const updated = { ...convenio, estado: prevEstado };
    setSelectedConvenio(updated);
    fetchData();
  };

  const getStatusButton = (estado: ConvenioEstado) => {
    switch (estado) {
      case ConvenioEstado.PENDIENTE_ENVIAR: return { label: 'Enviar a Empresa', icon: Send, color: 'bg-blue-600' };
      case ConvenioEstado.PENDIENTE_FIRMA_EMPRESA: return { label: 'Recibido de Empresa', icon: Clock, color: 'bg-amber-500' };
      case ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR: return { label: 'Enviar a Dirección', icon: Send, color: 'bg-indigo-600' };
      case ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR: return { label: 'Recibido de Dirección', icon: ShieldCheck, color: 'bg-emerald-600' };
      default: return null;
    }
  };

  const statusBadge = (estado: ConvenioEstado) => {
    const styles = {
      [ConvenioEstado.PENDIENTE_ENVIAR]: 'status-pending bg-orange-50 text-orange-700',
      [ConvenioEstado.PENDIENTE_FIRMA_EMPRESA]: 'status-pending bg-amber-50 text-amber-700',
      [ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'status-pending bg-blue-50 text-blue-700',
      [ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR]: 'status-pending bg-indigo-50 text-indigo-700',
      [ConvenioEstado.COMPLETADO]: 'status-done bg-emerald-50 text-emerald-700'
    };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[estado]}`}>{estado}</span>;
  };

  const filteredAndSortedConvenios = convenios
    .filter(conv => {
      const searchMatch = !listSearchTerm || 
        conv.empresaNombre.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        conv.numConvenio.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        (conv.centroNombre || '').toLowerCase().includes(listSearchTerm.toLowerCase());
      
      const statusMatch = statusFilter === 'all' || conv.estado === statusFilter;
      
      return searchMatch && statusMatch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'empresa') {
        comparison = a.empresaNombre.localeCompare(b.empresaNombre);
      } else {
        comparison = a.estado.localeCompare(b.estado);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-start">
      {/* Convenios List Card */}
      <div className="w-full lg:flex-1 bg-white rounded-xl border border-border-base shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border-base space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Listado de Convenios</span>
            <button 
              onClick={() => {
                setIsEditing(false);
                setEditingId(null);
                setSelectedEmpresa(null);
                setSelectedCentro(centros.length > 0 ? centros[0].id! : null);
                setSearchTermEmpresa('');
                setFormData({ 
                  numConvenio: '', 
                  fechaConvenio: new Date().toISOString().split('T')[0], 
                  isActive: false
                });
                setShowForm(true);
              }}
              className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all font-sans"
            >
              + Nuevo Convenio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative col-span-1 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar convenio..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
              />
              {listSearchTerm && (
                <button onClick={() => setListSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              {Object.values(ConvenioEstado).map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1">
              <button 
                onClick={() => {
                  if (sortBy === 'empresa') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setBy('empresa'); setSortOrder('asc'); }
                }}
                className={`flex-1 text-[9px] font-bold uppercase tracking-tight py-1 rounded-md transition-all ${sortBy === 'empresa' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
              >
                Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => {
                  if (sortBy === 'estado') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setBy('estado'); setSortOrder('asc'); }
                }}
                className={`flex-1 text-[9px] font-bold uppercase tracking-tight py-1 rounded-md transition-all ${sortBy === 'estado' ? 'bg-white shadow-sm text-primary' : 'text-text-muted'}`}
              >
                Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="lg:hidden divide-y divide-border-base">
          {filteredAndSortedConvenios.map(conv => (
            <div 
              key={conv.id}
              onClick={() => setSelectedConvenio(conv)}
              className={`p-5 cursor-pointer transition-colors ${selectedConvenio?.id === conv.id ? 'bg-primary-light/40' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-text-main truncate">{conv.empresaNombre}</h4>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-tight">{conv.centroNombre}</p>
                  <p className="text-[10px] text-text-muted font-bold mt-1">Ref: {conv.numConvenio}</p>
                </div>
                <div className="shrink-0 scale-90 origin-top-right">
                  {statusBadge(conv.estado)}
                </div>
              </div>
            </div>
          ))}
          {filteredAndSortedConvenios.length === 0 && (
            <div className="px-5 py-12 text-center text-text-muted text-sm italic">
              No se encontraron convenios.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-base">
                <th 
                  className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => { setBy('empresa'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  Centro / Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Ref. Convenio</th>
                <th 
                  className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => { setBy('estado'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {filteredAndSortedConvenios.map(conv => (
                <tr 
                  key={conv.id}
                  onClick={() => setSelectedConvenio(conv)}
                  className={`cursor-pointer transition-colors ${selectedConvenio?.id === conv.id ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-5 py-4">
                    <p className="text-[9px] text-primary font-bold uppercase tracking-tight mb-0.5">{conv.centroNombre}</p>
                    <p className="font-bold text-text-main text-sm truncate max-w-50">{conv.empresaNombre}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-text-muted">{conv.numConvenio}</p>
                  </td>
                  <td className="px-5 py-4">
                    {statusBadge(conv.estado)}
                  </td>
                </tr>
              ))}
              {filteredAndSortedConvenios.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-text-muted text-sm italic font-sans">
                    No se encontraron convenios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail View Card */}
      <div className="w-full lg:w-85 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden min-h-75">
        {selectedConvenio ? (
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-border-base">
              <h2 className="text-lg font-bold text-text-main leading-tight">Detalle del Convenio</h2>
              <p className="text-sm text-text-muted mt-1">Ref: {selectedConvenio.empresaNombre}</p>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Estado Actual</div>
                <div className="text-sm font-bold text-warning">{selectedConvenio.estado}</div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Centro Educativo</div>
                <div className="text-sm font-bold text-text-main">{(selectedConvenio as any).centroNombre}</div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Empresa Colaboradora</div>
                <div className="text-sm font-bold text-text-main">{selectedConvenio.empresaNombre}</div>
              </div>

              <div className="pt-6 border-t border-border-base">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Acciones de Estado</div>
                <div className="space-y-3">
                  {getStatusButton(selectedConvenio.estado) ? (
                    <button 
                      onClick={() => advanceStatus(selectedConvenio)}
                      className="w-full bg-primary text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      {React.createElement(getStatusButton(selectedConvenio.estado)!.icon, { className: 'h-4 w-4' })}
                      {getStatusButton(selectedConvenio.estado)!.label}
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> TRÁMITE COMPLETADO
                    </div>
                  )}

                  {selectedConvenio.estado !== ConvenioEstado.PENDIENTE_ENVIAR && (
                    <button 
                      onClick={() => moveBackStatus(selectedConvenio)}
                      className="w-full py-3 border border-border-base text-text-muted rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Regresar Estado Anterior
                    </button>
                  )}
                </div>
                
                <div className="pt-6 border-t border-border-base space-y-3">
                  <button 
                    onClick={() => handleEdit(selectedConvenio as any)}
                    className="w-full py-3 border border-border-base text-text-main rounded-lg font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar Datos del Convenio
                  </button>

                  <button 
                    onClick={() => setShowDeleteConfirm(selectedConvenio.id!)}
                    className="w-full py-3 border border-red-100 text-red-500 rounded-lg font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar Convenio
                  </button>
                </div>
                
                {getStatusButton(selectedConvenio.estado) && (
                  <p className="text-[10px] text-text-muted text-center mt-4">
                    Al pulsar '{getStatusButton(selectedConvenio.estado)!.label}', se actualizará el estado de la tramitación.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <FileText className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-base font-bold text-text-main mb-2">Selecciona un convenio</h3>
            <p className="text-xs text-text-muted">Elige uno de la lista para ver el flujo de trabajo y gestionar las firmas.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="p-8 text-center transition-all">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">Esta acción eliminará el convenio de forma permanente y no se puede deshacer.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)} 
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convenio Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isEditing ? 'Editar Convenio' : 'Nuevo Convenio de Prácticas'}</h3>
                  <p className="text-sm text-slate-500 font-medium">{isEditing ? 'Modifica los datos principales del convenio.' : 'Asocia un tutor de empresa para crear el convenio marco.'}</p>
               </div>
               <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                 <X className="h-6 w-6" />
               </button>
            </div>
            
            <form onSubmit={handleCreateDraft} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Centro Educativo</label>
                    <select
                      required
                      value={selectedCentro || ''}
                      onChange={e => setSelectedCentro(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                    >
                      <option value="" disabled>Selecciona un centro</option>
                      {centros.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Empresa Supervisora</label>
                    <div className="relative">
                      <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Escribe para buscar empresa..."
                          className="w-full bg-slate-100/50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                          value={searchTermEmpresa}
                          onChange={e => {
                            setSearchTermEmpresa(e.target.value);
                            if (selectedEmpresa) {
                              const emp = empresas.find(em => em.id === selectedEmpresa);
                              if (emp && emp.nombre !== e.target.value) {
                                setSelectedEmpresa(null);
                              }
                            }
                          }}
                        />
                      </div>
                      
                      {searchTermEmpresa && !selectedEmpresa && (
                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl -mt-2 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                          {empresas
                            .filter(e => e.nombre.toLowerCase().includes(searchTermEmpresa.toLowerCase()))
                            .map(e => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEmpresa(e.id!);
                                  setSearchTermEmpresa(e.nombre);
                                }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex items-center gap-3"
                              >
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <span className="font-bold text-slate-700">{e.nombre}</span>
                              </button>
                            ))}
                          {empresas.filter(e => e.nombre.toLowerCase().includes(searchTermEmpresa.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400 italic">No se encontraron empresas</div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedEmpresa && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">Seleccionada: {empresas.find(e => e.id === selectedEmpresa)?.nombre}</span>
                        <button 
                          type="button" 
                          onClick={() => { setSelectedEmpresa(null); setSearchTermEmpresa(''); }}
                          className="ml-auto text-[10px] font-bold text-blue-600 uppercase hover:underline"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Fecha del Convenio</label>
                      <input 
                        type="date"
                        required 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                        value={formData.fechaConvenio}
                        onChange={e => setFormData({...formData, fechaConvenio: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Nº Convenio</label>
                      <input 
                        placeholder="Ej: 28074852 / 0000"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                        value={formData.numConvenio}
                        onChange={e => setFormData({...formData, numConvenio: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.isActive}
                          onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-emerald-900">Convenio Activo</span>
                        <span className="text-[10px] font-medium text-emerald-600">Marca esto si el convenio ya está activado</span>
                      </div>
                    </label>
                  </div>
                </div>

              <div className="pt-8 border-t border-slate-100 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all uppercase tracking-widest">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={!selectedEmpresa}
                  className="flex-1 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-30 uppercase tracking-widest"
                >
                  {isEditing ? 'Guardar Cambios' : 'Generar Convenio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
