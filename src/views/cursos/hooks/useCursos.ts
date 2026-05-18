import { useState } from 'react';
import { Curso } from '../../../types/index.ts';

const EMPTY_FORM: Partial<Curso> = {
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  festivos: [],
  tutorias: [],
};

export function useCursos(cursos: Curso[], onUpdate: () => void) {

  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Curso | null>(null);
  const [formData, setFormData] = useState<Partial<Curso>>(EMPTY_FORM);

  const [newFestivo, setNewFestivo] = useState('');
  const [newTutoria, setNewTutoria] = useState('');

  const handleOpenNew = () => {
    if (cursos.length > 0) {
      setShowReplaceConfirm(true);
    } else {
      setEditing(null);
      setFormData(EMPTY_FORM);
      setShowForm(true);
    }
  };

  const handleReplaceConfirm = async () => {
    try {
      for (const c of cursos) {
        if (c.id) await fetch(`/api/cursos/${c.id}`, { method: 'DELETE' });
      }
    } catch {
      alert('Error al eliminar el curso anterior');
      return;
    }
    setShowReplaceConfirm(false);
    setEditing(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
    onUpdate();
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
    showForm, setShowForm,
    editing,
    formData, setFormData,
    handleSubmit,
    newFestivo, setNewFestivo, addFestivo, removeFestivo,
    newTutoria, setNewTutoria, addTutoria, removeTutoria,
    handleDelete,
  };
}
