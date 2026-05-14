import { useState } from 'react';
import { Curso } from '../../../types/index.ts';

// ─────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────

export type ConfirmAction = { id: number; type: 'delete' | 'archive' | 'restore' };

const EMPTY_FORM: Partial<Curso> = {
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  festivos: [],
  tutorias: [],
};

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useCursos(cursos: Curso[], onUpdate: () => void) {

  // ── UI listado ──
  const [showArchived,     setShowArchived]     = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<ConfirmAction | null>(null);

  // ── UI formulario ──
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Curso | null>(null);
  const [formData, setFormData] = useState<Partial<Curso>>(EMPTY_FORM);

  // ── Festivos y tutorías ──
  const [newFestivo, setNewFestivo] = useState('');
  const [newTutoria, setNewTutoria] = useState('');

  // ─────────────────────────────────────────
  //  HANDLERS: FORMULARIO
  // ─────────────────────────────────────────

  const handleOpenNew = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const handleOpenEdit = (curso: Curso) => {
    setEditing(curso);
    setFormData(curso);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url    = editing ? `/api/cursos/${editing.id}` : '/api/cursos';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setFormData(EMPTY_FORM);
        onUpdate();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: FESTIVOS Y TUTORÍAS
  // ─────────────────────────────────────────

  const addFestivo = () => {
    if (!newFestivo) return;
    setFormData(prev => ({ ...prev, festivos: [...(prev.festivos || []), newFestivo] }));
    setNewFestivo('');
  };

  const removeFestivo = (date: string) => {
    setFormData(prev => ({ ...prev, festivos: (prev.festivos || []).filter(f => f !== date) }));
  };

  const addTutoria = () => {
    if (!newTutoria) return;
    setFormData(prev => ({ ...prev, tutorias: [...(prev.tutorias || []), newTutoria] }));
    setNewTutoria('');
  };

  const removeTutoria = (date: string) => {
    setFormData(prev => ({ ...prev, tutorias: (prev.tutorias || []).filter(f => f !== date) }));
  };

  // ─────────────────────────────────────────
  //  HANDLERS: DELETE / ARCHIVE
  // ─────────────────────────────────────────

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/cursos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setConfirmingAction(null);
      onUpdate();
    } catch {
      alert('Error al intentar eliminar el curso.');
    }
  };

  const handleArchive = async (id: number, shouldArchive: boolean) => {
    try {
      const res = await fetch(`/api/cursos/${id}/archive`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archive: shouldArchive }),
      });
      if (!res.ok) throw new Error('Error al cambiar estado');
      setConfirmingAction(null);
      onUpdate();
    } catch {
      alert('Error al intentar cambiar el estado del curso.');
    }
  };

  const handleConfirmAction = () => {
    if (!confirmingAction) return;
    if (confirmingAction.type === 'delete')   handleDelete(confirmingAction.id);
    else if (confirmingAction.type === 'archive') handleArchive(confirmingAction.id, true);
    else handleArchive(confirmingAction.id, false);
  };

  // ─────────────────────────────────────────
  //  DATOS DERIVADOS
  // ─────────────────────────────────────────

  const filteredCursos = showArchived ? cursos : cursos.filter(c => !c.archivado);
  const hasNoActiveCursos = cursos.length > 0 && !cursos.some(c => !c.archivado);

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Listado UI
    showArchived, setShowArchived,
    filteredCursos, hasNoActiveCursos,
    confirmingAction, setConfirmingAction,
    // Formulario UI
    showForm, setShowForm,
    editing,
    formData, setFormData,
    handleOpenNew, handleOpenEdit, handleSubmit,
    // Festivos y tutorías
    newFestivo, setNewFestivo, addFestivo, removeFestivo,
    newTutoria, setNewTutoria, addTutoria, removeTutoria,
    // Acciones
    handleConfirmAction,
  };
}
