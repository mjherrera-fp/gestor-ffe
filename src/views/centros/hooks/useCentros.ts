import { useState, useEffect } from 'react';
import { Profesor, CentroEducativo, DetalleAcademico, ResultadoAprendizaje } from '../../../types/index.ts';

// ─────────────────────────────────────────
//  TIPOS INTERNOS
// ─────────────────────────────────────────

export type DeleteTarget = { id: number; type: 'centro' | 'detalle' };

export type CentroWithDetalles = CentroEducativo & { detalles: DetalleAcademico[] };

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

/**
 * Centros educativos del profesor y los ciclos formativos de cada uno.
 *
 * Vive aparte de `usePerfilProfesor` porque los centros son su propia seccion
 * del menu: asi la vista del perfil no dispara el `GET /api/centros` y su
 * lista de N+1 peticiones, y al abrir Centros no se arrastra el estado del
 * formulario del perfil.
 */
export function useCentros(profesor: Profesor | null, onRefresh?: () => void) {

  // ── Centros ──
  const [centros, setCentros] = useState<CentroWithDetalles[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Modal eliminar ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteTarget | null>(null);

  // ── Modal centro ──
  const [showCentroForm, setShowCentroForm] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroEducativo | null>(null);
  const [centroFormData, setCentroFormData] = useState<Partial<CentroEducativo>>({});

  // ── Modal días festivos del centro ──
  // Se abre desde la tarjeta del centro, no desde su formulario de edicion: los
  // festivos son una cuenta aparte del nombre o la ciudad, asi que no tienen
  // que obligar a abrir el formulario para poder tocarlos.
  const [centroConFestivos, setCentroConFestivos] = useState<CentroWithDetalles | null>(null);

  // ── Modal detalle ──
  const [showDetalleForm, setShowDetalleForm] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState<DetalleAcademico | null>(null);
  const [detalleFormData, setDetalleFormData] = useState<Partial<DetalleAcademico>>({});
  const [currentCentroId, setCurrentCentroId] = useState<number | null>(null);

  // ── RA en curso ──
  const [newRA, setNewRA] = useState<Partial<ResultadoAprendizaje>>({
    modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '',
  });
  const [editingRAId, setEditingRAId] = useState<string | null>(null);

  // ── Tutorías ──
  const [newTutoria, setNewTutoria] = useState('');

  // ─────────────────────────────────────────
  //  EFECTOS
  // ─────────────────────────────────────────

  useEffect(() => {
    if (profesor) fetchCentros();
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
          const dRes = await fetch(`/api/centros/${c.id}/detalles`);
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
      const url = editingCentro ? `/api/centros/${editingCentro.id}` : '/api/centros';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...centroFormData, profesorId: profesor.id }),
      });
      if (res.ok) {
        setShowCentroForm(false);
        setEditingCentro(null);
        setCentroFormData({});
        fetchCentros();
        onRefresh?.();
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
    onRefresh?.();
  };

  const handleOpenFestivos = (centro: CentroWithDetalles) => setCentroConFestivos(centro);

  const handleSaveFestivos = async (nuevos: string[]) => {
    const centro = centroConFestivos;
    if (!centro?.id) return;
    setSaving(true);
    try {
      // El `PUT` del centro reescribe todas sus columnas, no solo `festivos`
      // (ver `CentroDAO.update`), asi que hay que reenviar el centro entero.
      // Mandando solo `{ festivos }` el nombre, la ciudad, el telefono y el
      // correo se quedarian a NULL. Los `detalles` se descartan porque el
      // endpoint no los toca y no hay por que mandarlos.
      const { detalles, ...datos } = centro;
      const res = await fetch(`/api/centros/${centro.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, festivos: nuevos }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCentroConFestivos(null);
      fetchCentros();
      onRefresh?.();
    } catch {
      alert('Error al guardar los días festivos del centro.');
    } finally {
      setSaving(false);
    }
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
      const url = editingDetalle
        ? `/api/detalles-academicos/${editingDetalle.id}`
        : '/api/detalles-academicos';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...detalleFormData, centroId: currentCentroId }),
      });
      if (res.ok) {
        setShowDetalleForm(false);
        setEditingDetalle(null);
        setDetalleFormData({});
        fetchCentros();
        onRefresh?.();
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
    onRefresh?.();
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
    if (editingRAId) {
      setDetalleFormData(prev => ({
        ...prev,
        resultadosAprendizaje: (prev.resultadosAprendizaje || []).map(r =>
          r.id === editingRAId
            ? {
              ...r,
              modulo: newRA.modulo!,
              codigo: newRA.codigo!,
              ra: newRA.ra!,
              nombre: newRA.nombre!,
              impartidoEmpresa: newRA.impartidoEmpresa || false,
              actividadFormativa: newRA.actividadFormativa,
            }
            : r
        ),
      }));
      setEditingRAId(null);
      setNewRA({ modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '' });
      return;
    }
    const ra: ResultadoAprendizaje = {
      id: crypto.randomUUID(),
      modulo: newRA.modulo!,
      codigo: newRA.codigo!,
      ra: newRA.ra!,
      nombre: newRA.nombre!,
      impartidoEmpresa: newRA.impartidoEmpresa || false,
      actividadFormativa: newRA.actividadFormativa,
    };
    setDetalleFormData(prev => ({
      ...prev,
      resultadosAprendizaje: [...(prev.resultadosAprendizaje || []), ra],
    }));
    setNewRA({ modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '' });
  };

  const startEditRA = (ra: ResultadoAprendizaje) => {
    setEditingRAId(ra.id);
    setNewRA({
      modulo: ra.modulo,
      codigo: ra.codigo,
      ra: ra.ra,
      nombre: ra.nombre,
      impartidoEmpresa: ra.impartidoEmpresa || false,
      actividadFormativa: ra.actividadFormativa,
    });
  };

  const cancelEditRA = () => {
    setEditingRAId(null);
    setNewRA({ modulo: '', codigo: '', ra: '', nombre: '', impartidoEmpresa: false, actividadFormativa: '' });
  };

  const removeRA = (id: string) => {
    setDetalleFormData(prev => ({
      ...prev,
      resultadosAprendizaje: (prev.resultadosAprendizaje || []).filter(r => r.id !== id),
    }));
    if (editingRAId === id) cancelEditRA();
  };

  // ─────────────────────────────────────────
  //  HANDLERS: TUTORÍAS
  // ─────────────────────────────────────────

  const addTutoria = () => {
    if (!newTutoria) return;
    setDetalleFormData(prev => ({
      ...prev,
      tutorias: [...(prev.tutorias || []), newTutoria],
    }));
    setNewTutoria('');
  };

  const removeTutoria = (date: string) => {
    setDetalleFormData(prev => ({
      ...prev,
      tutorias: (prev.tutorias || []).filter(f => f !== date),
    }));
  };

  // ─────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────

  return {
    // Centros
    centros, loadingCentros, saving,
    showCentroForm, setShowCentroForm,
    editingCentro,
    centroFormData, setCentroFormData,
    handleOpenCentroForm, handleSaveCentro,
    // Festivos
    centroConFestivos, setCentroConFestivos,
    handleOpenFestivos, handleSaveFestivos,
    // Detalles
    showDetalleForm, setShowDetalleForm,
    editingDetalle,
    detalleFormData, setDetalleFormData,
    handleOpenDetalleForm, handleSaveDetalle,
    // RAs
    newRA, setNewRA,
    addRA, removeRA, startEditRA, cancelEditRA, editingRAId,
    // Festivos: se editan en el calendario, no aqui
    // Tutorías
    newTutoria, setNewTutoria, addTutoria, removeTutoria,
    // Eliminar
    showDeleteConfirm, setShowDeleteConfirm,
    handleConfirmDelete,
  };
}
