import React from 'react';
import { Trash2, X } from 'lucide-react';

import { useEmpresas }        from './hooks/useEmpresas.ts';
import { EmpresasListado }    from './components/EmpresasListado.tsx';
import { TutoresPanel }       from './components/TutoresPanel.tsx';
import { EmpresaFormModal }   from './components/EmpresaFormModal.tsx';
import { TutorFormModal }     from './components/TutorFormModal.tsx';

interface Props {
  cursoId: number;
}

export default function EmpresasView({ cursoId }: Props) {
  const ctx = useEmpresas(cursoId);

  return (
    <>
      {/* ── CABECERA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">
            Empresas e Instituciones Colaboradoras
          </h1>
          <p className="text-xs lg:text-sm text-text-muted mt-1 leading-relaxed">
            Configura la información de las empresas e instituciones colaboradoras.
          </p>
        </div>
      </div>

      {/* ── LAYOUT DOS COLUMNAS ── */}
      <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

        {/* Columna izquierda: listado */}
        <EmpresasListado
          empresas={ctx.filteredEmpresas}
          selectedEmpresa={ctx.selectedEmpresa}
          searchTerm={ctx.searchTerm}
          onSearchChange={ctx.setSearchTerm}
          onSelectEmpresa={ctx.handleSelectEmpresa}
          onNew={ctx.handleOpenNewEmpresa}
          onEdit={ctx.handleOpenEditEmpresa}
          onDeleteRequest={id => ctx.setShowDeleteConfirm({ id, type: 'empresa' })}
        />

        {/* Columna derecha: tutores */}
        <div className="w-full lg:w-85 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden min-h-75">
          <TutoresPanel
            selectedEmpresa={ctx.selectedEmpresa}
            tutores={ctx.tutores}
            onAddTutor={ctx.handleOpenNewTutor}
            onEditTutor={ctx.handleOpenEditTutor}
            onDeleteTutor={id => ctx.setShowDeleteConfirm({ id, type: 'tutor' })}
          />
        </div>
      </div>

      {/* ── MODAL: Confirmar eliminación ── */}
      {ctx.showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative text-center p-8">
            <button
              onClick={() => ctx.setShowDeleteConfirm(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              {ctx.showDeleteConfirm.type === 'empresa'
                ? 'Esta acción eliminará la empresa y todos sus tutores asociados de forma permanente.'
                : 'Esta acción eliminará al tutor de la empresa de forma permanente.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => ctx.setShowDeleteConfirm(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={ctx.handleConfirmDelete}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all font-sans"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Empresa ── */}
      {ctx.showEmpresaForm && (
        <EmpresaFormModal
          editing={ctx.editingEmpresa}
          formData={ctx.empresaFormData}
          onChange={ctx.setEmpresaFormData}
          convenioRapido={ctx.convenioRapido}
          onConvenioRapidoChange={ctx.setConvenioRapido}
          centros={ctx.centros}
          onSubmit={ctx.handleEmpresaSubmit}
          onClose={() => ctx.setShowEmpresaForm(false)}
        />
      )}

      {/* ── MODAL: Tutor ── */}
      {ctx.showTutorForm && (
        <TutorFormModal
          editing={ctx.editingTutor}
          formData={ctx.tutorFormData}
          onChange={ctx.setTutorFormData}
          onSubmit={ctx.handleTutorSubmit}
          onClose={() => ctx.setShowTutorForm(false)}
        />
      )}
    </>
  );
}
