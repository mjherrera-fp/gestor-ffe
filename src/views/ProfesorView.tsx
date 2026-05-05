import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Phone, Building2, GraduationCap, Plus, Trash2, Edit2, MapPin, Hash, Briefcase, Layers, Info, CheckCircle, CheckCircle2 } from 'lucide-react';
import { Profesor, CentroEducativo, DetalleAcademico, ResultadoAprendizaje } from '../types/index.ts';

interface Props {
  profesor: Profesor | null;
  onUpdate: (profesor: Profesor) => void;
}

const FormSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-border-base shadow-sm overflow-hidden mb-6">
    <div className="px-6 py-4 border-b border-border-base bg-slate-50/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm text-text-main uppercase tracking-widest">{title}</h3>
      </div>
    </div>
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

export default function ProfesorView({ profesor, onUpdate }: Props) {
  const [formData, setFormData] = useState<Profesor>({
    nombre: '',
    apellidos: '',
    nif: '',
    email: '',
    telefono: ''
  });

  const [centros, setCentros] = useState<(CentroEducativo & { detalles: DetalleAcademico[] })[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Modals / Forms
  const [showCentroForm, setShowCentroForm] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroEducativo | null>(null);
  const [centroFormData, setCentroFormData] = useState<Partial<CentroEducativo>>({});

  const [showDetalleForm, setShowDetalleForm] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState<DetalleAcademico | null>(null);
  const [detalleFormData, setDetalleFormData] = useState<Partial<DetalleAcademico>>({});
  const [currentCentroId, setCurrentCentroId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: number, type: 'centro' | 'detalle' } | null>(null);

  const [newRA, setNewRA] = useState<Partial<ResultadoAprendizaje>>({
    modulo: '',
    codigo: '',
    ra: '',
    nombre: '',
    impartidoEmpresa: false,
    actividadFormativa: ''
  });

  const addRA = () => {
    if (!newRA.modulo || !newRA.codigo || !newRA.ra || !newRA.nombre) {
      alert('Por favor, rellena los campos obligatorios del Resultado de Aprendizaje.');
      return;
    }
    const ra: ResultadoAprendizaje = {
      id: crypto.randomUUID(),
      modulo: newRA.modulo!,
      codigo: newRA.codigo!,
      ra: newRA.ra!,
      nombre: newRA.nombre!,
      impartidoEmpresa: newRA.impartidoEmpresa || false,
      actividadFormativa: newRA.actividadFormativa
    };
    const resultadosAprendizaje = [...(detalleFormData.resultadosAprendizaje || []), ra];
    setDetalleFormData({ ...detalleFormData, resultadosAprendizaje });
    setNewRA({
      modulo: '',
      codigo: '',
      ra: '',
      nombre: '',
      impartidoEmpresa: false,
      actividadFormativa: ''
    });
  };

  const removeRA = (id: string) => {
    const resultadosAprendizaje = (detalleFormData.resultadosAprendizaje || []).filter(r => r.id !== id);
    setDetalleFormData({ ...detalleFormData, resultadosAprendizaje });
  };

  useEffect(() => {
    if (profesor) {
      setFormData(profesor);
      fetchCentros();
    }
  }, [profesor]);

  const fetchCentros = async () => {
    if (!profesor?.id) return;
    setLoadingCentros(true);
    try {
      const res = await fetch('/api/centros');
      const centrosData: CentroEducativo[] = await res.json();
      
      const centrosWithDetalles = await Promise.all(centrosData.map(async (c) => {
        const dRes = await fetch(`/api/centros/${c.id}/detalles`);
        const detalles = await dRes.json();
        return { ...c, detalles };
      }));
      
      setCentros(centrosWithDetalles);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCentros(false);
    }
  };

  const handleSubmitProfesor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/profesor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdate({ ...formData, id: data.id });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesor?.id) {
      alert("Error: Debes guardar tu perfil personal antes de añadir centros educativos.");
      return;
    }
    setSaving(true);
    try {
      const method = editingCentro ? 'PUT' : 'POST';
      const url = editingCentro ? `/api/centros/${editingCentro.id}` : '/api/centros';
      const body = { ...centroFormData, profesorId: profesor.id };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setShowCentroForm(false);
        setEditingCentro(null);
        setCentroFormData({});
        fetchCentros();
      } else {
        const err = await res.json();
        alert("Error al guardar el centro: " + (err.error || "Error desconocido"));
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCentro = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar este centro y todos sus detalles académicos?')) return;
    await fetch(`/api/centros/${id}`, { method: 'DELETE' });
    fetchCentros();
  };

  const handleSaveDetalle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCentroId) return;
    setSaving(true);
    try {
      const method = editingDetalle ? 'PUT' : 'POST';
      const url = editingDetalle ? `/api/detalles-academicos/${editingDetalle.id}` : '/api/detalles-academicos';
      const body = { ...detalleFormData, centroId: currentCentroId };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setShowDetalleForm(false);
        setEditingDetalle(null);
        setDetalleFormData({});
        fetchCentros();
      } else {
        const err = await res.json();
        alert("Error al guardar el detalle académico: " + (err.error || "Error desconocido"));
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDetalle = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar este detalle académico?')) return;
    await fetch(`/api/detalles-academicos/${id}`, { method: 'DELETE' });
    fetchCentros();
  };

  const inputClass = "w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans";
  const labelClass = "block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-12">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative text-center p-8 transition-all">
            <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Plus className="rotate-45 h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              {showDeleteConfirm.type === 'centro' 
                ? 'Esta acción eliminará el centro educativo y todos sus ciclos asociados de forma permanente.' 
                : 'Esta acción eliminará el ciclo formativo de forma permanente.'}
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
                  if (showDeleteConfirm.type === 'centro') handleDeleteCentro(showDeleteConfirm.id);
                  else handleDeleteDetalle(showDeleteConfirm.id);
                }}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all font-sans"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitProfesor} className="max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">Perfil del Profesor</h1>
            <p className="text-xs lg:text-sm text-text-muted mt-1 leading-relaxed">Configura tu información personal y los centros donde impartes clase.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {saving ? 'Procesando...' : (
              <span className="flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> Guardar Perfil
              </span>
            )}
          </button>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-5 py-4 rounded-xl flex items-center gap-3 mb-8 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold">Información personal actualizada.</span>
          </div>
        )}

        <FormSection title="Información Personal" icon={User}>
          <div className="col-span-1">
            <label className={labelClass}>Nombre</label>
            <input required className={inputClass} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Apellidos</label>
            <input required className={inputClass} value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>NIF</label>
            <input required className={inputClass} value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Email</label>
            <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Teléfono</label>
            <input required className={inputClass} value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
          </div>
        </FormSection>
      </form>

      {/* Centros Educativos Section */}
      <div className="max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Centros Educativos</h2>
              <p className="text-xs text-slate-500">Un profesor puede estar adscrito a varios centros.</p>
            </div>
          </div>
          <button
            disabled={!profesor?.id}
            onClick={() => {
              setEditingCentro(null);
              setCentroFormData({});
              setShowCentroForm(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Añadir Centro
          </button>
        </div>

        {loadingCentros ? (
          <div className="py-12 text-center text-slate-400 italic text-sm">Cargando centros...</div>
        ) : centros.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-16 px-10 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-600 font-bold mb-1">No hay centros registrados</h3>
            <p className="text-slate-400 text-xs">Registra tu primer centro educativo para empezar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {centros.map(centro => (
              <div key={centro.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black text-primary text-lg sm:text-xl shrink-0">
                      {centro.nombre.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-800 leading-tight truncate">{centro.nombre}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 font-bold whitespace-nowrap">
                          <MapPin className="h-3 w-3" /> {centro.ciudad}
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 font-bold whitespace-nowrap">
                          <Phone className="h-3 w-3" /> {centro.telefono}
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 font-bold whitespace-nowrap">
                          <Mail className="h-3 w-3" /> {centro.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditingCentro(centro);
                        setCentroFormData(centro);
                        setShowCentroForm(true);
                      }}
                      className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm({ id: centro.id!, type: 'centro' })}
                      className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5" /> Detalles de Ciclo (Detalle Académico)
                    </h5>
                    <button
                      onClick={() => {
                        setCurrentCentroId(centro.id!);
                        setEditingDetalle(null);
                        setDetalleFormData({});
                        setShowDetalleForm(true);
                      }}
                      className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Añadir Ciclo
                    </button>
                  </div>

                  {centro.detalles.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-[10px] italic">No hay ciclos registrados en este centro.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {centro.detalles.map(detalle => (
                        <div key={detalle.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group relative">
                          <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                               <div className="bg-primary/10 px-2 py-0.5 rounded text-[9px] font-black text-primary uppercase">
                                 Grupo: {detalle.codigoGrupo}
                               </div>
                               <div className="bg-indigo-50 px-2 py-0.5 rounded text-[9px] font-black text-indigo-600 uppercase border border-indigo-100">
                                 {detalle.resultadosAprendizaje?.length || 0} RA
                               </div>
                             </div>
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                <button onClick={() => {
                                  setCurrentCentroId(centro.id!);
                                  setEditingDetalle(detalle);
                                  setDetalleFormData(detalle);
                                  setShowDetalleForm(true);
                                }} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 className="h-3 w-3" /></button>
                                <button onClick={() => setShowDeleteConfirm({ id: detalle.id!, type: 'detalle' })} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                             </div>
                          </div>
                          <div className="font-bold text-slate-800 text-xs mb-1 line-clamp-1">{detalle.ciclo}</div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-medium">
                              <span className="font-bold">Nivel:</span> {detalle.nivel}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-medium">
                               <span className="font-bold">Grado:</span> {detalle.grado}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-medium">
                               <span className="font-bold">Régimen:</span> {detalle.regimen}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Centro Modal */}
      {showCentroForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
                {editingCentro ? 'Editar Centro' : 'Añadir Nuevo Centro'}
              </h3>
              <button onClick={() => setShowCentroForm(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45 h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveCentro} className="p-8 space-y-4">
              <div>
                <label className={labelClass}>Nombre del Centro</label>
                <input required className={inputClass} value={centroFormData.nombre || ''} onChange={e => setCentroFormData({...centroFormData, nombre: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input required className={inputClass} value={centroFormData.ciudad || ''} onChange={e => setCentroFormData({...centroFormData, ciudad: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input required className={inputClass} value={centroFormData.telefono || ''} onChange={e => setCentroFormData({...centroFormData, telefono: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input required type="email" className={inputClass} value={centroFormData.email || ''} onChange={e => setCentroFormData({...centroFormData, email: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all mt-6 shadow-xl shadow-primary/20">
                Guardar Centro Educativo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detalle Modal */}
      {showDetalleForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
                 Configuración de Ciclo (Detalle Académico)
              </h3>
              <button onClick={() => setShowDetalleForm(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45 h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveDetalle} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1">Nombre del Ciclo</label>
                  <input required className={inputClass} value={detalleFormData.ciclo || ''} onChange={e => setDetalleFormData({...detalleFormData, ciclo: e.target.value})} placeholder="Ej: Desarrollo de Aplicaciones Multiplataforma"/>
                </div>
                
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1">Código</label>
                    <input required className={inputClass} value={detalleFormData.codigo || ''} onChange={e => setDetalleFormData({...detalleFormData, codigo: e.target.value})} placeholder="Ej: IFC303"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1">Grupo</label>
                    <input required className={inputClass} value={detalleFormData.codigoGrupo || ''} onChange={e => setDetalleFormData({...detalleFormData, codigoGrupo: e.target.value})} placeholder="Ej: 2IFCS02DA"/>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1">Nivel</label>
                    <input required className={inputClass} value={detalleFormData.nivel || ''} onChange={e => setDetalleFormData({...detalleFormData, nivel: e.target.value})} placeholder="Ej: 2º"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1">Grado</label>
                    <input required className={inputClass} value={detalleFormData.grado || ''} onChange={e => setDetalleFormData({...detalleFormData, grado: e.target.value})} placeholder="Ej: Superior"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1">Régimen</label>
                    <input required className={inputClass} value={detalleFormData.regimen || ''} onChange={e => setDetalleFormData({...detalleFormData, regimen: e.target.value})} placeholder="Ej: General"/>
                  </div>
                </div>
              </div>

              {/* RA Management Section - COMPACT DESIGN */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Resultados de Aprendizaje</h4>
                  </div>
                  <span className="bg-indigo-50 px-2 py-0.5 rounded text-[9px] font-black text-indigo-600 uppercase">
                    {detalleFormData.resultadosAprendizaje?.length || 0} RA
                  </span>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1">
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-400"
                        value={newRA.modulo}
                        onChange={e => setNewRA({...newRA, modulo: e.target.value})}
                        placeholder="Módulo"
                      />
                    </div>
                    <div className="col-span-1">
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-400"
                        value={newRA.codigo}
                        onChange={e => setNewRA({...newRA, codigo: e.target.value})}
                        placeholder="Cód."
                      />
                    </div>
                    <div className="col-span-2">
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-400"
                        value={newRA.ra}
                        onChange={e => setNewRA({...newRA, ra: e.target.value})}
                        placeholder="ID RA (Ej: RA1)"
                      />
                    </div>
                  </div>
                  
                  <input 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-400"
                    value={newRA.nombre}
                    onChange={e => setNewRA({...newRA, nombre: e.target.value})}
                    placeholder="Nombre descriptivo del RA"
                  />

                  <div>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-400 resize-none h-16"
                      value={newRA.actividadFormativa}
                      onChange={e => setNewRA({...newRA, actividadFormativa: e.target.value})}
                      placeholder="Ejemplo de Actividad Formativa (Opcional)..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex-1">
                      <input 
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={newRA.impartidoEmpresa}
                        onChange={e => setNewRA({...newRA, impartidoEmpresa: e.target.checked})}
                      />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Íntegro empresa</span>
                    </label>
                    <button 
                      type="button"
                      onClick={addRA}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Añadir RA
                    </button>
                  </div>
                </div>

                {/* RA scrolling list */}
                <div className="mt-4 space-y-2 max-h-45 overflow-y-auto pr-1">
                  {detalleFormData.resultadosAprendizaje?.map((ra) => (
                    <div key={ra.id} className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm flex items-start justify-between gap-3 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{ra.modulo}:{ra.ra}</span>
                          {ra.impartidoEmpresa && (
                            <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                              <CheckCircle className="h-2.5 w-2.5" /> Empresa
                            </span>
                          )}
                        </div>
                        <h5 className="text-[10px] font-black text-slate-800 leading-tight">{ra.nombre}</h5>
                        {ra.actividadFormativa && (
                          <p className="text-[9px] text-slate-400 mt-1 italic line-clamp-2 leading-tight">{ra.actividadFormativa}</p>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeRA(ra.id)}
                        className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!detalleFormData.resultadosAprendizaje || detalleFormData.resultadosAprendizaje.length === 0) && (
                    <div className="text-center py-6 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">Sin RA definidos</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
                  Guardar Detalle Académico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
