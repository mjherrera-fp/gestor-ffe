import React from 'react';
import { Trash2, X, BarChart3, Users, Building2, User, Handshake, MoreHorizontal } from 'lucide-react';

import { useEmpresas }                from './hooks/useEmpresas.ts';
import { EmpresasListado }            from './components/EmpresasListado.tsx';
import { TutoresPanel }               from './components/TutoresPanel.tsx';
import { EmpresaFormModal }           from './components/EmpresaFormModal.tsx';
import { TutorFormModal }             from './components/TutorFormModal.tsx';
import { EmpresaEstadisticasPanel }   from './components/EmpresaEstadisticasPanel.tsx';
import { EmailModal }                 from '../../components/EmailModal.tsx';
import { Modal }                      from '../../components/ui/Modal.tsx';
import { PLANTILLAS_CORREO }          from '../../../templates/emails/emailTemplates.ts';

interface Props {
  cursoId: number;
  onGoToConfig?: () => void;
}

export default function EmpresasView({ cursoId, onGoToConfig }: Props) {
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
          onIndividualEmail={ctx.handleOpenIndividualEmail}
          onBulkEmail={ctx.handleOpenBulkEmail}
          onDownloadTemplate={ctx.downloadTemplate}
          onImportClick={() => ctx.fileInputRef.current?.click()}
          isImporting={ctx.isImporting}
          filterValoracion={ctx.filterValoracion}
          onFilterValoracionChange={ctx.setFilterValoracion}
          filterUltimosCursos={ctx.filterUltimosCursos}
          onFilterUltimosCursosChange={ctx.setFilterUltimosCursos}
          filterColaboracion={ctx.filterColaboracion}
          onFilterColaboracionChange={ctx.setFilterColaboracion}
          filterContactado={ctx.filterContactado}
          onFilterContactadoChange={ctx.setFilterContactado}
          cursosUnicos={ctx.cursosUnicos}
        />

        {/* Input Excel oculto */}
        <input
          type="file"
          ref={ctx.fileInputRef}
          onChange={ctx.handleImportExcel}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />

        {/* Columna derecha: detalle con tabs */}
        <div className="w-full lg:w-85 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden min-h-75">

          {!ctx.selectedEmpresa ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Building2 className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-base font-bold text-text-main mb-2">Selecciona una empresa</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Haz clic en una empresa para gestionar sus tutores y estadísticas.
              </p>
            </div>
          ) : (
            <>
              <div className="flex border-b border-border-base shrink-0">
                <button
                  onClick={() => ctx.setActiveTab('estadisticas')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    ctx.activeTab === 'estadisticas'
                      ? 'text-primary border-b-2 border-primary bg-primary-light/30'
                      : 'text-text-muted hover:text-text-main hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Estadísticas
                </button>
                <button
                  onClick={() => ctx.setActiveTab('tutores')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    ctx.activeTab === 'tutores'
                      ? 'text-primary border-b-2 border-primary bg-primary-light/30'
                      : 'text-text-muted hover:text-text-main hover:bg-slate-50'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Tutores
                </button>
              </div>

              {ctx.activeTab === 'estadisticas' ? (
                <EmpresaEstadisticasPanel
                  selectedEmpresa={ctx.selectedEmpresa}
                  estadisticas={ctx.estadisticas}
                />
              ) : (
                <TutoresPanel
                  selectedEmpresa={ctx.selectedEmpresa}
                  tutores={ctx.tutores}
                  onAddTutor={ctx.handleOpenNewTutor}
                  onEditTutor={ctx.handleOpenEditTutor}
                  onDeleteTutor={id => ctx.setShowDeleteConfirm({ id, type: 'tutor' })}
                />
              )}
            </>
          )}
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
      <EmpresaFormModal
        open={ctx.showEmpresaForm}
        editing={ctx.editingEmpresa}
        formData={ctx.empresaFormData}
        onChange={ctx.setEmpresaFormData}
        convenioRapido={ctx.convenioRapido}
        onConvenioRapidoChange={ctx.setConvenioRapido}
        centros={ctx.centros}
        onSubmit={ctx.handleEmpresaSubmit}
        onClose={() => ctx.setShowEmpresaForm(false)}
      />

      {/* ── MODAL: Tutor ── */}
      <TutorFormModal
        open={ctx.showTutorForm}
        editing={ctx.editingTutor}
        formData={ctx.tutorFormData}
        onChange={ctx.setTutorFormData}
        onSubmit={ctx.handleTutorSubmit}
        onClose={() => ctx.setShowTutorForm(false)}
      />

      {/* ── MODAL: Resultado importación ── */}
      <Modal open={!!ctx.importResult} onClose={() => ctx.setImportResult(null)} maxWidth="sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Importación finalizada</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-bold text-emerald-600">{ctx.importResult?.success}</span> empresas nuevas</p>
            <p><span className="font-bold text-blue-600">{ctx.importResult?.updated}</span> empresas actualizadas</p>
          </div>
          <button
            onClick={() => ctx.setImportResult(null)}
            className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Aceptar
          </button>
        </div>
      </Modal>

      {/* ── MODAL: SELECCIÓN DE PLANTILLA DE CORREO ── */}
      <Modal open={ctx.showPlantillaSelector} onClose={() => ctx.setShowPlantillaSelector(false)} maxWidth="lg">
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
                contacto: User,
                colaboracion: Handshake,
                otros: MoreHorizontal,
              };
              const colorMap: Record<string, { border: string; bg: string; iconBg: string; iconText: string; btnText: string }> = {
                blue: { border: 'border-blue-100', bg: 'bg-blue-50/50', iconBg: 'bg-blue-100', iconText: 'text-blue-600', btnText: 'text-blue-600' },
                emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50/50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', btnText: 'text-emerald-600' },
                slate: { border: 'border-slate-200', bg: 'bg-white', iconBg: 'bg-slate-100', iconText: 'text-slate-500', btnText: 'text-slate-500' },
              };
              return PLANTILLAS_CORREO
                .filter(p => p.id === 'nuevo-contacto' || p.id === 'nueva-colaboracion' || p.id === 'otros')
                .map((p) => {
                const c = colorMap[p.color] || colorMap.slate;
                const IconComponent = componentMap[p.icon] || componentMap.otros;
                return (
                  <button
                    key={p.id}
                    onClick={() => ctx.handleEmailConPlantilla(p.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border ${c.border} ${c.bg} hover:bg-slate-50 hover:border-slate-300 transition-all text-left`}
                  >
                    <div className={`h-10 w-10 rounded-lg ${c.iconBg} ${c.iconText} flex items-center justify-center shrink-0`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.description}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${c.btnText} uppercase shrink-0`}>Seleccionar</span>
                  </button>
                );
              });
            })()}
          </div>

          <div className="shrink-0 flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => ctx.setShowPlantillaSelector(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

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

    </>
  );
}
