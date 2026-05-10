import { useState, useEffect } from 'react';
import { Profesor, CentroEducativo, DetalleAcademico, ResultadoAprendizaje } from '../../../types/index.ts';

// ─────────────────────────────────────────
//  TIPOS INTERNOS
// ─────────────────────────────────────────

export type DeleteTarget = { id: number; type: 'centro' | 'detalle' };

export type Message = { type: 'success' | 'error' | ''; text: string };

export type CentroWithDetalles = CentroEducativo & { detalles: DetalleAcademico[] };

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useProfesor(profesor: Profesor | null, onUpdate: (p: Profesor) => void) {

  // ── Datos del perfil ──
  const [formData, setFormData] = useState<Profesor>({
    nombre: '', apellidos: '', nif: '', email: '', telefono: '',
  });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Centros ──
  const [centros,       setCentros]       = useState<CentroWithDetalles[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(false);

  // ── Modal eliminar ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteTarget | null>(null);

  // ── Modal centro ──
  const [showCentroForm,  setShowCentroForm]  = useState(false);
  const [editingCentro,   setEditingCentro]   = useState<CentroEducativo | null>(null);
  const [centroFormData,  setCentroFormData]  = useState<Partial<CentroEducativo>>({});

  // ── Modal detalle ──
  const [showDetalleForm,  setShowDetalleForm]  = useState(false);
  const [editingDetalle,   setEditingDetalle]   = useState<DetalleAcademico | null>(null);
  const [detalleFormData,  setDetalleFormData]  = useState<Partial<DetalleAcademico>>({});
  const [currentCentroId,  setCurrentCentroId]  = useState<number | null>(null);

  // ── RA en curso ──
  const [newRA, setNewRA] = useState<Partial<ResultadoAprendizaje>>({
    modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '',
  });

  // ── Seguridad / cifrado ──
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [isEncrypting,     setIsEncrypting]     = useState(false);
  const [isEncrypted,      setIsEncrypted]      = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message,          setMessage]          = useState<Message>({ type: '', text: '' });

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => { checkEncryptionStatus(); }, []);

  useEffect(() => {
    if (profesor) {
      setFormData(profesor);
      fetchCentros();
    }
  }, [profesor]);

  // ─────────────────────────────────────────
  //  FETCH
  // ─────────────────────────────────────────

  const fetchCentros = async () => {
    if (!profesor?.id) return;
    setLoadingCentros(true);
    try {
      const res = await fetch('/api/centros');
      const centrosData: CentroEducativo[] = await res.json();
      const centrosWithDetalles = await Promise.all(
        centrosData.map(async c => {
          const dRes     = await fetch(`/api/centros/${c.id}/detalles`);
          const detalles = await dRes.json();
          return { ...c, detalles };
        })
      );
      setCentros(centrosWithDetalles);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCentros(false);
    }
  };

  const checkEncryptionStatus = async () => {
    try {
      const res  = await fetch('/api/auth/status');
      const data = await res.json();
      setIsEncrypted(data.encrypted);
    } catch {
      console.error('Error al comprobar estado de cifrado');
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: PERFIL
  // ─────────────────────────────────────────

  const handleSubmitProfesor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res  = await fetch('/api/profesor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdate({ ...formData, id: data.id });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────
  //  HANDLERS: CENTROS
  // ─────────────────────────────────────────

  const handleOpenCentroForm = (centro: CentroEducativo | null) => {
    setEditingCentro(centro);
    setCentroFormData(centro ?? {});
    setShowCentroForm(true);
  };

  const handleSaveCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesor?.id) {
      alert('Error: Debes guardar tu perfil personal antes de añadir centros educativos.');
      return;
    }
    setSaving(true);
    try {
      const method = editingCentro ? 'PUT' : 'POST';
      const url    = editingCentro ? `/api/centros/${editingCentro.id}` : '/api/centros';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...centroFormData, profesorId: profesor.id }),
      });
      if (res.ok) {
        setShowCentroForm(false);
        setEditingCentro(null);
        setCentroFormData({});
        fetchCentros();
      } else {
        const err = await res.json();
        alert('Error al guardar el centro: ' + (err.error || 'Error desconocido'));
      }
    } catch {
      alert('Error de conexión al servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCentro = async (id: number) => {
    await fetch(`/api/centros/${id}`, { method: 'DELETE' });
    setShowDeleteConfirm(null);
    fetchCentros();
  };

  // ─────────────────────────────────────────
  //  HANDLERS: DETALLES ACADÉMICOS
  // ─────────────────────────────────────────

  const handleOpenDetalleForm = (centroId: number, detalle: DetalleAcademico | null) => {
    setCurrentCentroId(centroId);
    setEditingDetalle(detalle);
    setDetalleFormData(detalle ?? {});
    setShowDetalleForm(true);
  };

  const handleSaveDetalle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCentroId) return;
    setSaving(true);
    try {
      const method = editingDetalle ? 'PUT' : 'POST';
      const url    = editingDetalle
        ? `/api/detalles-academicos/${editingDetalle.id}`
        : '/api/detalles-academicos';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...detalleFormData, centroId: currentCentroId }),
      });
      if (res.ok) {
        setShowDetalleForm(false);
        setEditingDetalle(null);
        setDetalleFormData({});
        fetchCentros();
      } else {
        const err = await res.json();
        alert('Error al guardar el detalle académico: ' + (err.error || 'Error desconocido'));
      }
    } catch {
      alert('Error de conexión al servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDetalle = async (id: number) => {
    await fetch(`/api/detalles-academicos/${id}`, { method: 'DELETE' });
    setShowDeleteConfirm(null);
    fetchCentros();
  };

  const handleConfirmDelete = () => {
    if (!showDeleteConfirm) return;
    if (showDeleteConfirm.type === 'centro') handleDeleteCentro(showDeleteConfirm.id);
    else handleDeleteDetalle(showDeleteConfirm.id);
  };

  // ─────────────────────────────────────────
  //  HANDLERS: RESULTADOS DE APRENDIZAJE
  // ─────────────────────────────────────────

  const addRA = () => {
    if (!newRA.modulo || !newRA.codigo || !newRA.ra || !newRA.nombre) {
      alert('Por favor, rellena los campos obligatorios del Resultado de Aprendizaje.');
      return;
    }
    const ra: ResultadoAprendizaje = {
      id:                 crypto.randomUUID(),
      modulo:             newRA.modulo!,
      codigo:             newRA.codigo!,
      ra:                 newRA.ra!,
      nombre:             newRA.nombre!,
      impartidoEmpresa:   newRA.impartidoEmpresa || false,
      actividadFormativa: newRA.actividadFormativa,
    };
    setDetalleFormData(prev => ({
      ...prev,
      resultadosAprendizaje: [...(prev.resultadosAprendizaje || []), ra],
    }));
    setNewRA({ modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '' });
  };

  const removeRA = (id: string) => {
    setDetalleFormData(prev => ({
      ...prev,
      resultadosAprendizaje: (prev.resultadosAprendizaje || []).filter(r => r.id !== id),
    }));
  };

  // ─────────────────────────────────────────
  //  HANDLERS: CIFRADO
  // ─────────────────────────────────────────

  const handleEncryptDatabase = () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }
    setShowConfirmModal(true);
  };

  const executeEncryption = async () => {
    setIsEncrypting(true);
    try {
      const res = await fetch('/api/auth/encrypt', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Base de datos cifrada correctamente. Se requerirá en el próximo inicio.' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error('Error al cifrar');
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cifrar la base de datos.' });
    } finally {
      setIsEncrypting(false);
      setShowConfirmModal(false);
    }
  };

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Perfil
    formData, setFormData,
    saving, success,
    handleSubmitProfesor,
    // Centros
    centros, loadingCentros,
    showCentroForm, setShowCentroForm,
    editingCentro,
    centroFormData, setCentroFormData,
    handleOpenCentroForm, handleSaveCentro,
    // Detalles
    showDetalleForm, setShowDetalleForm,
    editingDetalle,
    detalleFormData, setDetalleFormData,
    handleOpenDetalleForm, handleSaveDetalle,
    // RAs
    newRA, setNewRA,
    addRA, removeRA,
    // Eliminar
    showDeleteConfirm, setShowDeleteConfirm,
    handleConfirmDelete,
    // Cifrado
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    isEncrypting, isEncrypted,
    showConfirmModal, setShowConfirmModal,
    message,
    handleEncryptDatabase, executeEncryption,
  };
}
