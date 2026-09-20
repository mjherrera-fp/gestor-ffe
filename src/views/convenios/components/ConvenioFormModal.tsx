import React from 'react';
import { X, Search, Building2, CheckCircle2 } from 'lucide-react';
import { Empresa, CentroEducativo } from '../../../types/index.ts';
import { CustomSelect } from '../../../components/CustomSelect.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { ConvenioFormState } from '../hooks/useConvenios.ts';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';

interface ConvenioFormModalProps {
  open: boolean;
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

const inputCls = 'w-full bg-surface-subtle border border-border-base rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  fechaConvenio: [],
  numConvenio: [],
};

export function ConvenioFormModal({
  open, isEditing, formData, setFormData,
  empresas, filteredEmpresas, selectedEmpresa, searchTermEmpresa,
  onSearchEmpresaChange, onSelectEmpresa, onClearEmpresa,
  centros, selectedCentro, onCentroChange,
  onSubmit, onClose,
}: ConvenioFormModalProps) {
  const { errors, onBlur, validateAll, setFieldError } = useFormValidation(RULES);

  const validateSelectedFields = () => {
    setFieldError('selectedCentro', null);
    if (!selectedEmpresa) {
      setFieldError('selectedEmpresa', 'Empresa Supervisora es obligatoria');
      return false;
    }
    setFieldError('selectedEmpresa', null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(formData)) return;
    if (!validateSelectedFields()) return;
    onSubmit(e);
  };

  const numConvenioCodigo = centros.find(c => c.id === selectedCentro)?.codigoCentro?.trim() || '00000000';

  return (
    <Modal open={open} onClose={onClose} maxWidth="3xl" cardClass="rounded-4xl">

        {/* Header */}
        <div className="px-10 py-8 bg-surface-subtle border-b border-border-base flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl font-black text-text-main tracking-tight">
              {isEditing ? 'Editar Convenio' : 'Nuevo Convenio de Prácticas'}
            </h3>
            <p className="text-sm text-text-muted font-medium">
              {isEditing
                ? 'Modifica los datos principales del convenio.'
                : 'Asocia un tutor de empresa para crear el convenio marco.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto flex-1">

          {/* Centro Educativo */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
              Centro Educativo<span className="text-amber-500 ml-0.5">*</span>
            </label>
            <CustomSelect
              options={centros.map(c => ({ id: c.id!, label: c.nombre }))}
              value={selectedCentro || ''}
              onChange={val => onCentroChange(Number(val))}
              name="centroId"
              error={errors.selectedCentro}
            />
          </div>

          {/* Empresa Supervisora */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
              Empresa Supervisora<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Escribe para buscar empresa..."
                  className={`w-full bg-surface-hover/50 border border-border-base rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all ${errors.selectedEmpresa ? inputErrCls : ''}`}
                  value={searchTermEmpresa}
                  onChange={e => onSearchEmpresaChange(e.target.value)}
                />
              </div>

              {/* Dropdown resultados */}
              {searchTermEmpresa && !selectedEmpresa && (
                <div className="absolute z-10 w-full bg-surface-card border border-border-base rounded-xl shadow-xl -mt-2 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredEmpresas.map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEmpresa(e.id!, e.nombre)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-surface-subtle border-b border-border-base last:border-0 transition-colors flex items-center gap-3"
                    >
                      <Building2 className="h-4 w-4 text-text-muted" />
                      <span className="font-bold text-text-main">{e.nombre}</span>
                    </button>
                  ))}
                  {filteredEmpresas.length === 0 && (
                    <div className="p-4 text-center text-xs text-text-muted italic">
                      No se encontraron empresas
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Empresa seleccionada */}
            {selectedEmpresa && (
              <div className="flex items-center gap-2 bg-primary-light border border-primary-light p-3 rounded-xl mb-4">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary">
                  Seleccionada: {empresas.find(e => e.id === selectedEmpresa)?.nombre}
                </span>
                <button
                  type="button"
                  onClick={onClearEmpresa}
                  className="ml-auto text-[10px] font-bold text-primary uppercase hover:underline"
                >
                  Cambiar
                </button>
              </div>
            )}
            {errors.selectedEmpresa && <p className={errMsgCls}>{errors.selectedEmpresa}</p>}
          </div>

          {/* Fecha y número */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                Fecha del Convenio<span className="text-amber-500 ml-0.5">*</span>
              </label>
              <input
                type="date"
                className={`${inputCls} ${errors.fechaConvenio ? inputErrCls : ''}`}
                value={formData.fechaConvenio}
                onChange={e => setFormData(prev => ({ ...prev, fechaConvenio: e.target.value }))}
                onBlur={() => onBlur('fechaConvenio', formData.fechaConvenio)}
              />
              {errors.fechaConvenio && <p className={errMsgCls}>{errors.fechaConvenio}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                Nº Convenio<span className="text-amber-500 ml-0.5">*</span>
              </label>
              <input
                placeholder={`C-${numConvenioCodigo}-0000`}
                className={`${inputCls} ${errors.numConvenio ? inputErrCls : ''}`}
                value={formData.numConvenio}
                onChange={e => setFormData(prev => ({ ...prev, numConvenio: e.target.value }))}
                onBlur={() => onBlur('numConvenio', formData.numConvenio)}
              />
              {errors.numConvenio && <p className={errMsgCls}>{errors.numConvenio}</p>}
            </div>
          </div>

          {/* Toggle activo */}
          <div className="p-4 bg-success-soft/50 border border-success/20 rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isActive}
                  onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-border-base peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-success/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border-base after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-success-strong">Convenio Activo</span>
                <span className="text-[10px] font-medium text-success">
                  Marca esto si el convenio ya está activado
                </span>
              </div>
            </label>
          </div>

          {/* Botones */}
          <div className="pt-8 border-t border-border-base flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-sm font-bold text-text-muted hover:bg-surface-subtle rounded-2xl border border-border-base transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-4 bg-primary text-white text-sm font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest"
            >
              {isEditing ? 'Guardar Cambios' : 'Generar Convenio'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
