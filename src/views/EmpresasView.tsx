import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Building2, MapPin, Mail, Phone, Users, UserPlus, Hash, ChevronRight, Briefcase, X } from 'lucide-react';
import { Empresa, TutorEmpresa } from '../types/index.ts';

export default function EmpresasView() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [tutores, setTutores] = useState<TutorEmpresa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [empresaFormData, setEmpresaFormData] = useState<Partial<Empresa>>({
    nombre: '', direccion: '', ciudad: '', cif: '', email: '', tlfn: ''
  });

  const [showTutorForm, setShowTutorForm] = useState(false);
  const [editingTutor, setEditingTutor] = useState<TutorEmpresa | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: number, type: 'empresa' | 'tutor' } | null>(null);
  const [tutorFormData, setTutorFormData] = useState<Partial<TutorEmpresa>>({
    nombre: '', apellidos: '', nif: '', email: '', tlfn: ''
  });

  const fetchEmpresas = async () => {
    const res = await fetch('/api/empresas');
    setEmpresas(await res.json());
  };

  const fetchTutores = async (empresaId: number) => {
    const res = await fetch(`/api/empresas/${empresaId}/tutores`);
    setTutores(await res.json());
  };

  const filteredEmpresas = empresas.filter(emp => 
    emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEmpresa ? 'PUT' : 'POST';
    const url = editingEmpresa ? `/api/empresas/${editingEmpresa.id}` : '/api/empresas';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empresaFormData)
    });
    if (res.ok) {
      setShowEmpresaForm(false);
      fetchEmpresas();
    }
  };

  const handleTutorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresa) return;
    const method = editingTutor ? 'PUT' : 'POST';
    const url = editingTutor ? `/api/tutores-empresa/${editingTutor.id}` : '/api/tutores-empresa';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tutorFormData, empresaId: selectedEmpresa.id })
    });
    if (res.ok) {
      setShowTutorForm(false);
      fetchTutores(selectedEmpresa.id!);
    }
  };

  const handleDeleteEmpresa = async (id: number) => {
    try {
      await fetch(`/api/empresas/${id}`, { method: 'DELETE' });
      if (selectedEmpresa?.id === id) {
        setSelectedEmpresa(null);
        setTutores([]);
      }
      setShowDeleteConfirm(null);
      fetchEmpresas();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar la empresa.');
    }
  };

  const handleDeleteTutor = async (id: number) => {
    try {
      await fetch(`/api/tutores-empresa/${id}`, { method: 'DELETE' });
      setShowDeleteConfirm(null);
      fetchTutores(selectedEmpresa!.id!);
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el tutor.');
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 h-full items-start">
        {/* Companies List Card */}
        <div className="w-full lg:flex-1 bg-white rounded-xl border border-border-base shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border-base space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Empresas e Instituciones</span>
            <button 
              onClick={() => { setShowEmpresaForm(true); setEditingEmpresa(null); setEmpresaFormData({ nombre: '', direccion: '', ciudad: '', cif: '', email: '', tlfn: '' }); }}
              className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all font-sans"
            >
              + Nueva Empresa
            </button>
          </div>
          
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre o CIF..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden divide-y divide-border-base">
          {filteredEmpresas.map(emp => (
            <div 
              key={emp.id}
              onClick={() => { setSelectedEmpresa(emp); fetchTutores(emp.id!); }}
              className={`p-5 cursor-pointer transition-colors ${selectedEmpresa?.id === emp.id ? 'bg-primary-light/30' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="font-bold text-text-main text-sm truncate">{emp.nombre}</h4>
                  <p className="text-[9px] text-text-muted font-bold mt-1">CIF: {emp.cif}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <Mail className="h-3 w-3" /> {emp.email}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <Phone className="h-3 w-3" /> {emp.tlfn}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setEditingEmpresa(emp); setEmpresaFormData(emp); setShowEmpresaForm(true); }} className="p-2 text-text-muted hover:text-primary">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ id: emp.id!, type: 'empresa' }); }} className="p-2 text-text-muted hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredEmpresas.length === 0 && (
            <div className="px-5 py-12 text-center text-text-muted text-sm italic">
              {searchTerm ? 'No se encontraron empresas para esta búsqueda.' : 'No hay empresas registradas todavía.'}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-auto border-b border-border-base">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-base">
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Entidad</th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Contacto</th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base font-sans">
              {filteredEmpresas.map(emp => (
                <tr 
                  key={emp.id}
                  onClick={() => { setSelectedEmpresa(emp); fetchTutores(emp.id!); }}
                  className={`cursor-pointer transition-colors ${selectedEmpresa?.id === emp.id ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-5 py-4">
                    <p className="font-bold text-text-main text-sm">{emp.nombre}</p>
                    <p className="text-[10px] text-text-muted">{emp.cif}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-main">
                    <p>{emp.email}</p>
                    <p className="text-[10px] text-text-muted">{emp.tlfn}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); setEditingEmpresa(emp); setEmpresaFormData(emp); setShowEmpresaForm(true); }} className="p-1.5 text-text-muted hover:text-primary transition-colors">
                         <Edit2 className="h-4 w-4" />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ id: emp.id!, type: 'empresa' }); }} className="p-1.5 text-text-muted hover:text-red-500 transition-colors">
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmpresas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-text-muted text-sm italic">
                    {searchTerm ? 'No se encontraron empresas para esta búsqueda.' : 'No hay empresas registradas todavía.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sidebar Card */}
      <div className="w-full lg:w-85 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden min-h-75">
        {selectedEmpresa ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border-base">
              <h3 className="text-lg font-bold text-text-main leading-tight">Tutores Laborales</h3>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Ref: {selectedEmpresa.nombre}</p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {tutores.map(tutor => (
                <div key={tutor.id} className="p-4 bg-slate-50 border border-border-base rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-sm text-text-main leading-tight">{tutor.nombre} {tutor.apellidos}</div>
                    <div className="flex gap-1.5">
                       <button onClick={() => { setEditingTutor(tutor); setTutorFormData(tutor); setShowTutorForm(true); }} className="text-text-muted hover:text-primary">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm({ id: tutor.id!, type: 'tutor' })} className="text-text-muted hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Mail className="h-3 w-3" /> {tutor.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Phone className="h-3 w-3" /> {tutor.tlfn}
                    </div>
                    <div className="text-[10px] font-bold text-text-muted uppercase mt-2 tracking-wider">DNI/NIF: {tutor.nif}</div>
                  </div>
                </div>
              ))}

              {tutores.length === 0 && (
                <div className="py-12 text-center">
                  <UserPlus className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-text-muted font-medium">Sin tutores asignados</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border-base bg-slate-50/50">
              <button 
                onClick={() => { setShowTutorForm(true); setEditingTutor(null); setTutorFormData({ nombre: '', apellidos: '', nif: '', email: '', tlfn: '' }); }}
                className="w-full bg-primary text-white py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
              >
                + Añadir Tutor
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <Building2 className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-base font-bold text-text-main mb-2">Selecciona una empresa</h3>
            <p className="text-xs text-text-muted leading-relaxed">Haz clic en una empresa para gestionar sus tutores laborales y centros de trabajo.</p>
          </div>
        )}
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative text-center p-8 transition-all">
            <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              {showDeleteConfirm.type === 'empresa' 
                ? 'Esta acción eliminará la empresa y todos sus tutores asociados de forma permanente.' 
                : 'Esta acción eliminará al tutor de la empresa de forma permanente.'}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(null)} 
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (showDeleteConfirm.type === 'empresa') handleDeleteEmpresa(showDeleteConfirm.id);
                  else handleDeleteTutor(showDeleteConfirm.id);
                }}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all font-sans"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empresa Form Modal */}
      {showEmpresaForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingEmpresa ? 'Editar Empresa' : 'Registrar Empresa'}</h3>
              <button onClick={() => setShowEmpresaForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEmpresaSubmit} className="p-8 space-y-4">
              <div>
                <label className={labelClass}>Nombre Comercial</label>
                <input required className={inputClass} value={empresaFormData.nombre} onChange={e => setEmpresaFormData({...empresaFormData, nombre: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>CIF</label>
                <input required className={inputClass} value={empresaFormData.cif} onChange={e => setEmpresaFormData({...empresaFormData, cif: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Dirección Principal</label>
                <input required className={inputClass} value={empresaFormData.direccion} onChange={e => setEmpresaFormData({...empresaFormData, direccion: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input required className={inputClass} value={empresaFormData.ciudad} onChange={e => setEmpresaFormData({...empresaFormData, ciudad: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input required className={inputClass} value={empresaFormData.tlfn} onChange={e => setEmpresaFormData({...empresaFormData, tlfn: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email de Contacto</label>
                <input required type="email" className={inputClass} value={empresaFormData.email} onChange={e => setEmpresaFormData({...empresaFormData, email: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowEmpresaForm(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tutor Form Modal */}
      {showTutorForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingTutor ? 'Editar Tutor' : 'Nuevo Tutor'}</h3>
              <button onClick={() => setShowTutorForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleTutorSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input required className={inputClass} value={tutorFormData.nombre} onChange={e => setTutorFormData({...tutorFormData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Apellidos</label>
                  <input required className={inputClass} value={tutorFormData.apellidos} onChange={e => setTutorFormData({...tutorFormData, apellidos: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={labelClass}>NIF / NIE</label>
                <input required className={inputClass} value={tutorFormData.nif} onChange={e => setTutorFormData({...tutorFormData, nif: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Email Directo</label>
                <input required type="email" className={inputClass} value={tutorFormData.email} onChange={e => setTutorFormData({...tutorFormData, email: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Teléfono Directo</label>
                <input required className={inputClass} value={tutorFormData.tlfn} onChange={e => setTutorFormData({...tutorFormData, tlfn: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowTutorForm(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">Confirmar Tutor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
