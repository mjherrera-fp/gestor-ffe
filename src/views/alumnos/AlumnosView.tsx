import React from 'react';
import { X, Trash2 } from 'lucide-react';

import { useAlumnos }           from './hooks/useAlumnos.ts';
import { AlumnosToolbar }       from './components/AlumnosToolbar.tsx';
import { AlumnoGridCard }       from './components/AlumnoGridCard.tsx';
import { AlumnosTable }         from './components/AlumnosTable.tsx';
import { AlumnoFormModal }      from './components/AlumnoFormModal.tsx';
import DetalleAcademicoModal    from './components/DetalleAcademicoModal.tsx';
import { EmailModal }           from '../../components/EmailModal.tsx';
import { EmailTypeSelector }    from '../../components/EmailTypeSelector.tsx';

interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
}

export default function AlumnosView({ cursoId, detalleAcademicoId }: Props) {
  const ctx = useAlumnos(cursoId, detalleAcademicoId);

  return (
    <div className="space-y-6">

      {/* ── TOOLBAR ── */}
      <AlumnosToolbar
        searchTerm={ctx.searchTerm}
        onSearchChange={ctx.setSearchTerm}
        viewMode={ctx.viewMode}
        onViewModeChange={ctx.setViewMode}
        filterStatus={ctx.filterStatus}
        onFilterStatusChange={ctx.setFilterStatus}
        sortBy={ctx.sortBy}
        sortOrder={ctx.sortOrder}
        onToggleSort={ctx.toggleSort}
        isImporting={ctx.isImporting}
        onDownloadTemplate={ctx.downloadTemplate}
        onImportClick={() => ctx.fileInputRef.current?.click()}
        onNewAlumno={() => ctx.handleOpenForm(null)}
        onBulkEmail={ctx.handleOpenBulkEmail}
      />

      {/* Input Excel oculto */}
      <input
        type="file"
        ref={ctx.fileInputRef}
        onChange={ctx.handleImportExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

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
              <h3 className="text-xl font-black text-slate-900 mb-3">¿Eliminar alumno?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                Esta acción eliminará el expediente del alumno de forma permanente y no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => ctx.setShowDeleteConfirm(null)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => ctx.handleDelete(ctx.showDeleteConfirm!)}
                  className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all font-sans"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Formulario alumno ── */}
      {ctx.showForm && (
        <AlumnoFormModal
          editing={ctx.editing}
          formData={ctx.formData}
          setFormData={ctx.setFormData}
          detalles={ctx.detalles}
          pendingSubmitData={ctx.pendingSubmitData}
          onSubmit={ctx.handleSubmit}
          onConfirmClearDates={() => ctx.handleSubmit(undefined, ctx.pendingSubmitData, true)}
          onCancelWarning={() => ctx.setPendingSubmitData(null)}
          onClose={() => ctx.setShowForm(false)}
        />
      )}

      {/* ── VISTA GRID o TABLA ── */}
      {ctx.viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ctx.filteredAndSortedAlumnos.map(alumno => (
            <AlumnoGridCard
              key={alumno.id}
              alumno={alumno}
              onEdit={ctx.handleOpenForm}
              onDelete={ctx.setShowDeleteConfirm}
              onAcademicDetail={ctx.setAcademicDetailAlumno}
              onEmail={ctx.handleOpenIndividualEmail}
              onFileUpload={ctx.handleFileUpload}
              onFileDelete={ctx.handleFileDelete}
            />
          ))}
        </div>
      ) : (
        <AlumnosTable
          alumnos={ctx.filteredAndSortedAlumnos}
          onEdit={ctx.handleOpenForm}
          onDelete={ctx.setShowDeleteConfirm}
          onAcademicDetail={ctx.setAcademicDetailAlumno}
          onEmail={ctx.handleOpenIndividualEmail}
        />
      )}

      {/* ── MODAL: Detalle académico ── */}
      {ctx.academicDetailAlumno && (
        <DetalleAcademicoModal
          alumno={ctx.academicDetailAlumno}
          onClose={() => {
            ctx.setAcademicDetailAlumno(null);
            ctx.fetchAlumnos();
          }}
        />
      )}

      {/* ── MODAL: Resultado importación ── */}
      {ctx.importResult && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Importación finalizada</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><span className="font-bold text-emerald-600">{ctx.importResult.success}</span> alumnos nuevos</p>
              <p><span className="font-bold text-blue-600">{ctx.importResult.updated}</span> alumnos actualizados</p>
            </div>
            <button
              onClick={() => ctx.setImportResult(null)}
              className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Email type selector ── */}
      <EmailTypeSelector
        isOpen={ctx.showEmailTypeSelector}
        onClose={() => { ctx.setShowEmailTypeSelector(false); ctx.setPendingEmailTarget(null); }}
        onConfirm={ctx.handleEmailTypeConfirm}
        nombreAlumno={ctx.pendingEmailTarget?.alumno ? `${ctx.pendingEmailTarget.alumno.nombre} ${ctx.pendingEmailTarget.alumno.apellidos}` : undefined}
      />

      {/* ── MODAL: Email ── */}
      <EmailModal
        isOpen={ctx.showEmailModal}
        onClose={() => ctx.setShowEmailModal(false)}
        initialTo={ctx.emailTo}
        initialBcc={ctx.emailBcc}
        initialAttachments={ctx.emailAttachments}
      />
    </div>
  );
}