import { useState, useEffect } from 'react';
import { Profesor } from '../../../types/index.ts';
import { mostrarToast } from '../../../utils/toast.ts';

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

/**
 * Formulario de datos personales del profesor.
 *
 * Solo el perfil. Los centros educativos y sus ciclos viven en la seccion
 * Centros, con su propio hook (`useCentros`), asi que abrir el perfil no
 * dispara el `GET /api/centros` ni su lista de peticiones de detalles.
 */
export function usePerfilProfesor(profesor: Profesor | null, onUpdate: (p: Profesor) => void) {

  // ── Datos del perfil ──
  const [formData, setFormData] = useState<Profesor>({
    nombre: '', apellidos: '', nif: '', email: '', telefono: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => {
    if (profesor) setFormData({ ...profesor });
  }, [profesor]);

  // ─────────────────────────────────────────
  //  HANDLERS
  // ─────────────────────────────────────────

  const handleSubmitProfesor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/profesor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdate({ ...formData, id: data.id });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        console.error('Error al guardar el perfil:', res.status, data);
        mostrarToast(data?.error || 'No se pudo guardar el perfil.', 'error');
      }
    } catch (error) {
      console.error(error);
      mostrarToast('No se pudo guardar el perfil: error de conexión con el servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    formData, setFormData,
    saving, success,
    handleSubmitProfesor,
  };
}
