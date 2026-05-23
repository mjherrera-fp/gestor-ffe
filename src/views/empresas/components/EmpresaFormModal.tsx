import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react';
import { Empresa } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { ConvenioRapidoState } from '../hooks/useEmpresas.ts';
import { comunidades, allProvincias, searchProvincias, searchLocalidades, getComunidadBySlug } from '../../../data/geo/geoData.ts';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1';

interface EmpresaFormModalProps {
  editing: Empresa | null;
  formData: Partial<Empresa>;
  onChange: (data: Partial<Empresa>) => void;
  convenioRapido: ConvenioRapidoState;
  onConvenioRapidoChange: (data: ConvenioRapidoState) => void;
  centros: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function EmpresaFormModal({
  editing, formData, onChange,
  convenioRapido, onConvenioRapidoChange,
  centros, onSubmit, onClose,
}: EmpresaFormModalProps) {
  const [comunidadSlug, setComunidadSlug] = useState<string | null>(null);
  const [provinciaSlug, setProvinciaSlug] = useState<string | null>(null);
  const [comunidadFocused, setComunidadFocused] = useState(false);
  const [provinciaFocused, setProvinciaFocused] = useState(false);
  const [localidadFocused, setLocalidadFocused] = useState(false);
  const [comunidadHighlighted, setComunidadHighlighted] = useState(-1);
  const [provinciaHighlighted, setProvinciaHighlighted] = useState(-1);
  const [localidadHighlighted, setLocalidadHighlighted] = useState(-1);
  const comunidadRef = useRef<HTMLDivElement>(null);
  const provinciaRef = useRef<HTMLDivElement>(null);
  const localidadRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => { if (blurTimerRef.current) clearTimeout(blurTimerRef.current); };
  }, []);

  useEffect(() => {
    if (formData.comunidad) {
      const m = comunidades.find(c => c.name === formData.comunidad);
      if (m) setComunidadSlug(m.slug);
    }
    if (formData.provincia) {
      const m = allProvincias.find(p => p.name === formData.provincia);
      if (m) setProvinciaSlug(m.slug);
    }
  }, []);

  const update = (field: keyof Empresa) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  /* ── Comunidad ── */
  const searchCom = (formData.comunidad || '').toLowerCase();
  const filteredComunidades = searchCom.length > 0
    ? comunidades.filter(c => c.name.toLowerCase().includes(searchCom)).slice(0, 20)
    : [];
  const showComunidadDropdown = comunidadFocused && filteredComunidades.length > 0;

  useEffect(() => { setComunidadHighlighted(-1); }, [filteredComunidades.length]);

  const selectComunidad = (name: string, slug: string) => {
    const next: Partial<Empresa> = { ...formData, comunidad: name };
    if (slug !== comunidadSlug) {
      next.provincia = '';
      next.ciudad = '';
      setProvinciaSlug(null);
    }
    onChange(next);
    setComunidadSlug(slug);
    setComunidadFocused(false);
  };

  const handleComunidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...formData, comunidad: e.target.value });
    setComunidadHighlighted(-1);
    setComunidadSlug(null);
  };

  const handleComunidadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showComunidadDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setComunidadHighlighted(prev => Math.min(prev + 1, filteredComunidades.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setComunidadHighlighted(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter' && comunidadHighlighted >= 0) { e.preventDefault(); const m = filteredComunidades[comunidadHighlighted]; selectComunidad(m.name, m.slug); }
    else if (e.key === 'Escape') setComunidadFocused(false);
  };

  /* ── Provincia ── */
  const searchProv = (formData.provincia || '').toLowerCase();
  const filteredProvincias = searchProv.length > 0
    ? searchProvincias(searchProv, comunidadSlug ?? undefined)
    : [];
  const showProvinciaDropdown = provinciaFocused && filteredProvincias.length > 0;

  useEffect(() => { setProvinciaHighlighted(-1); }, [filteredProvincias.length]);

  const selectProvincia = (name: string, slug: string, ccaaSlug: string, ccaaName: string) => {
    const next: Partial<Empresa> = { ...formData, provincia: name };
    if (slug !== provinciaSlug) {
      next.ciudad = '';
    }
    if (!comunidadSlug && formData.comunidad !== ccaaName) {
      next.comunidad = ccaaName;
      setComunidadSlug(ccaaSlug);
    }
    onChange(next);
    setProvinciaSlug(slug);
    setProvinciaFocused(false);
  };

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...formData, provincia: e.target.value });
    setProvinciaHighlighted(-1);
    setProvinciaSlug(null);
  };

  const handleProvinciaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProvinciaDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setProvinciaHighlighted(prev => Math.min(prev + 1, filteredProvincias.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setProvinciaHighlighted(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter' && provinciaHighlighted >= 0) { e.preventDefault(); const m = filteredProvincias[provinciaHighlighted]; selectProvincia(m.name, m.slug, m.ccaaSlug, m.ccaaName); }
    else if (e.key === 'Escape') setProvinciaFocused(false);
  };

  /* ── Localidad ── */
  const searchLoc = (formData.ciudad || '').toLowerCase();
  const filteredLocalidades = searchLoc.length > 0
    ? searchLocalidades(searchLoc, provinciaSlug ?? undefined, !provinciaSlug ? (comunidadSlug ?? undefined) : undefined)
    : [];
  const showLocalidadDropdown = localidadFocused && filteredLocalidades.length > 0;

  useEffect(() => { setLocalidadHighlighted(-1); }, [filteredLocalidades.length]);

  const selectLocalidad = (name: string, entryProvinciaSlug: string, entryProvinciaName: string, entryCcaaSlug: string, entryCcaaName: string) => {
    const next: Partial<Empresa> = { ...formData, ciudad: name };
    if (!provinciaSlug && formData.provincia !== entryProvinciaName) {
      next.provincia = entryProvinciaName;
      setProvinciaSlug(entryProvinciaSlug);
    }
    if (!comunidadSlug && formData.comunidad !== entryCcaaName) {
      next.comunidad = entryCcaaName;
      setComunidadSlug(entryCcaaSlug);
    }
    onChange(next);
    setLocalidadFocused(false);
  };

  const handleLocalidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...formData, ciudad: e.target.value });
    setLocalidadHighlighted(-1);
  };

  const handleLocalidadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLocalidadDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setLocalidadHighlighted(prev => Math.min(prev + 1, filteredLocalidades.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setLocalidadHighlighted(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter' && localidadHighlighted >= 0) { e.preventDefault(); const m = filteredLocalidades[localidadHighlighted]; selectLocalidad(m.name, m.provinciaSlug, m.provinciaName, m.ccaaSlug, m.ccaaName); }
    else if (e.key === 'Escape') setLocalidadFocused(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {editing ? 'Editar Empresa' : 'Registrar Empresa'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>Nombre Comercial</label>
            <input required className={inputCls} value={formData.nombre || ''} onChange={update('nombre')} />
          </div>
          <div>
            <label className={labelCls}>CIF</label>
            <input required className={inputCls} value={formData.cif || ''} onChange={update('cif')} />
          </div>
          <div>
            <label className={labelCls}>Dirección Principal</label>
            <input required className={inputCls} value={formData.direccion || ''} onChange={update('direccion')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div ref={comunidadRef}>
              <label className={labelCls}>Comunidad</label>
              <div className="relative">
                <input
                  required
                  className={inputCls}
                  value={formData.comunidad || ''}
                  onChange={handleComunidadChange}
                  onFocus={() => setComunidadFocused(true)}
                  onBlur={() => { blurTimerRef.current = setTimeout(() => setComunidadFocused(false), 200); }}
                  onKeyDown={handleComunidadKeyDown}
                />
                {showComunidadDropdown && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredComunidades.map((c, i) => (
                      <button
                        key={c.slug}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectComunidad(c.name, c.slug); }}
                        onMouseEnter={() => setComunidadHighlighted(i)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-50 last:border-0 ${i === comunidadHighlighted ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div ref={provinciaRef}>
              <label className={labelCls}>Provincia</label>
              <div className="relative">
                <input
                  required
                  className={inputCls}
                  value={formData.provincia || ''}
                  onChange={handleProvinciaChange}
                  onFocus={() => setProvinciaFocused(true)}
                  onBlur={() => { blurTimerRef.current = setTimeout(() => setProvinciaFocused(false), 200); }}
                  onKeyDown={handleProvinciaKeyDown}
                />
                {showProvinciaDropdown && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredProvincias.map((p, i) => (
                      <button
                        key={`${p.ccaaSlug}-${p.slug}`}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectProvincia(p.name, p.slug, p.ccaaSlug, p.ccaaName); }}
                        onMouseEnter={() => setProvinciaHighlighted(i)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-50 last:border-0 ${i === provinciaHighlighted ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div ref={localidadRef}>
              <label className={labelCls}>Localidad</label>
              <div className="relative">
                <input
                  required
                  className={inputCls}
                  value={formData.ciudad || ''}
                  onChange={handleLocalidadChange}
                  onFocus={() => setLocalidadFocused(true)}
                  onBlur={() => { blurTimerRef.current = setTimeout(() => setLocalidadFocused(false), 200); }}
                  onKeyDown={handleLocalidadKeyDown}
                />
                {showLocalidadDropdown && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredLocalidades.map((l, i) => (
                      <button
                        key={`${l.provinciaSlug}-${l.slug}`}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectLocalidad(l.name, l.provinciaSlug, l.provinciaName, l.ccaaSlug, l.ccaaName); }}
                        onMouseEnter={() => setLocalidadHighlighted(i)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-50 last:border-0 ${i === localidadHighlighted ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{l.name}</span>
                        {!provinciaSlug && (
                          <span className="ml-auto text-[10px] text-slate-400">{l.provinciaName}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input required className={inputCls} value={formData.tlfn || ''} onChange={update('tlfn')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Persona de Contacto</label>
            <input className={inputCls} value={formData.personaContacto || ''} onChange={update('personaContacto')} />
          </div>
          <div>
            <label className={labelCls}>Email de Contacto</label>
            <input required type="email" className={inputCls} value={formData.email || ''} onChange={update('email')} />
          </div>
          <div>
            <label className={labelCls}>Comentarios (opcional)</label>
            <textarea
              rows={3}
              className={inputCls + ' resize-none'}
              placeholder="Notas sobre la empresa..."
              value={formData.comentarios || ''}
              onChange={e => onChange({ ...formData, comentarios: e.target.value })}
            />
          </div>

          {/* Convenio rápido (solo al crear) */}
          {!editing && (
            <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convenioRapido.tieneConvenio}
                  onChange={e => onConvenioRapidoChange({ ...convenioRapido, tieneConvenio: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700">
                  La empresa ya tiene un convenio firmado
                </span>
              </label>

              {convenioRapido.tieneConvenio && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="sm:col-span-2">
                    <CustomSelect
                      label="Centro Educativo"
                      required={convenioRapido.tieneConvenio}
                      value={convenioRapido.centroId}
                      onChange={val => onConvenioRapidoChange({ ...convenioRapido, centroId: Number(val) })}
                      options={centros.map(c => ({ id: c.id, label: c.nombre }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Número de Convenio</label>
                    <input
                      required={convenioRapido.tieneConvenio}
                      type="text"
                      value={convenioRapido.numConvenio}
                      onChange={e => onConvenioRapidoChange({ ...convenioRapido, numConvenio: e.target.value })}
                      className={inputCls}
                      placeholder="Ej: 28074852 / 0000"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fecha del Convenio</label>
                    <input
                      required={convenioRapido.tieneConvenio}
                      type="date"
                      value={convenioRapido.fechaConvenio}
                      onChange={e => onConvenioRapidoChange({ ...convenioRapido, fechaConvenio: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
