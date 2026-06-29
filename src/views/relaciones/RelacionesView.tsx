import React, { useState, useEffect } from 'react';
import { FileArchive, Loader2, Plus, Trash2, FileText, ClipboardCheck, Play, CheckCircle, MoreHorizontal, PencilRuler } from 'lucide-react';

import { useRelaciones }                from './hooks/useRelaciones.ts';
import { RelacionesListado }            from './components/RelacionesListado.tsx';
import { RelacionDetalle }              from './components/RelacionesDetalle.tsx';
import { RelacionFormModal }            from './components/RelacionesFormModal.tsx';
import { RelacionEstadisticaFormModal } from './components/RelacionEstadisticaFormModal.tsx';
import { calculateEndDateForHours }     from './utils/relacionesUtils.ts';
import { EmailModal }                   from '../../components/EmailModal.tsx';
import { Modal }                        from '../../components/ui/Modal.tsx';


interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
  onGoToConfig?: () => void;
  profesor?: import('../../types/index.ts').Profesor;
  preloadRelacion?: { empresaId: number; alumnoIds: number[] } | null;
}

export default function RelacionesView({ cursoId, detalleAcademicoId, onGoToConfig, profesor, preloadRelacion }: Props) {
  const ctx = useRelaciones(cursoId, detalleAcademicoId, profesor, preloadRelacion);
  const [plantillas, setPlantillas] = useState<any[]>([]);

  useEffect(() => {
    if (ctx.targetEmailRelaciones.length > 0) {
      fetch('/api/plantillas?place=relaciones')
        .then(r => r.json())
        .then(setPlantillas)
        .catch(() => setPlantillas([]));
    }
  }, [ctx.targetEmailRelaciones]);

  // Adaptador para calculateEndDateForHours que inyecta los festivos del centro
  const calcEndDate = (start: string, hours: number) =>
    calculateEndDateForHours(start, hours, ctx.formData.horario, ctx.centroFestivos, ctx.usarFestivos, ctx.empresaFestivosActuales, ctx.usarFestivosEmpresa);

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">

      {/* MODAL 1: SELECCIÓN DE DOCUMENTOS A DESCARGAR */}
      <Modal open={ctx.targetDownloadRelaciones.length > 0} onClose={() => ctx.setTargetDownloadRelaciones([])} maxWidth="md">
        <div className="px-6 py-5 flex flex-col flex-1 min-h-0 gap-3">

            <div className="shrink-0">
              <h3 className="text-lg font-bold text-slate-800">Seleccionar Documentación</h3>
              <p className="text-xs text-slate-500 mt-1">
                {ctx.modoCreacion === 'crear'
                  ? 'Elige qué documentos deseas generar y guardar en la carpeta docs/ para la relación actual.'
                  : 'Elige qué archivos deseas incluir en el paquete comprimido (.ZIP) de la relación actual.'}
              </p>
            </div>

            {/* NUEVO: Botones de Selección Rápida */}
            <div className="shrink-0 flex justify-end gap-3">
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
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
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
            <div className="shrink-0 flex gap-3 justify-end pt-4 border-t border-slate-100">
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
      </Modal>

      {/* MODAL 2: SELECCIÓN DE PLANTILLA DE CORREO */}
      <Modal open={ctx.targetEmailRelaciones.length > 0} onClose={() => ctx.setTargetEmailRelaciones([])} maxWidth="lg">
        <div className="px-6 py-5 flex flex-col flex-1 min-h-0 gap-3 mb-0">
          <div className="shrink-0">
            <h3 className="text-lg font-bold text-slate-800">Seleccionar Plantilla</h3>
            <p className="text-xs text-slate-500 mt-1">
              Elige la plantilla de correo que deseas enviar.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
            {(() => {
              const componentMap: Record<string, React.ComponentType<{ className?: string }>> = {
                documento: FileText,
                plan: ClipboardCheck,
                inicio: Play,
                fin: CheckCircle,
                otros: MoreHorizontal,
                'pencil-ruler': PencilRuler,
              };
              const colorMap: Record<string, { border: string; bg: string; iconBg: string; iconText: string; btnText: string }> = {
                blue: { border: 'border-blue-100', bg: 'bg-blue-50/50', iconBg: 'bg-blue-100', iconText: 'text-blue-600', btnText: 'text-blue-600' },
                emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50/50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', btnText: 'text-emerald-600' },
                amber: { border: 'border-amber-100', bg: 'bg-amber-50/50', iconBg: 'bg-amber-100', iconText: 'text-amber-600', btnText: 'text-amber-600' },
                purple: { border: 'border-purple-100', bg: 'bg-purple-50/50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', btnText: 'text-purple-600' },
                slate: { border: 'border-slate-200', bg: 'bg-white', iconBg: 'bg-slate-100', iconText: 'text-slate-500', btnText: 'text-slate-500' },
              };
              const sorted = [...plantillas]
                .filter((p: any) => p.grupo === 'varios-registros' || !p.grupo)
                .sort((a, b) => a.plantillaId === 'otros' ? 1 : b.plantillaId === 'otros' ? -1 : 0);
              return sorted.map((p: any) => {
                const isHex = p.color?.startsWith('#');
                const c = isHex ? null : (colorMap[p.color] || colorMap.slate);
                const IconComponent = componentMap[p.icon] || componentMap.otros;
                const cardStyle = isHex ? { borderColor: p.color + '40', backgroundColor: p.color + '08' } : {};
                const iconStyle = isHex ? { backgroundColor: p.color + '20', color: p.color } : {};
                return (
                  <React.Fragment key={p.id}>
                    <button
                      onClick={() => ctx.handleEmailConPlantilla(ctx.targetEmailRelaciones, p.plantillaId)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border hover:bg-slate-50 hover:border-slate-300 transition-all text-left ${c?.border || 'border-slate-200'} ${c?.bg || ''}`}
                      style={Object.keys(cardStyle).length ? cardStyle : undefined}
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${c?.iconBg || ''} ${c?.iconText || ''}`} style={Object.keys(iconStyle).length ? iconStyle : undefined}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase shrink-0 ${c?.btnText || ''}`} style={isHex ? { color: p.color } : undefined}>Seleccionar</span>
                    </button>
                  </React.Fragment>
                );
              });
            })()}
          </div>

          <div className="shrink-0 flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => ctx.setTargetEmailRelaciones([])}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE PREPARACIÓN DE EMAIL */}
      {ctx.isPreparingEmail && (
        <Modal open={ctx.isPreparingEmail} onClose={() => {}} maxWidth="sm">
          <div className="p-6">
            <div className="flex flex-col items-center text-center mt-2">
              <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Preparando correo</h3>
              <p className="text-sm text-slate-500 mt-2">
                Generando documentos para adjuntar...
              </p>
              <div className="w-full mt-6">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE PROGRESO DE DESCARGA */}
      <Modal open={ctx.isDownloadingMasivo} onClose={() => {}} maxWidth="sm">
        <div className="p-6 relative overflow-hidden">
          {/* Decoración superior */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${ctx.downloadProgress}%` }}
            />
          </div>

          <div className="flex flex-col items-center text-center mt-2 pt-2">
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
      </Modal>

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
        <div className="w-full lg:w-96 lg:shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-150">
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
      <RelacionFormModal
        open={ctx.showForm}
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

      <RelacionEstadisticaFormModal
        open={ctx.showEstadisticaModal}
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

      {/* ── MODAL: Email ── */}
      <EmailModal
        isOpen={ctx.showEmailModal}
        onClose={() => ctx.setShowEmailModal(false)}
        initialTo={ctx.emailTo}
        initialBcc={ctx.emailBcc}
        initialAttachments={ctx.emailAttachments}
        initialSubject={ctx.emailSubject}
        initialBody={ctx.emailBody}
        onGoToConfig={onGoToConfig}
        contextualContactIds={ctx.contextualContactIds}
      />
    </div>
  );
}