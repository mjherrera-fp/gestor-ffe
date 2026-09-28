import { useState } from 'react';
import { Curso } from '../../../types/index.ts';
import { mostrarToast } from '../../../utils/toast.ts';

const EMPTY_FORM: Partial<Curso> = {
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
};

export function useCursos(cursos: Curso[], onUpdate: () => void) {

  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Curso | null>(null);
  const [formData, setFormData] = useState<Partial<Curso>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // True cuando el formulario abierto va a sustituir el curso existente.
  // El borrado se difiere al guardar para que cancelar no pierda datos.
  const [reemplazando, setReemplazando] = useState(false);

  const cerrarFormulario = () => {
    setShowForm(false);
    setEditing(null);
    setReemplazando(false);
    setFormData(EMPTY_FORM);
  };

  const handleOpenNew = () => {
    if (cursos.length > 0) {
      setShowReplaceConfirm(true);
    } else {
      setEditing(null);
      setReemplazando(false);
      setFormData(EMPTY_FORM);
      setShowForm(true);
    }
  };

  // Antes aqui se hacia DELETE de todos los cursos antes de abrir el
  // formulario, y al cancelar se perdian los alumnos y sus relaciones. Ahora
  // solo se abre el formulario; el borrado va con el guardado, en transaccion.
  const handleReplaceConfirm = () => {
    setShowReplaceConfirm(false);
    setEditing(null);
    setReemplazando(true);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const handleOpenEdit = (curso: Curso) => {
    setEditing(curso);
    setReemplazando(false);
    setFormData(curso);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      let method: 'POST' | 'PUT' = 'POST';
      let url = '/api/cursos';
      if (editing) {
        method = 'PUT';
        url = `/api/cursos/${editing.id}`;
      } else if (reemplazando) {
        url = '/api/cursos/reemplazar';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        const mensaje = cuerpo?.error
          || (method === 'PUT' ? 'No se pudo actualizar el curso.' : 'No se pudo guardar el curso.');
        mostrarToast(mensaje, 'error');
        return;
      }

      mostrarToast(editing ? 'Curso actualizado' : 'Curso guardado', 'success');
      cerrarFormulario();
      onUpdate();
    } catch {
      mostrarToast('No se pudo conectar con el servidor. Revisa que la aplicación esté abierta.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/cursos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setConfirmingDelete(null);
      onUpdate();
    } catch {
      alert('Error al intentar eliminar el curso.');
    }
  };

  return {
    filteredCursos: cursos,
    confirmingDelete, setConfirmingDelete,
    showReplaceConfirm, setShowReplaceConfirm,
    handleOpenNew, handleOpenEdit, handleReplaceConfirm,
    showForm, cerrarFormulario,
    editing,
    formData, setFormData,
    handleSubmit,
    saving,
    handleDelete,
  };
}
