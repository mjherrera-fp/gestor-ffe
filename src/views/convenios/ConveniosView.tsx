import React from 'react';
import { X, Trash2 } from 'lucide-react';

import { useConvenios }        from './hooks/useConvenios.ts';
import { ConveniosListado }    from './components/ConveniosListado.tsx';
import { ConvenioDetalle }     from './components/ConvenioDetalle.tsx';
import { ConvenioFormModal }   from './components/ConvenioFormModal.tsx';

interface Props {
  cursoId: number;
}

export default function ConveniosView({ cursoId }: Props) {
  const ctx = useConvenios(cursoId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

      {/* ── COLUMNA IZQUIERDA: Listado ── */}
      <ConveniosListado
        convenios={ctx.filteredAndSortedConvenios}
        selectedConvenio={ctx.selectedConvenio}
        onSelectConvenio={ctx.setSelectedConvenio}
        onEdit={ctx.handleEdit}
        onDeleteRequest={ctx.setShowDeleteConfirm}
        onNew={ctx.handleOpenNew}
        listSearchTerm={ctx.listSearchTerm}
        onListSearchChange={ctx.setListSearchTerm}
        statusFilter={ctx.statusFilter}
        onStatusFilterChange={ctx.setStatusFilter}
        sortBy={ctx.sortBy}
        sortOrder={ctx.sortOrder}
        onSortByEmpresa={() => {
          if (ctx.sortBy === 'empresa') ctx.setSortOrder(ctx.sortOrder === 'asc' ? 'desc' : 'asc');
          else { ctx.setBy('empresa'); ctx.setSortOrder('asc'); }
        }}
        onSortByEstado={() => {
          if (ctx.sortBy === 'estado') ctx.setSortOrder(ctx.sortOrder === 'asc' ? 'desc' : 'asc');
          else { ctx.setBy('estado'); ctx.setSortOrder('asc'); }
        }}
      />

      {/* ── COLUMNA DERECHA: Detalle ── */}
      <div className="w-full lg:w-85 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden min-h-75">
        <ConvenioDetalle
          selectedConvenio={ctx.selectedConvenio}
          onAdvanceStatus={ctx.advanceStatus}
          onMoveBackStatus={ctx.moveBackStatus}
        />
      </div>

      {/* ── MODAL: Confirmar eliminación ── */}
      {ctx.showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => ctx.setShowDeleteConfirm(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">¿Estás seguro?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                Esta acción eliminará el convenio de forma permanente y no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => ctx.setShowDeleteConfirm(null)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => ctx.handleDelete(ctx.showDeleteConfirm!)}
                  className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Formulario ── */}
      {ctx.showForm && (
        <ConvenioFormModal
          isEditing={ctx.isEditing}
          formData={ctx.formData}
          setFormData={ctx.setFormData}
          empresas={ctx.empresas}
          filteredEmpresas={ctx.filteredEmpresas}
          selectedEmpresa={ctx.selectedEmpresa}
          searchTermEmpresa={ctx.searchTermEmpresa}
          onSearchEmpresaChange={term => {
            ctx.setSearchTermEmpresa(term);
            if (ctx.selectedEmpresa) {
              const emp = ctx.empresas.find(e => e.id === ctx.selectedEmpresa);
              if (emp && emp.nombre !== term) ctx.setSelectedEmpresa(null);
            }
          }}
          onSelectEmpresa={(id, nombre) => {
            ctx.setSelectedEmpresa(id);
            ctx.setSearchTermEmpresa(nombre);
          }}
          onClearEmpresa={() => {
            ctx.setSelectedEmpresa(null);
            ctx.setSearchTermEmpresa('');
          }}
          centros={ctx.centros}
          selectedCentro={ctx.selectedCentro}
          onCentroChange={ctx.setSelectedCentro}
          onSubmit={ctx.handleSubmit}
          onClose={() => ctx.setShowForm(false)}
        />
      )}
    </div>
  );
}
