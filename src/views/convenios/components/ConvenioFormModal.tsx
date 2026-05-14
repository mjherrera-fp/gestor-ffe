import React from 'react';
import { X, Search, Building2, CheckCircle2 } from 'lucide-react';
import { Empresa, CentroEducativo } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { ConvenioFormState } from '../hooks/useConvenios.ts';

interface ConvenioFormModalProps {
  isEditing: boolean;
  formData: ConvenioFormState;
  setFormData: React.Dispatch<React.SetStateAction<ConvenioFormState>>;
  // Empresa
  empresas: Empresa[];
  filteredEmpresas: Empresa[];
  selectedEmpresa: number | null;
  searchTermEmpresa: string;
  onSearchEmpresaChange: (v: string) => void;
  onSelectEmpresa: (id: number, nombre: string) => void;
  onClearEmpresa: () => void;
  // Centro
  centros: CentroEducativo[];
  selectedCentro: number | null;
  onCentroChange: (id: number) => void;
  // Acciones
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ConvenioFormModal({
  isEditing, formData, setFormData,
  empresas, filteredEmpresas, selectedEmpresa, searchTermEmpresa,
  onSearchEmpresaChange, onSelectEmpresa, onClearEmpresa,
  centros, selectedCentro, onCentroChange,
  onSubmit, onClose,
}: ConvenioFormModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden">

        {/* Header */}
        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Editar Convenio' : 'Nuevo Convenio de Prácticas'}
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              {isEditing
                ? 'Modifica los datos principales del convenio.'
                : 'Asocia un tutor de empresa para crear el convenio marco.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-10 space-y-8">

          {/* Centro Educativo */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Centro Educativo
            </label>
            <CustomSelect
              options={centros.map(c => ({ id: c.id!, label: c.nombre }))}
              value={selectedCentro || ''}
              onChange={val => onCentroChange(Number(val))}
              name="centroId"
            />
          </div>

          {/* Empresa Supervisora */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Empresa Supervisora
            </label>
            <div className="relative">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escribe para buscar empresa..."
                  className="w-full bg-slate-100/50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                  value={searchTermEmpresa}
                  onChange={e => onSearchEmpresaChange(e.target.value)}
                />
              </div>

              {/* Dropdown resultados */}
              {searchTermEmpresa && !selectedEmpresa && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl -mt-2 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredEmpresas.map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEmpresa(e.id!, e.nombre)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex items-center gap-3"
                    >
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="font-bold text-slate-700">{e.nombre}</span>
                    </button>
                  ))}
                  {filteredEmpresas.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No se encontraron empresas
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Empresa seleccionada */}
            {selectedEmpresa && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900">
                  Seleccionada: {empresas.find(e => e.id === selectedEmpresa)?.nombre}
                </span>
                <button
                  type="button"
                  onClick={onClearEmpresa}
                  className="ml-auto text-[10px] font-bold text-blue-600 uppercase hover:underline"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* Fecha y número */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Fecha del Convenio
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                value={formData.fechaConvenio}
                onChange={e => setFormData(prev => ({ ...prev, fechaConvenio: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Nº Convenio
              </label>
              <input
                placeholder="Ej: 28074852 / 0000"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                value={formData.numConvenio}
                onChange={e => setFormData(prev => ({ ...prev, numConvenio: e.target.value }))}
              />
            </div>
          </div>

          {/* Toggle activo */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isActive}
                  onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-emerald-900">Convenio Activo</span>
                <span className="text-[10px] font-medium text-emerald-600">
                  Marca esto si el convenio ya está activado
                </span>
              </div>
            </label>
          </div>

          {/* Botones */}
          <div className="pt-8 border-t border-slate-100 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
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
  );
}
