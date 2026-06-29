import React, { useState } from 'react';
import { X, Trash2, CheckCircle2, XCircle, AlertTriangle, FileText, Eye, Trash } from 'lucide-react';

import { useAlumnos }           from './hooks/useAlumnos.ts';
import { AlumnosToolbar }       from './components/AlumnosToolbar.tsx';
import { AlumnoGridCard }       from './components/AlumnoGridCard.tsx';
import { AlumnosTable }         from './components/AlumnosTable.tsx';
import { AlumnoFormModal }      from './components/AlumnoFormModal.tsx';
import DetalleAcademicoModal    from './components/DetalleAcademicoModal.tsx';
import { EmailModal }           from '../../components/EmailModal.tsx';
import { EmailTypeSelector }    from '../../components/EmailTypeSelector.tsx';
import { Modal }                from '../../components/ui/Modal.tsx';
import { Alumno }               from '../../types/index.ts';
import { Title }                from '../../components/Title.tsx';

// ── Helper CV ──

function getCVBlobUrl(alumno: Alumno): string {
  if (!alumno.cvPath) return '';
  const base64Parts = alumno.cvPath.split(',');
  const mimeType = base64Parts[0]?.match(/:(.*?);/)?.[1] || 'application/pdf';
  const byteChars = atob(base64Parts[1] || base64Parts[0]);
  const byteArrays = [];
  for (let i = 0; i < byteChars.length; i++) byteArrays.push(byteChars.charCodeAt(i));
  const blob = new Blob([new Uint8Array(byteArrays)], { type: mimeType });
  return URL.createObjectURL(blob);
}

interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
  onGoToConfig?: () => void;
}

export default function AlumnosView({ cursoId, detalleAcademicoId, onGoToConfig }: Props) {
  const ctx = useAlumnos(cursoId, detalleAcademicoId);

  const [viewingCV, setViewingCV] = useState<Alumno | null>(null);

  const handleDeleteCV = async (alumno: Alumno) => {
    if (!window.confirm('¿Eliminar el CV de este alumno?')) return;
    await ctx.handleFileDelete(alumno.id!);
    setViewingCV(null);
  };

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
        filterMinCVEnvios={ctx.filterMinCVEnvios}
        onFilterMinCVEnviosChange={ctx.setFilterMinCVEnvios}
        filterEmpresasInteresadas={ctx.filterEmpresasInteresadas}
        onFilterEmpresasInteresadasChange={ctx.setFilterEmpresasInteresadas}
        filterRelacionStatus={ctx.filterRelacionStatus}
        onFilterRelacionStatusChange={ctx.setFilterRelacionStatus}
        isImporting={ctx.isImporting}
        isImportingZip={ctx.isImportingZip}
        onDownloadTemplate={ctx.downloadTemplate}
        onImportClick={() => ctx.fileInputRef.current?.click()}
        onImportZipClick={() => ctx.zipFileInputRef.current?.click()}
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

      {/* Input ZIP oculto */}
      <input
        type="file"
        ref={ctx.zipFileInputRef}
        onChange={ctx.handleImportCVZip}
        accept=".zip"
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
      <AlumnoFormModal
        open={ctx.showForm}
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
              onViewCV={setViewingCV}
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
          onFileUpload={ctx.handleFileUpload}
          onFileDelete={ctx.handleFileDelete}
          onViewCV={setViewingCV}
        />
      )}

      {/* ── MODAL: Detalle académico ── */}
      <DetalleAcademicoModal
        open={!!ctx.academicDetailAlumno}
        alumno={ctx.academicDetailAlumno!}
        onClose={() => {
          ctx.setAcademicDetailAlumno(null);
          ctx.fetchAlumnos();
        }}
      />

      {/* ── MODAL: Resultado importación ── */}
      <Modal open={!!ctx.importResult} onClose={() => ctx.setImportResult(null)} maxWidth="md">
        <div className="p-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Importación finalizada</h3>
          <div className="space-y-2 text-sm text-slate-600 text-center">
            <p><span className="font-bold text-emerald-600">{ctx.importResult?.success}</span> alumnos importados</p>
          </div>
          {ctx.importResult?.errors && ctx.importResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm font-bold text-red-700 mb-2">Errores ({ctx.importResult.errors.length}):</p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {ctx.importResult.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 leading-relaxed">• {err}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => ctx.setImportResult(null)}
            className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Aceptar
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Resultado importación CVs ZIP ── */}
      <Modal open={!!ctx.zipResult} onClose={() => ctx.setZipResult(null)} maxWidth="md">
        <div className="p-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            ctx.zipResult?.errores && ctx.zipResult.errores > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {ctx.zipResult?.errores && ctx.zipResult.errores > 0
              ? <AlertTriangle className="h-7 w-7" />
              : <CheckCircle2 className="h-7 w-7" />
            }
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Importación de CVs</h3>
          <div className="space-y-2 text-sm text-slate-600 text-center">
            <p><span className="font-bold text-emerald-600">{ctx.zipResult?.procesados}</span> CVs importados</p>
            {ctx.zipResult && ctx.zipResult.errores > 0 && (
              <p><span className="font-bold text-red-600">{ctx.zipResult.errores}</span> errores</p>
            )}
          </div>
          {ctx.zipResult?.results && ctx.zipResult.results.filter(r => !r.ok).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm font-bold text-red-700 mb-2">Errores detallados:</p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {ctx.zipResult.results.filter(r => !r.ok).map((r, i) => (
                  <li key={i} className="text-xs text-red-600 leading-relaxed">
                    • DNI <span className="font-mono font-bold">{r.dni}</span>: {r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => ctx.setZipResult(null)}
            className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Aceptar
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Email type selector ── */}
      <EmailTypeSelector
        open={ctx.showEmailTypeSelector}
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
        onGoToConfig={onGoToConfig}
        contextualContactIds={ctx.contextualContactIds}
      />

      {/* ── MODAL: Visor CV compartido ── */}
      <Modal open={viewingCV !== null} onClose={() => setViewingCV(null)} maxWidth="6xl">
        {viewingCV && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">CV de {viewingCV.nombre} {viewingCV.apellidos}</h3>
                </div>
              </div>
              <button type="button" onClick={() => setViewingCV(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              src={getCVBlobUrl(viewingCV)}
              className="w-full h-160 rounded-xl border border-slate-200"
              title="CV"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <Title text="Eliminar CV">
                <button
                  onClick={() => handleDeleteCV(viewingCV)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all border border-red-200"
                >
                  <Trash className="h-4 w-4" /> Eliminar CV
                </button>
              </Title>
              <a
                href={getCVBlobUrl(viewingCV)}
                download={`${viewingCV.nombre}_${viewingCV.apellidos}.pdf`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
              >
                <Eye className="h-4 w-4" /> Descargar CV
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}