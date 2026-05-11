import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
    RelacionAlumno, Convenio, TutorEmpresa, Alumno, Curso,
    RelacionEstado, PlanFormativoEstado, HorarioSemanal, SeguimientoEstado,
    ValoracionEstado
} from '../../../types/index.ts';
import {
    DEFAULT_HORARIO,
    calculateEndDateForHours,
    calculateStartDateFromEnd,
    getNextRelacionEstado,
    getPrevRelacionEstado,
    getNextPlanEstado,
    getPrevPlanEstado,
    getNextSeguimientoEstado,
    getPrevSeguimientoEstado,
    getNextValoracionEstado,
    getPrevValoracionEstado
} from '../utils/relacionesUtils.ts';

//todo el estado y lógica de relaciones-alumnos, incluyendo gestión de alumnos en el formulario, cambios de estado y descargas de planes formativos

// ─────────────────────────────────────────
//  TIPOS INTERNOS
// ─────────────────────────────────────────

export interface BulkHorario {
    inicio: string;
    fin: string;
    horas: number;
    dias: Record<string, boolean>;
}

// ─────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────

export function useRelaciones(cursoId: number) {

    // ── Datos del servidor ──
    const [relaciones, setRelaciones] = useState<RelacionAlumno[]>([]);
    const [convenios, setConvenios] = useState<(Convenio & { empresaNombre: string })[]>([]);
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [tutores, setTutores] = useState<TutorEmpresa[]>([]);
    const [curso, setCurso] = useState<Curso | null>(null);

    // ── UI de listado ──
    const [selectedRelacion, setSelectedRelacion] = useState<RelacionAlumno | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setBy] = useState<'empresa' | 'estado'>('empresa');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // ── UI del formulario ──
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<RelacionAlumno | null>(null);
    const [searchTermAlumno, setSearchTermAlumno] = useState('');
    const [searchTermConvenio, setSearchTermConvenio] = useState('');
    const [selectedAlumnosIds, setSelectedAlumnosIds] = useState<number[]>([]);
    const [targetEndDate, setTargetEndDate] = useState('');
    const [targetStartDate, setTargetStartDate] = useState('');
    const [isConvenioDropdownOpen, setIsConvenioDropdownOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<RelacionAlumno>>({
        alumnos: [],
        numRelacion: '',
        horario: { ...DEFAULT_HORARIO },
        estado: RelacionEstado.PENDIENTE_ENVIAR_EMPRESA,
        estadoPlanFormativo: PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE,
    });

    const [bulkHorario, setBulkHorario] = useState<BulkHorario>({
        inicio: '08:00',
        fin: '17:00',
        horas: 8,
        dias: { lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false },
    });

    // ─────────────────────────────────────────
    //  FETCH DE DATOS
    // ─────────────────────────────────────────

    const fetchData = async () => {
        const [relRes, convRes, cursoRes, alumRes] = await Promise.all([
            fetch('/api/relaciones-alumnos'),
            fetch(`/api/convenios?cursoId=${cursoId}`),
            fetch(`/api/cursos`),
            fetch(`/api/alumnos?cursoId=${cursoId}`),
        ]);

        const allRelaciones: RelacionAlumno[] = await relRes.json();
        const allConvenios = await convRes.json();
        const allCursos = await cursoRes.json();
        const allAlumnos: Alumno[] = await alumRes.json();

        setRelaciones(allRelaciones);
        setConvenios(allConvenios);
        setAlumnos(allAlumnos);
        setCurso(allCursos.find((c: Curso) => c.id === cursoId));

        if (selectedRelacion) {
            const updated = allRelaciones.find(r => r.id === selectedRelacion.id);
            if (updated) setSelectedRelacion(updated);
        }
    };

    useEffect(() => { fetchData(); }, [cursoId]);

    // Cargar tutores cuando cambia el convenio seleccionado
    useEffect(() => {
        if (formData.convenioId) {
            const conv = convenios.find(c => c.id === formData.convenioId);
            if (conv) {
                fetch(`/api/empresas/${conv.empresaId}/tutores`)
                    .then(res => res.json())
                    .then(setTutores);
            }
        }
    }, [formData.convenioId, convenios]);

    // Sincronizar fechas fin cuando cambia el horario
    useEffect(() => {
        if (formData.alumnos?.length && formData.horario) {
            setFormData(prev => ({
                ...prev,
                alumnos: (prev.alumnos || []).map(ar => {
                    const endDate = calculateEndDateForHours(ar.fechaInicio || '', ar.totalHorasFFE, prev.horario, curso);
                    return endDate ? { ...ar, fechaFin: endDate } : ar;
                }),
            }));
        }
    }, [formData.horario]);

    // ─────────────────────────────────────────
    //  LÓGICA DEL FORMULARIO
    // ─────────────────────────────────────────

    const handleOpenForm = (rel: RelacionAlumno | null) => {
        if (rel) {
            setEditing(rel);
            setFormData({ ...rel, alumnos: rel.alumnos || [] });
            const conv = convenios.find(c => c.id === rel.convenioId);
            setSearchTermConvenio(conv ? `${conv.empresaNombre} (Ref: ${conv.numConvenio})` : '');
        } else {
            setEditing(null);
            setFormData({
                alumnos: [],
                numRelacion: '',
                horario: { ...DEFAULT_HORARIO },
                estado: RelacionEstado.PENDIENTE_ENVIAR_EMPRESA,
                estadoPlanFormativo: PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE,
            });
            setSearchTermConvenio('');
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.convenioId || !formData.tutorEmpresaId) {
            alert('Por favor, selecciona al menos un convenio y un tutor válidos.');
            return;
        }
        const method = editing ? 'PUT' : 'POST';
        const url = editing ? `/api/relaciones-alumnos/${editing.id}` : '/api/relaciones-alumnos';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, alumnosIds: selectedAlumnosIds }),
            });
            if (res.ok) {
                setShowForm(false);
                setEditing(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error guardando relación:', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/relaciones-alumnos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar');
            setShowDeleteConfirm(null);
            if (selectedRelacion?.id === id) setSelectedRelacion(null);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar la relación.');
        }
    };

    // ─────────────────────────────────────────
    //  GESTIÓN DE ALUMNOS EN EL FORMULARIO
    // ─────────────────────────────────────────

    const addAlumnoToRelacion = (alumno: Alumno) => {
        if (!selectedAlumnosIds.includes(alumno.id!)) {
            setSelectedAlumnosIds(prev => [...prev, alumno.id!]);
        }
        setSearchTermAlumno('');
    };

    const removeAlumnoFromRelacion = (id: number) => {
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).filter(a => a.id !== id),
        }));
    };

    const updateStudentHours = (id: number, hours: number) => {
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                if (a.id !== id) return a;
                const newEndDate = calculateEndDateForHours(a.fechaInicio || '', hours, prev.horario, curso);
                return { ...a, horasPendientesFFE: hours, fechaFin: newEndDate || a.fechaFin };
            }),
        }));
    };

    const updateStudentStartDate = (id: number, date: string) => {
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                if (a.id !== id) return a;
                const newEndDate = calculateEndDateForHours(date, a.totalHorasFFE || 0, prev.horario, curso);
                return { ...a, fechaInicio: date, fechaFin: newEndDate || a.fechaFin };
            }),
        }));
    };

    const applyTargetEndDate = () => {
        if (!targetEndDate) return;
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => ({
                ...a,
                fechaInicio: calculateStartDateFromEnd(targetEndDate, a.totalHorasFFE, prev.horario, curso) || a.fechaInicio,
                fechaFin: targetEndDate,
            })),
        }));
    };

    const applyStartDateToAll = () => {
        if (!targetStartDate) return;
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => ({ ...a, fechaInicio: targetStartDate })),
        }));
    };

    const applyBulkHorario = () => {
        setFormData(prev => {
            const newHorario = { ...prev.horario } as HorarioSemanal;
            (Object.keys(bulkHorario.dias) as Array<keyof HorarioSemanal>).forEach(day => {
                newHorario[day] = (bulkHorario.dias as Record<string, boolean>)[day]  // ✅
                    ? { inicio: bulkHorario.inicio, fin: bulkHorario.fin, horas: bulkHorario.horas }
                    : { inicio: '00:00', fin: '00:00', horas: 0 };
            });
            return { ...prev, horario: newHorario };
        });
    };

    // ─────────────────────────────────────────
    //  TRANSICIONES DE ESTADO (ANEXO)
    // ─────────────────────────────────────────

    const advanceStatus = async (rel: RelacionAlumno) => {
        const nextEstado = getNextRelacionEstado(rel.estado);
        if (nextEstado === rel.estado) return;
        await fetch(`/api/relaciones-alumnos/${rel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rel, estado: nextEstado }),
        });
        setSelectedRelacion({ ...rel, estado: nextEstado });
        fetchData();
    };

    const moveBackStatus = async (rel: RelacionAlumno) => {
        const prevEstado = getPrevRelacionEstado(rel.estado);
        if (prevEstado === rel.estado) return;
        try {
            const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rel, estado: prevEstado }),
            });
            if (res.ok) { setSelectedRelacion({ ...rel, estado: prevEstado }); fetchData(); }
        } catch (error) { console.error('Error al retroceder estado:', error); }
    };

    // ─────────────────────────────────────────
    //  TRANSICIONES DE ESTADO (PLAN FORMATIVO GLOBAL)
    // ─────────────────────────────────────────

    const advancePlanStatus = async (rel: RelacionAlumno) => {
        const currentState = rel.estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
        const nextEstado = getNextPlanEstado(currentState);
        if (nextEstado === currentState) return;
        try {
            const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rel, estadoPlanFormativo: nextEstado }),
            });
            if (res.ok) { setSelectedRelacion({ ...rel, estadoPlanFormativo: nextEstado as PlanFormativoEstado }); fetchData(); }
        } catch (error) { console.error('Error al avanzar plan:', error); }
    };

    const moveBackPlanStatus = async (rel: RelacionAlumno) => {
        const currentState = rel.estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
        const prevEstado = getPrevPlanEstado(currentState);
        if (prevEstado === currentState) return;
        try {
            const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rel, estadoPlanFormativo: prevEstado }),
            });
            if (res.ok) { setSelectedRelacion({ ...rel, estadoPlanFormativo: prevEstado as PlanFormativoEstado }); fetchData(); }
        } catch (error) { console.error('Error al retroceder plan:', error); }
    };

    // ─────────────────────────────────────────
    //  TRANSICIONES DE ESTADO (PLAN FORMATIVO INDIVIDUAL)
    // ─────────────────────────────────────────

    const advancePlanStatusIndividual = async (alumno: Alumno) => {
        const currentState = (alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
        const nextEstado = getNextPlanEstado(currentState);
        if (nextEstado === currentState) return;
        try {
            await fetch(`/api/alumnos/${alumno.id}/estado-plan-formativo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoPlanFormativo: nextEstado }),
            });
            fetchData();
        } catch (error) { console.error('Error al avanzar plan individual:', error); }
    };

    const moveBackPlanStatusIndividual = async (alumno: Alumno) => {
        const currentState = (alumno as any).estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
        const prevEstado = getPrevPlanEstado(currentState);
        if (prevEstado === currentState) return;
        try {
            await fetch(`/api/alumnos/${alumno.id}/estado-plan-formativo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoPlanFormativo: prevEstado }),
            });
            fetchData();
        } catch (error) { console.error('Error al retroceder plan individual:', error); }
    };

    const advanceSeguimientoStatusIndividual = async (alumno: Alumno) => {
        const currentState = (alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE;
        const nextEstado = getNextSeguimientoEstado(currentState);
        if (nextEstado === currentState) return;
        try {
            await fetch(`/api/alumnos/${alumno.id}/estado-seguimiento`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoSeguimiento: nextEstado }),
            });
            fetchData();
        } catch (error) { console.error('Error al avanzar seguimiento individual:', error); }
    };

    const moveBackSeguimientoStatusIndividual = async (alumno: Alumno) => {
        const currentState = (alumno as any).estadoSeguimiento || SeguimientoEstado.PENDIENTE;
        const prevEstado = getPrevSeguimientoEstado(currentState);
        if (prevEstado === currentState) return;
        try {
            await fetch(`/api/alumnos/${alumno.id}/estado-seguimiento`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoSeguimiento: prevEstado }),
            });
            fetchData();
        } catch (error) { console.error('Error al retroceder seguimiento individual:', error); }
    };

    const advanceValoracionStatusIndividual = async (alumno: Alumno) => {
        const currentState = (alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE;
        const nextEstado = getNextValoracionEstado(currentState);
        if (nextEstado === currentState) return;
        try {
            await fetch(`/api/alumnos/${alumno.id}/estado-valoracion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoValoracion: nextEstado }),
            });
            fetchData();
        } catch (error) { console.error('Error al avanzar valoración individual:', error); }
    };

    const moveBackValoracionStatusIndividual = async (alumno: Alumno) => {
        const currentState = (alumno as any).estadoValoracion || ValoracionEstado.PENDIENTE;
        const prevEstado = getPrevValoracionEstado(currentState);
        if (prevEstado === currentState) return;
        try {
            await fetch(`/api/alumnos/${alumno.id}/estado-valoracion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoValoracion: prevEstado }),
            });
            fetchData();
        } catch (error) { console.error('Error al retroceder valoración individual:', error); }
    };
    // ─────────────────────────────────────────
    //  DESCARGAS
    // ─────────────────────────────────────────

    const descargarPlanesFormativos = async (tipo: 'docx' | 'pdf') => {
        if (!selectedRelacion?.alumnos?.length) { alert('No hay alumnos en esta relación.'); return; }

        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');

        if (selectedRelacion.alumnos.length === 1) {
            const ar = selectedRelacion.alumnos[0];
            const alumno = alumnos.find(a => a.id === ar.id);
            const nombreAlumno = alumno ? `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_') : `Alumno_${ar.id}`;
            const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/plan-formativo`;
            const url = tipo === 'pdf' ? `${baseUrl}/pdf?alumnoId=${ar.id}&t=${Date.now()}` : `${baseUrl}?alumnoId=${ar.id}`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `Plan_${numRelacionLimpio}_${nombreAlumno}.${tipo}`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(downloadUrl);
            } catch (error) { alert(`Error al descargar el plan.`); }
            return;
        }

        // Múltiples alumnos → ZIP
        const zip = new JSZip();
        let archivosAñadidos = 0;
        for (const ar of selectedRelacion.alumnos) {
            const alumno = alumnos.find(a => a.id === ar.id);
            const nombreAlumno = alumno ? `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_') : `Alumno_${ar.id}`;
            const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/plan-formativo`;
            const url = tipo === 'pdf' ? `${baseUrl}/pdf?alumnoId=${ar.id}&t=${Date.now()}` : `${baseUrl}?alumnoId=${ar.id}&t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                zip.file(`Plan_${numRelacionLimpio}_${nombreAlumno}.${tipo}`, await response.blob());
                archivosAñadidos++;
            } catch (error) { console.error(`Error procesando plan de ${nombreAlumno}`); }
        }
        if (archivosAñadidos > 0) {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const downloadUrl = window.URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Planes_Formativos_${numRelacionLimpio}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } else {
            alert('No se pudo descargar ningún archivo del servidor.');
        }
    };

    const descargarPlanFormativoIndividual = async (tipo: 'docx' | 'pdf', alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/plan-formativo`;
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?alumnoId=${alumno.id}&t=${Date.now()}` : `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Plan_${numRelacionLimpio}_${nombreAlumno}.${tipo}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert(`Error al descargar el plan de ${nombreAlumno}`); }
    };

    const descargarSeguimientoIndividual = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/seguimiento`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Seguimiento_${numRelacionLimpio}_${nombreAlumno}.docx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert(`Error al descargar el seguimiento de ${nombreAlumno}`); }
    };

    const descargarValoracionIndividual = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/valoracion`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Valoracion_${numRelacionLimpio}_${nombreAlumno}.docx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert(`Error al descargar la valoración de ${nombreAlumno}`); }
    };

    // ─────────────────────────────────────────
    //  DATOS DERIVADOS
    // ─────────────────────────────────────────

    const filteredAndSortedRelaciones = relaciones
        .filter(rel => {
            const conv = convenios.find(c => c.id === rel.convenioId);
            if (!conv) return false;
            const alumnoMatch = rel.alumnos?.some(a =>
                (a.nombre + ' ' + a.apellidos).toLowerCase().includes(listSearchTerm.toLowerCase())
            );
            const searchMatch = !listSearchTerm ||
                conv.empresaNombre.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                rel.numRelacion.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                alumnoMatch;
            const statusMatch = statusFilter === 'all' || rel.estado === statusFilter;
            return searchMatch && statusMatch;
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'empresa') {
                const nA = convenios.find(c => c.id === a.convenioId)?.empresaNombre || '';
                const nB = convenios.find(c => c.id === b.convenioId)?.empresaNombre || '';
                comparison = nA.localeCompare(nB);
            } else {
                comparison = a.estado.localeCompare(b.estado);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const filteredAlumnos = searchTermAlumno.trim().length > 0
        ? alumnos.filter(a => {
            const matchesSearch = (a.nombre + ' ' + a.apellidos).toLowerCase().includes(searchTermAlumno.toLowerCase());
            const isAlreadyInForm = selectedAlumnosIds.includes(a.id!);
            return matchesSearch && !isAlreadyInForm && !a.relacionId;
        })
        : [];

    const filteredConvenios = convenios.filter(c =>
        `${c.empresaNombre} ${c.numConvenio}`.toLowerCase().includes(searchTermConvenio.toLowerCase())
    );

    // ─────────────────────────────────────────
    //  RETURN
    // ─────────────────────────────────────────

    return {
        // Datos
        relaciones, convenios, alumnos, tutores, curso,
        // Listado UI
        selectedRelacion, setSelectedRelacion,
        showDeleteConfirm, setShowDeleteConfirm,
        listSearchTerm, setListSearchTerm,
        statusFilter, setStatusFilter,
        sortBy, setBy, sortOrder, setSortOrder,
        filteredAndSortedRelaciones,
        // Formulario UI
        showForm, setShowForm,
        editing,
        formData, setFormData,
        searchTermAlumno, setSearchTermAlumno,
        searchTermConvenio, setSearchTermConvenio,
        selectedAlumnosIds, setSelectedAlumnosIds,
        targetEndDate, setTargetEndDate,
        targetStartDate, setTargetStartDate,
        bulkHorario, setBulkHorario,
        isConvenioDropdownOpen, setIsConvenioDropdownOpen,
        filteredAlumnos, filteredConvenios,
        // Handlers formulario
        handleOpenForm, handleSubmit, handleDelete,
        addAlumnoToRelacion, removeAlumnoFromRelacion,
        updateStudentHours, updateStudentStartDate,
        applyTargetEndDate, applyStartDateToAll, applyBulkHorario,
        // Handlers estados
        advanceStatus, moveBackStatus,
        advancePlanStatus, moveBackPlanStatus,
        advancePlanStatusIndividual, moveBackPlanStatusIndividual,
        advanceSeguimientoStatusIndividual, moveBackSeguimientoStatusIndividual,
        advanceValoracionStatusIndividual, moveBackValoracionStatusIndividual,
        // Descargas
        descargarPlanesFormativos, descargarPlanFormativoIndividual, 
        descargarSeguimientoIndividual, descargarValoracionIndividual,
    };
}