import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { useRelaciones }       from './hooks/useRelaciones.ts';
import { RelacionesListado }   from './components/RelacionesListado.tsx';
import { RelacionDetalle }     from './components/RelacionesDetalle.tsx';
import { RelacionFormModal }   from './components/RelacionesFormModal.tsx';
import { calculateEndDateForHours } from './utils/relacionesUtils.ts';

interface Props {
  cursoId: number;
}

export default function RelacionesView({ cursoId }: Props) {
  const ctx = useRelaciones(cursoId);

  // Adaptador para calculateEndDateForHours que inyecta el curso del contexto
  const calcEndDate = (start: string, hours: number) =>
    calculateEndDateForHours(start, hours, ctx.formData.horario, ctx.curso);

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Relación de Alumnos
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Gestión de periodos de prácticas y horarios grupales.
          </p>
        </div>
        
      </div>

      {/* ── CONTENIDO PRINCIPAL (dos columnas) ── */}
      <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

        {/* Columna izquierda: listado */}
        <RelacionesListado
          relaciones={ctx.filteredAndSortedRelaciones}
          convenios={ctx.convenios}
          createRelacion={ctx.handleOpenForm}
          selectedRelacion={ctx.selectedRelacion}
          onSelectRelacion={ctx.setSelectedRelacion}
          onEdit={ctx.handleOpenForm}
          onDeleteRequest={ctx.setShowDeleteConfirm}
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

        {/* Columna derecha: detalle */}
        <div className="w-full lg:w-96 lg:shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden min-h-150">
          <RelacionDetalle
            selectedRelacion={ctx.selectedRelacion}
            alumnos={ctx.alumnos}
            onAdvanceStatus={ctx.advanceStatus}
            onMoveBackStatus={ctx.moveBackStatus}
            onAdvancePlanStatus={ctx.advancePlanStatus}
            onMoveBackPlanStatus={ctx.moveBackPlanStatus}
            onAdvancePlanIndividual={ctx.advancePlanStatusIndividual}
            onMoveBackPlanIndividual={ctx.moveBackPlanStatusIndividual}
            onDescargarPlanFormativo={ctx.descargarPlanFormativo}
            onDescargarSeguimiento={ctx.descargarSeguimiento}
            onAdvanceSeguimientoIndividual={ctx.advanceSeguimientoStatusIndividual}
            onMoveBackSeguimientoIndividual={ctx.moveBackSeguimientoStatusIndividual}
            onDescargarValoracion={ctx.descargarValoracion}
            onAdvanceValoracionIndividual={ctx.advanceValoracionStatusIndividual}
            onMoveBackValoracionIndividual={ctx.moveBackValoracionStatusIndividual}
            onDescargarRelacion={ctx.descargarRelacion}
            onDescargarCarta={ctx.descargarCarta}
            onDescargarCalendario={ctx.descargarCalendario}
            onHandleDescargarTodo={ctx.handleDescargarTodo}
            isDownloadingMasivo={ctx.isDownloadingMasivo}
            downloadProgress={ctx.downloadProgress}
            downloadStatus={ctx.downloadStatus}
            setShowSelectionModal={ctx.setShowSelectionModal}
            showSelectionModal={ctx.showSelectionModal}
            setSelectedDocs={ctx.setSelectedDocs}
            selectedDocs={ctx.selectedDocs}
          />
        </div>
      </div>

      {/* ── MODAL: Confirmar eliminación ── */}
      {ctx.showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4 text-center">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative p-8 transition-all">
            <button
              onClick={() => ctx.setShowDeleteConfirm(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Plus className="rotate-45 h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">¿Eliminar relación?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              Esta acción eliminará la relación de prácticas de forma permanente y no se puede deshacer.
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
      )}

      {/* ── MODAL: Formulario crear/editar ── */}
      {ctx.showForm && (
        <RelacionFormModal
          editing={ctx.editing}
          formData={ctx.formData}
          setFormData={ctx.setFormData}
          alumnos={ctx.alumnos}
          searchTermAlumno={ctx.searchTermAlumno}
          setSearchTermAlumno={ctx.setSearchTermAlumno}
          filteredAlumnos={ctx.filteredAlumnos}
          onAddAlumno={ctx.addAlumnoToRelacion}
          onRemoveAlumno={ctx.removeAlumnoFromRelacion}
          onUpdateStudentHours={ctx.updateStudentHours}
          onUpdateStudentStartDate={ctx.updateStudentStartDate}
          calculateEndDateForHours={calcEndDate}
          targetStartDate={ctx.targetStartDate}
          setTargetStartDate={ctx.setTargetStartDate}
          targetEndDate={ctx.targetEndDate}
          setTargetEndDate={ctx.setTargetEndDate}
          onApplyStartDateToAll={ctx.applyStartDateToAll}
          onApplyTargetEndDate={ctx.applyTargetEndDate}
          convenios={ctx.convenios}
          filteredConvenios={ctx.filteredConvenios}
          searchTermConvenio={ctx.searchTermConvenio}
          setSearchTermConvenio={ctx.setSearchTermConvenio}
          isConvenioDropdownOpen={ctx.isConvenioDropdownOpen}
          setIsConvenioDropdownOpen={ctx.setIsConvenioDropdownOpen}
          tutores={ctx.tutores}
          bulkHorario={ctx.bulkHorario}
          setBulkHorario={ctx.setBulkHorario}
          onApplyBulkHorario={ctx.applyBulkHorario}
          onSubmit={ctx.handleSubmit}
          onClose={() => ctx.setShowForm(false)}
        />
      )}
    </div>
  );
}