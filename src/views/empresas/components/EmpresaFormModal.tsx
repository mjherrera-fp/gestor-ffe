import React from 'react';
import { X } from 'lucide-react';
import { Empresa } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { ConvenioRapidoState } from '../hooks/useEmpresas.ts';

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
  const update = (field: keyof Empresa) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...formData, [field]: e.target.value });

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
            <div>
              <label className={labelCls}>Ciudad</label>
              <input required className={inputCls} value={formData.ciudad || ''} onChange={update('ciudad')} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input required className={inputCls} value={formData.tlfn || ''} onChange={update('tlfn')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email de Contacto</label>
            <input required type="email" className={inputCls} value={formData.email || ''} onChange={update('email')} />
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
