import React, { useState } from 'react';

import { useIntereses, CVAttachment } from './hooks/useIntereses.ts';
import { AlumnosSidebar }            from './components/AlumnosSidebar.tsx';
import { InteresesGrid }             from './components/InteresesGrid.tsx';
import { EmailModal }                from '../../components/EmailModal.tsx';
import { EmailAttachment }           from '../../types/email.ts';
import { interpolateBody, applyCustomMarkers } from '../../../templates/emails/emailTemplates.ts';

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

  const [profesor, setProfesor] = useState<{ nombre: string; apellidos: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/profesor').then(r => r.ok && r.json()).then(p => {
      if (p) setProfesor({ nombre: p.nombre, apellidos: p.apellidos });
    }).catch(() => {});
  }, []);

  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailPerRecipientData, setEmailPerRecipientData] = useState<Record<string, Record<string, string>> | undefined>(undefined);
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

          // Cargar la plantilla de Envío de CV y reemplazar marcadores
          try {
            const [tmplRes, marcadoresRes] = await Promise.all([
              fetch('/api/plantillas/by-plantilla-id/envio-cv'),
              fetch('/api/marcadores-personalizados'),
            ]);
            if (tmplRes.ok) {
              const cfg = await tmplRes.json();
              const marcadores = marcadoresRes.ok ? await marcadoresRes.json() : [];
              const pNombre = profesor?.nombre ?? '';
              const pApellidos = profesor?.apellidos ?? '';
              const contacto = empresa?.personaContacto || '';
              const eNombre = empresa?.nombre || '';

              const context: Record<string, any> = {
                profesor: pNombre ? { nombre: pNombre, apellidos: pApellidos } : null,
                empresa: eNombre ? { nombre: eNombre, personaContacto: contacto } : null,
              };

              let body = cfg.body || '';
              let subject = cfg.subject || '';

              body = applyCustomMarkers(body, marcadores);
              subject = applyCustomMarkers(subject, marcadores);
              body = interpolateBody(body, context);
              subject = interpolateBody(subject, context);

              // Sustitución directa de todos los marcadores (incluso si están vacíos)
              body = body.replace(/\{\{empresa\.personaContacto\}\}/g, contacto);
              subject = subject.replace(/\{\{empresa\.personaContacto\}\}/g, contacto);
              body = body.replace(/\{\{empresa\.nombre\}\}/g, eNombre);
              subject = subject.replace(/\{\{empresa\.nombre\}\}/g, eNombre);
              body = body.replace(/\{\{profesor\.nombre\}\}/g, pNombre);
              subject = subject.replace(/\{\{profesor\.nombre\}\}/g, pNombre);
              body = body.replace(/\{\{profesor\.apellidos\}\}/g, pApellidos);
              subject = subject.replace(/\{\{profesor\.apellidos\}\}/g, pApellidos);

              // Limpiar cualquier {{...}} que haya quedado sin reemplazar
              body = body.replace(/\{\{[^}]+\}\}/g, '');
              subject = subject.replace(/\{\{[^}]+\}\}/g, '');

              if (subject) setEmailSubject(subject);
              if (body) setEmailBody(body);

              // per-recipient data for {{@contacto}} and {{@nombreEmpresa}}
              if (empresa?.email || empresa?.nombre) {
                const perData: Record<string, Record<string, string>> = {};
                for (const email of empresa.email ? [empresa.email] : ['']) {
                  perData[email] = {
                    contacto: contacto || `persona de contacto de ${eNombre || 'la empresa'}`,
                    nombreEmpresa: eNombre,
                  };
                }
                setEmailPerRecipientData(perData);
              }
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
        onClose={() => { setShowEmailModal(false); setEmailAttachments([]); setEmailPerRecipientData(undefined); }}
        initialTo={emailTo}
        initialAttachments={emailAttachments}
        initialSubject={emailSubject}
        initialBody={emailBody}
        perRecipientData={emailPerRecipientData}
      />
    </div>
  );
}
