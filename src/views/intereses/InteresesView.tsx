import React, { useState } from 'react';

import { useIntereses, CVAttachment } from './hooks/useIntereses.ts';
import { AlumnosSidebar }            from './components/AlumnosSidebar.tsx';
import { InteresesGrid }             from './components/InteresesGrid.tsx';
import { EmailModal }                from '../../components/EmailModal.tsx';
import { EmailAttachment }           from '../../types/email.ts';

interface Props {
  cursoId: number;
  detalleAcademicoId?: number;
  onCreateRelacion?: (empresaId: number, alumnoIds: number[]) => void;
}

export default function InteresesView({ cursoId, detalleAcademicoId, onCreateRelacion }: Props) {
  const ctx = useIntereses(cursoId, detalleAcademicoId);

  // Cuando hay exactamente 1 seleccionado, usamos su info para la cabecera del grid
  const gridAlumno = ctx.selectedAlumnoIds.length === 1
    ? ctx.filteredAlumnos.find(a => a.id === ctx.selectedAlumnoIds[0]) ?? null
    : ctx.selectedAlumno;

  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [emailSubject, setEmailSubject] = useState('Candidatura para prácticas en empresa');
  const [emailBody, setEmailBody] = useState('<p>Estimados señores:</p><p>Adjunto les remito mi currículum vitae para su consideración.</p><p>Quedo a su disposición para cualquier aclaración.</p><p>Atentamente,</p>');
  const [showEmailModal, setShowEmailModal] = useState(false);

  // ── Toggle interés con soporte multi-selección y envío de CV ──

  const handleToggleInteres = async (empresaId: number, interesado: 'alumno' | 'empresa') => {
    const alumnoIds = ctx.selectedAlumnoIds.length > 0
      ? ctx.selectedAlumnoIds
      : (ctx.selectedAlumno?.id ? [ctx.selectedAlumno.id] : []);

    if (alumnoIds.length === 0) return;

    let anyActivated = false;
    const wasActivation: boolean[] = alumnoIds.map(id => !ctx.isMatched(id, empresaId).iA);

    for (let i = 0; i < alumnoIds.length; i++) {
      const id = alumnoIds[i];
      const activating = interesado === 'alumno' ? wasActivation[i] : !ctx.isMatched(id, empresaId).iE;
      if (activating) anyActivated = true;
      await ctx.toggleInteres(id, empresaId, interesado);
    }

    ctx.fetchData();

    // Si se activó 'alumno' (Envío de CV), preparar email con CVs adjuntos
    if (interesado === 'alumno' && anyActivated) {
      const empresa = ctx.empresas.find(e => e.id === empresaId);
      if (!empresa) return;

      try {
        const res = await fetch('/api/alumnos/cv/preparar-attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumnoIds }),
        });
        if (res.ok) {
          const attachments: CVAttachment[] = await res.json();
          const emailAtts: EmailAttachment[] = attachments.map((a, i) => ({
            id: `cv-${i}`,
            filename: a.filename,
            path: a.path,
            size: a.size,
            source: 'generated' as const,
          }));
          setEmailAttachments(emailAtts);
          setEmailTo(empresa.email ? [empresa.email] : []);

          // Cargar la plantilla de Envío de CV
          try {
            const tmplRes = await fetch('/api/plantillas/by-plantilla-id/envio-cv');
            if (tmplRes.ok) {
              const cfg = await tmplRes.json();
              if (cfg.subject) setEmailSubject(cfg.subject);
              if (cfg.body) setEmailBody(cfg.body);
            }
          } catch { /* fallback a valores iniciales */ }

          setShowEmailModal(true);
        }
      } catch { /* error silencioso */ }
    }

  };

  // ── Navegar a crear relación desde un match ──

  const handleCreateRelacion = (empresaId: number) => {
    const alumnoIds = ctx.selectedAlumnoIds.length > 0
      ? ctx.selectedAlumnoIds
      : (ctx.selectedAlumno?.id ? [ctx.selectedAlumno.id] : []);
    if (alumnoIds.length === 0) return;
    onCreateRelacion?.(empresaId, alumnoIds);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

      {/* ── COLUMNA IZQUIERDA: Alumnos ── */}
      <AlumnosSidebar
        alumnos={ctx.filteredAlumnos}
        selectedAlumnoIds={ctx.selectedAlumnoIds}
        searchAlumno={ctx.searchAlumno}
        onSearchChange={ctx.setSearchAlumno}
        onToggleSelection={ctx.toggleSelection}
        onClearSelection={ctx.clearSelection}
        getAlumnoStats={ctx.getAlumnoStats}
        sortBy={ctx.sortBy}
        sortOrder={ctx.sortOrder}
        onToggleSort={ctx.toggleSort}
        filterMinCVEnvios={ctx.filterMinCVEnvios}
        onFilterMinCVEnviosChange={ctx.setFilterMinCVEnvios}
        filterEmpresasInteresadas={ctx.filterEmpresasInteresadas}
        onFilterEmpresasInteresadasChange={ctx.setFilterEmpresasInteresadas}
        filterMatchStatus={ctx.filterMatchStatus}
        onFilterMatchStatusChange={ctx.setFilterMatchStatus}
      />

      {/* ── COLUMNA DERECHA: Grid de intereses ── */}
      <div className="w-full flex-1 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden">
        <InteresesGrid
          selectedAlumno={gridAlumno}
          selectedAlumnoIds={ctx.selectedAlumnoIds}
          empresas={ctx.filteredEmpresas}
          searchEmpresa={ctx.searchEmpresa}
          onSearchEmpresaChange={ctx.setSearchEmpresa}
          isMatched={ctx.isMatched}
          onToggle={handleToggleInteres}
          onCreateRelacion={handleCreateRelacion}
        />
      </div>

      {/* ── Modal de email para Envío de CV ── */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => { setShowEmailModal(false); setEmailAttachments([]); }}
        initialTo={emailTo}
        initialAttachments={emailAttachments}
        initialSubject={emailSubject}
        initialBody={emailBody}
      />
    </div>
  );
}
