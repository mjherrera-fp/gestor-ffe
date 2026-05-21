import React from 'react';
import { FileArchive, Loader2, Plus, Trash2 } from 'lucide-react';

import { useRelaciones }                from './hooks/useRelaciones.ts';
import { RelacionesListado }            from './components/RelacionesListado.tsx';
import { RelacionDetalle }              from './components/RelacionesDetalle.tsx';
import { RelacionFormModal }            from './components/RelacionesFormModal.tsx';
import { RelacionEstadisticaFormModal } from './components/RelacionEstadisticaFormModal.tsx';
import { calculateEndDateForHours }     from './utils/relacionesUtils.ts';
import { EmailModal }                   from '../../components/EmailModal.tsx';

interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
  onGoToConfig?: () => void;
}

export default function RelacionesView({ cursoId, detalleAcademicoId, onGoToConfig }: Props) {
  const ctx = useRelaciones(cursoId, detalleAcademicoId);

  // Adaptador para calculateEndDateForHours que inyecta el curso del contexto
  const calcEndDate = (start: string, hours: number) =>
    calculateEndDateForHours(start, hours, ctx.formData.horario, ctx.curso);

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">

      {/* MODAL 1: SELECCIÓN DE DOCUMENTOS A DESCARGAR */}
      {ctx.targetDownloadRelaciones.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">          
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Seleccionar Documentación</h3>
              <p className="text-xs text-slate-500 mt-1">
                Elige qué archivos deseas incluir en el paquete comprimido (.ZIP) de la relación actual.
              </p>
            </div>

            {/* NUEVO: Botones de Selección Rápida */}
            <div className="flex justify-end gap-3 mb-2">
              <button
                type="button"
                onClick={() => ctx.setSelectedDocs({
                  plan: true,
                  seguimiento: true,
                  valoracion: true,
                  calendario: true,
                  relacion: true,
                  carta: true
                })}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
              >
                Seleccionar Todos
              </button>
              <span className="text-slate-300 text-[11px]">|</span>
              <button
                type="button"
                onClick={() => ctx.setSelectedDocs({
                  plan: false,
                  seguimiento: false,
                  valoracion: false,
                  calendario: false,
                  relacion: false,
                  carta: false
                })}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
              >
                Deseleccionar Todos
              </button>
            </div>

            {/* Checkboxes de opciones */}
            <div className="space-y-3 my-6">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.relacion}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, relacion: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Relación de alumnos</p>
                  <p className="text-[11px] text-slate-400">Documento en formato Word (.docx) y PDF con la relación de alumnos</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.plan}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, plan: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Plan Formativo</p>
                  <p className="text-[11px] text-slate-400">Documento por alumno en formato Word (.docx) y PDF</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.seguimiento}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, seguimiento: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Ficha de Seguimiento Periódico</p>
                  <p className="text-[11px] text-slate-400">Plantilla editable por alumno en formato Word (.docx)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.valoracion}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, valoracion: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Valoración Final</p>
                  <p className="text-[11px] text-slate-400">Plantilla editable por alumno en formato Word (.docx)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.calendario}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, calendario: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Calendario de Prácticas</p>
                  <p className="text-[11px] text-slate-400">Documento de asistencia por alumno en formato PDF</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.carta}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, carta: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Carta a la empresa</p>
                  <p className="text-[11px] text-slate-400">Documento explicativo sobre las FFE</p>
                </div>
              </label>
            </div>

            {/* Botones de acción del Modal */}
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => ctx.setTargetDownloadRelaciones([])}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => ctx.handleDescargarTodo(ctx.targetDownloadRelaciones)}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/10 transition-all transform active:scale-98"
              >
                Aceptar y Generar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: SELECCIÓN DE DOCUMENTOS A ENVIAR POR EMAIL */}
      {ctx.targetEmailRelaciones.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">          
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Seleccionar Documentación</h3>
              <p className="text-xs text-slate-500 mt-1">
                Elige qué archivos deseas adjuntar en el correo electrónico.
              </p>
            </div>

            <div className="flex justify-end gap-3 mb-2">
              <button
                type="button"
                onClick={() => ctx.setSelectedDocs({
                  plan: true,
                  seguimiento: true,
                  valoracion: true,
                  calendario: true,
                  relacion: true,
                  carta: true
                })}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
              >
                Seleccionar Todos
              </button>
              <span className="text-slate-300 text-[11px]">|</span>
              <button
                type="button"
                onClick={() => ctx.setSelectedDocs({
                  plan: false,
                  seguimiento: false,
                  valoracion: false,
                  calendario: false,
                  relacion: false,
                  carta: false
                })}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
              >
                Deseleccionar Todos
              </button>
            </div>

            <div className="space-y-3 my-6">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.relacion}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, relacion: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Relación de alumnos</p>
                  <p className="text-[11px] text-slate-400">Documento en formato Word (.docx) y PDF con la relación de alumnos</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.plan}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, plan: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Plan Formativo</p>
                  <p className="text-[11px] text-slate-400">Documento por alumno en formato Word (.docx) y PDF</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.seguimiento}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, seguimiento: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Ficha de Seguimiento Periódico</p>
                  <p className="text-[11px] text-slate-400">Plantilla editable por alumno en formato Word (.docx)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.valoracion}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, valoracion: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Valoración Final</p>
                  <p className="text-[11px] text-slate-400">Plantilla editable por alumno en formato Word (.docx)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.calendario}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, calendario: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Calendario de Prácticas</p>
                  <p className="text-[11px] text-slate-400">Documento de asistencia por alumno en formato PDF</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ctx.selectedDocs.carta}
                  onChange={(e) => ctx.setSelectedDocs({ ...ctx.selectedDocs, carta: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Carta a la empresa</p>
                  <p className="text-[11px] text-slate-400">Documento explicativo sobre las FFE</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => ctx.setTargetEmailRelaciones([])}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => ctx.handleEmailConTodo(ctx.targetEmailRelaciones)}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/10 transition-all transform active:scale-98"
              >
                Aceptar y Enviar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE PROGRESO DE DESCARGA */}
      {ctx.isDownloadingMasivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative overflow-hidden">

            {/* Decoración superior */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${ctx.downloadProgress}%` }}
              />
            </div>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                {ctx.downloadProgress === 100 ? (
                  <FileArchive className="h-6 w-6 text-blue-600" />
                ) : (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-800">
                Descargando Documentación
              </h3>

              <p className="text-sm text-slate-500 mt-2 min-h-10">
                {ctx.downloadStatus}
              </p>

              {/* Barra de progreso */}
              <div className="w-full mt-6">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                  <span>Progreso</span>
                  <span>{Math.round(ctx.downloadProgress)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${ctx.downloadProgress}%` }}
                  ></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

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
          onOpenStats={ctx.handleOpenEstadistica}
          listSearchTerm={ctx.listSearchTerm}
          onListSearchChange={ctx.setListSearchTerm}
          statusFilters={ctx.statusFilters}
          onStatusFilterChange={(tipo, value, negate) =>
            ctx.setStatusFilters(prev => ({
              ...prev,
              [tipo]: { value, negate: negate ?? prev[tipo].negate },
            }))
          }
          dateFilters={ctx.dateFilters}
          onDateFilterChange={updates =>
            ctx.setDateFilters(prev => ({ ...prev, ...updates }))
          }
          onClearFilters={ctx.clearFilters}
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
          onHandleDescargarTodo={ctx.handleDescargarTodo}
          setTargetDownloadRelaciones={ctx.setTargetDownloadRelaciones}
          setTargetEmailRelaciones={ctx.setTargetEmailRelaciones}
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
            onEmailRelacion={ctx.handleEmailConRelacion}
            onEmailPlanFormativo={ctx.handleEmailConPlanFormativo}
            onEmailSeguimiento={ctx.handleEmailConSeguimiento}
            onEmailValoracion={ctx.handleEmailConValoracion}
            onEmailCarta={ctx.handleEmailConCarta}
            onEmailCalendario={ctx.handleEmailConCalendario}
            onHandleDescargarTodo={ctx.handleDescargarTodo}
            isDownloadingMasivo={ctx.isDownloadingMasivo}
            downloadProgress={ctx.downloadProgress}
            downloadStatus={ctx.downloadStatus}
            setTargetDownloadRelaciones={ctx.setTargetDownloadRelaciones}
            targetDownloadRelaciones={ctx.targetDownloadRelaciones}
            setSelectedDocs={ctx.setSelectedDocs}
            selectedDocs={ctx.selectedDocs}
            setTargetEmailRelaciones={ctx.setTargetEmailRelaciones}
            onUpdateFirma={ctx.updateFirma}
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

      {ctx.showEstadisticaModal && (
        <RelacionEstadisticaFormModal
          empresaNombre={ctx.estadisticaEmpresaNombre}
          curso={ctx.estadisticaCurso}
          numAlumnos={ctx.estadisticaNumAlumnos}
          contratados={ctx.estadisticaContratados}
          valoracion={ctx.estadisticaValoracion}
          onContratadosChange={ctx.setEstadisticaContratados}
          onValoracionChange={ctx.setEstadisticaValoracion}
          onSubmit={ctx.handleEstadisticaSubmit}
          onClose={() => ctx.setShowEstadisticaModal(false)}
        />
      )}

      {/* ── MODAL: Email ── */}
      <EmailModal
        isOpen={ctx.showEmailModal}
        onClose={() => ctx.setShowEmailModal(false)}
        initialTo={ctx.emailTo}
        initialBcc={ctx.emailBcc}
        initialAttachments={ctx.emailAttachments}
        onGoToConfig={onGoToConfig}
        contextualContactIds={ctx.contextualContactIds}
      />
    </div>
  );
}