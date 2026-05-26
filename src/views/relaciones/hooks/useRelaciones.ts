import { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import {
    RelacionAlumno, Convenio, TutorEmpresa, Alumno, Curso, Profesor,
    RelacionEstado, PlanFormativoEstado, HorarioSemanal, SeguimientoEstado,
    ValoracionEstado, EmpresaEstadistica, FirmaTipo, SelectedDocs
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
import { EmailAttachment, PlantillaCorreo } from '../../../types/email.ts';
import { uploadGeneratedAttachment } from '../../../utils/emailUtils.ts';
import { mostrarToast } from '../../../utils/toast.ts';
import { PLANTILLAS_CORREO, getPlantillaById, interpolateBody } from '../../../../templates/emails/emailTemplates.ts';

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

export function useRelaciones(cursoId: number, detalleAcademicoId?: number, profesor?: Profesor) {

    // ── Datos del servidor ──
    const [relaciones, setRelaciones] = useState<RelacionAlumno[]>([]);
    const [convenios, setConvenios] = useState<(Convenio & { empresaNombre: string; empresaCiudad?: string })[]>([]);
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [tutores, setTutores] = useState<TutorEmpresa[]>([]);
    const [curso, setCurso] = useState<Curso | null>(null);
    const [centroFestivos, setCentroFestivos] = useState<string[]>([]);
    const [usarFestivos, setUsarFestivos] = useState(true);
    const [usarFestivosEmpresa, setUsarFestivosEmpresa] = useState(false);
    const [empresaFestivosMap, setEmpresaFestivosMap] = useState<Record<string, string[]>>({});
    const [empresaFestivosActuales, setEmpresaFestivosActuales] = useState<string[]>([]);
    const [modoCreacion, setModoCreacion] = useState('descargar');
    const [carpetaEstudiante, setCarpetaEstudiante] = useState(false);

    // ── UI de listado ──
    const [selectedRelacion, setSelectedRelacion] = useState<RelacionAlumno | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [statusFilters, setStatusFilters] = useState({
        relacion: { value: 'all', negate: false },
        plan: { value: 'all', negate: false },
        seguimiento: { value: 'all', negate: false },
        valoracion: { value: 'all', negate: false },
    });
    const [dateFilters, setDateFilters] = useState({
        inicioDias: 0,
        finDias: 0,
        especificaDate: '',
        especificaField: 'inicio' as 'inicio' | 'fin',
        especificaOp: 'on' as 'on' | 'before' | 'after',
    });

    const clearFilters = () => {
        setListSearchTerm('');
        setStatusFilters({
            relacion: { value: 'all', negate: false },
            plan: { value: 'all', negate: false },
            seguimiento: { value: 'all', negate: false },
            valoracion: { value: 'all', negate: false },
        });
        setDateFilters({
            inicioDias: 0,
            finDias: 0,
            especificaDate: '',
            especificaField: 'inicio',
            especificaOp: 'on',
        });
    };
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

    // Control del modal de selección previa
    const [targetDownloadRelaciones, setTargetDownloadRelaciones] = useState<RelacionAlumno[]>([]);
    const [selectedDocs, setSelectedDocs] = useState({
        relacion: true,
        plan: true,
        seguimiento: true,
        valoracion: true,
        calendario: true,
        carta: true
    });

    // Estados para controlar el modal de descarga masiva
    const [isDownloadingMasivo, setIsDownloadingMasivo] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState('');

    // Control del modal de selección previa para email
    const [targetEmailRelaciones, setTargetEmailRelaciones] = useState<RelacionAlumno[]>([]);
    const [isPreparingEmail, setIsPreparingEmail] = useState(false);

    const [formData, setFormData] = useState<Partial<RelacionAlumno>>({
        alumnos: [],
        numRelacion: '',
        horario: { ...DEFAULT_HORARIO },
        estado: RelacionEstado.PENDIENTE_ENVIAR_EMPRESA,
        estadoPlanFormativo: PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE,
        firmaRelacion: FirmaTipo.SIN_ASIGNAR,
        firmaPlanFormativo: FirmaTipo.SIN_ASIGNAR,
        firmaSeguimiento: FirmaTipo.SIN_ASIGNAR,
        firmaValoracion: FirmaTipo.SIN_ASIGNAR,
    });

    const [bulkHorario, setBulkHorario] = useState<BulkHorario>({
        inicio: '08:00',
        fin: '17:00',
        horas: 8,
        dias: { lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false },
    });

    // ── Estadísticas de empresa ──
    const [showEstadisticaModal, setShowEstadisticaModal] = useState(false);
    const [estadisticaRelacion, setEstadisticaRelacion] = useState<RelacionAlumno | null>(null);
    const [estadisticaEmpresaNombre, setEstadisticaEmpresaNombre] = useState('');
    const [estadisticaCurso, setEstadisticaCurso] = useState('');
    const [estadisticaNumAlumnos, setEstadisticaNumAlumnos] = useState(0);
    const [estadisticaContratados, setEstadisticaContratados] = useState(0);
    const [estadisticaValoracion, setEstadisticaValoracion] = useState(0);

    // ─────────────────────────────────────────
    //  FETCH DE DATOS
    // ─────────────────────────────────────────

    const fetchData = async () => {
        const relParams = new URLSearchParams();
        if (detalleAcademicoId) relParams.set('detalleAcademicoId', String(detalleAcademicoId));
        const convParams = new URLSearchParams({ cursoId: String(cursoId) });
        const alumParams = new URLSearchParams({ cursoId: String(cursoId) });
        if (detalleAcademicoId) alumParams.set('detalleAcademicoId', String(detalleAcademicoId));
        const [relRes, convRes, cursoRes, alumRes, configRes, empFestRes] = await Promise.all([
            fetch(`/api/relaciones-alumnos?${relParams}`),
            fetch(`/api/convenios?${convParams}`),
            fetch(`/api/cursos`),
            fetch(`/api/alumnos?${alumParams}`),
            fetch('/api/profesor/config/festivos'),
            fetch('/api/empresas/festivos'),
        ]);

        const allRelaciones: RelacionAlumno[] = await relRes.json();
        const allConvenios = await convRes.json();
        const allCursos = await cursoRes.json();
        const allAlumnos: Alumno[] = await alumRes.json();

        setRelaciones(allRelaciones);
        setConvenios(allConvenios);
        setAlumnos(allAlumnos);
        setCurso(allCursos.find((c: Curso) => c.id === cursoId));

        if (configRes.ok) {
            const configData = await configRes.json();
            setUsarFestivos(configData.usar_festivos !== '0');
            setUsarFestivosEmpresa(configData.usar_festivos_empresa === '1');
        }

        if (empFestRes.ok) {
            const data = await empFestRes.json();
            setEmpresaFestivosMap(data);
        }

        if (selectedRelacion) {
            const updated = allRelaciones.find(r => r.id === selectedRelacion.id);
            if (updated) setSelectedRelacion(updated);
        }
    };

    useEffect(() => { fetchData(); }, [cursoId, detalleAcademicoId]);
    useEffect(() => { setSelectedRelacion(null); }, [cursoId, detalleAcademicoId]);

    // Cargar config de creación de ficheros
    useEffect(() => {
        fetch('/api/profesor/config/creacion-ficheros')
            .then(r => r.json())
            .then(data => {
                setModoCreacion(data.modo || 'descargar');
                setCarpetaEstudiante(data.carpeta_estudiante === '1');
            })
            .catch(() => {});
    }, []);

    // Cargar tutores cuando cambia el convenio seleccionado
    useEffect(() => {
        if (formData.convenioId) {
            const conv = convenios.find(c => c.id === formData.convenioId);
            if (conv) {
                fetch(`/api/empresas/${conv.empresaId}/tutores`)
                    .then(res => res.json())
                    .then(setTutores);
                fetch(`/api/centros/${conv.centroId}`)
                    .then(res => res.json())
                    .then(centro => setCentroFestivos(centro.festivos || []))
                    .catch(() => setCentroFestivos([]));
                // Cargar empresa para obtener su ciudad y luego los festivos de empresa
                fetch(`/api/empresas/${conv.empresaId}`)
                    .then(res => res.json())
                    .then(empresa => {
                        if (empresa?.ciudad && empresaFestivosMap[empresa.ciudad]) {
                            setEmpresaFestivosActuales(empresaFestivosMap[empresa.ciudad]);
                        } else {
                            setEmpresaFestivosActuales([]);
                        }
                    })
                    .catch(() => setEmpresaFestivosActuales([]));
            }
        }
    }, [formData.convenioId, convenios, empresaFestivosMap]);

    // Cargar tutores cuando se selecciona una relación existente
    useEffect(() => {
        if (selectedRelacion?.empresa?.id) {
            fetch(`/api/empresas/${selectedRelacion.empresa.id}/tutores`)
                .then(res => res.json())
                .then(setTutores);
        }
    }, [selectedRelacion?.empresa?.id]);

    // Sincronizar fechas fin cuando cambia el horario
    useEffect(() => {
        if (formData.alumnos?.length && formData.horario) {
            setFormData(prev => ({
                ...prev,
                alumnos: (prev.alumnos || []).map(ar => {
                    const endDate = calculateEndDateForHours(ar.fechaInicio || '', ar.totalHorasFFE, prev.horario, centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa);
                    return endDate ? { ...ar, fechaFin: endDate } : ar;
                }),
            }));
        }
    }, [formData.horario, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa]);

    // ─────────────────────────────────────────
    //  LÓGICA DEL FORMULARIO
    // ─────────────────────────────────────────

    const handleOpenForm = (rel: RelacionAlumno | null) => {
        if (rel) {
            setEditing(rel);
            setFormData({ ...rel, alumnos: rel.alumnos || [] });
            const conv = convenios.find(c => c.id === rel.convenioId);
            setSearchTermConvenio(conv ? `${conv.empresaNombre} (Ref: ${conv.numConvenio})` : '');
            // Sincronizar festivos de empresa inmediatamente desde datos ya cargados
            if (conv?.empresaCiudad && empresaFestivosMap[conv.empresaCiudad]) {
                setEmpresaFestivosActuales(empresaFestivosMap[conv.empresaCiudad]);
            } else {
                setEmpresaFestivosActuales([]);
            }
        } else {
            setEditing(null);
            setFormData({
                alumnos: [],
                numRelacion: '',
                horario: { ...DEFAULT_HORARIO },
                estado: RelacionEstado.PENDIENTE_ENVIAR_EMPRESA,
                estadoPlanFormativo: PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE,
                firmaRelacion: FirmaTipo.DIGITAL,
                firmaPlanFormativo: FirmaTipo.DIGITAL,
                firmaSeguimiento: FirmaTipo.DIGITAL,
                firmaValoracion: FirmaTipo.DIGITAL,
            });
            setSearchTermConvenio('');
            setEmpresaFestivosActuales([]);
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.convenioId || !formData.tutorEmpresaId) {
            alert('Por favor, selecciona al menos un convenio y un tutor válidos.');
            return;
        }
        const convenio = convenios.find(c => c.id === formData.convenioId);
        if (convenio && convenio.estado !== 'COMPLETADO') {
            alert('No se puede crear una relación si el convenio no está completado.');
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
            setFormData(prev => ({
                ...prev,
                alumnos: [...(prev.alumnos || []), {
                    id: alumno.id,
                    nombre: alumno.nombre,
                    apellidos: alumno.apellidos,
                    totalHorasFFE: alumno.totalHorasFFE,
                    fechaInicio: '',
                    fechaFin: '',
                } as Alumno],
            }));
        }
        setSearchTermAlumno('');
    };

    const removeAlumnoFromRelacion = (id: number) => {
        setSelectedAlumnosIds(prev => prev.filter(aId => aId !== id));
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
                const newEndDate = calculateEndDateForHours(a.fechaInicio || '', hours, prev.horario, centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa);
                return { ...a, totalHorasFFE: hours, fechaFin: newEndDate || a.fechaFin };
            }),
        }));
    };

    const updateStudentStartDate = (id: number, date: string) => {
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                if (a.id !== id) return a;
                const newEndDate = calculateEndDateForHours(date, a.totalHorasFFE || 0, prev.horario, centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa);
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
                fechaInicio: calculateStartDateFromEnd(targetEndDate, a.totalHorasFFE, prev.horario, centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa) || a.fechaInicio,
                fechaFin: targetEndDate,
            })),
        }));
    };

    const applyStartDateToAll = () => {
        if (!targetStartDate) return;
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                const endDate = calculateEndDateForHours(targetStartDate, a.totalHorasFFE || 0, prev.horario, centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa);
                return { ...a, fechaInicio: targetStartDate, fechaFin: endDate || a.fechaFin };
            }),
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

    const updateFirma = async (campo: keyof Pick<RelacionAlumno, 'firmaRelacion' | 'firmaPlanFormativo' | 'firmaSeguimiento' | 'firmaValoracion'>, valor: FirmaTipo) => {
        if (!selectedRelacion) return;
        const updated = { ...selectedRelacion, [campo]: valor };
        await fetch(`/api/relaciones-alumnos/${selectedRelacion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        });
        setSelectedRelacion(updated);
        fetchData();
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

    const crearDocumentoRelacion = async (tipo: 'docx' | 'pdf', relacion: RelacionAlumno) => {
        if (!relacion?.alumnos?.length) { alert('No hay alumnos en esta relación.'); return; }

        const baseUrl = `/api/relaciones-alumnos/${relacion.id}/documento`;
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?t=${Date.now()}` : `${baseUrl}?t=${Date.now()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar el plan.`); }

    };

    const descargarRelacion = async (tipo: 'docx' | 'pdf') => {
        if (!selectedRelacion?.alumnos?.length) {
            alert('No hay alumnos en esta relación.');
            return;
        }

        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/documento`;
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?t=${Date.now()}` : `${baseUrl}?t=${Date.now()}`;

        if (modoCreacion === 'crear') {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const data = await response.json();
                if (data.success) {
                    mostrarToast(`Relación guardada en docs/${data.filename}`);
                }
            } catch {
                mostrarToast('Error al guardar la relación', 'error');
            }
            return;
        }

        const blob = await crearDocumentoRelacion(tipo, selectedRelacion);

        if (!blob) {
            return;
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Relacion_${numRelacionLimpio}.${tipo}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        return;
    };

    const crearPlanFormativo = async (tipo: 'docx' | 'pdf', alumno: Alumno, relacion: RelacionAlumno) => {
        if (!relacion) return;
        const numRelacionLimpio = relacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${relacion.id}/plan-formativo`;
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?alumnoId=${alumno.id}&t=${Date.now()}` : `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar el plan de ${nombreAlumno}`); }
    };

    const descargarPlanFormativo = async (tipo: 'docx' | 'pdf', alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/plan-formativo`;
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?alumnoId=${alumno.id}&t=${Date.now()}` : `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;

        if (modoCreacion === 'crear') {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const data = await response.json();
                if (data.success) {
                    mostrarToast(`Plan formativo guardado en docs/${data.filename}`);
                }
            } catch {
                mostrarToast(`Error al guardar el plan de ${nombreAlumno}`, 'error');
            }
            return;
        }

        try {
            const blob = await crearPlanFormativo(tipo, alumno, selectedRelacion);
            if (!blob) {
                return;
            }
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

    const crearSeguimiento = async (alumno: Alumno, relacion: RelacionAlumno) => {
        if (!relacion) return;
        const numRelacionLimpio = relacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${relacion.id}/seguimiento`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar el seguimiento de ${nombreAlumno}`); }
    };

    const descargarSeguimiento = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/seguimiento`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;

        if (modoCreacion === 'crear') {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const data = await response.json();
                if (data.success) {
                    mostrarToast(`Seguimiento guardado en docs/${data.filename}`);
                }
            } catch {
                mostrarToast(`Error al guardar el seguimiento de ${nombreAlumno}`, 'error');
            }
            return;
        }

        try {
            const blob = await crearSeguimiento(alumno, selectedRelacion);
            if (!blob) {
                return;
            }
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

    const crearCarta = async (relacion: RelacionAlumno) => {
        if (!relacion) return;
        const numRelacionLimpio = relacion.numRelacion.replace(/\//g, '_');
        const baseUrl = `/api/relaciones-alumnos/${relacion.id}/carta/pdf`;
        let nombreEmpresa = 'Empresa';
        const convenio = convenios.find(c => c.id === relacion.convenioId);
        if (convenio) nombreEmpresa = convenio.empresaNombre.replace(/\s+/g, '_');
        const url = `${baseUrl}?t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar la carta de ${nombreEmpresa}`); }
    };

    const descargarCarta = async () => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        let nombreEmpresa = 'Empresa';
        const convenio = convenios.find(c => c.id === selectedRelacion.convenioId);
        if (convenio) nombreEmpresa = convenio.empresaNombre.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/carta/pdf`;
        const url = `${baseUrl}?t=${Date.now()}`;

        if (modoCreacion === 'crear') {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const data = await response.json();
                if (data.success) {
                    mostrarToast(`Carta guardada en docs/${data.filename}`);
                }
            } catch {
                mostrarToast('Error al guardar la carta', 'error');
            }
            return;
        }

        try {
            const blob = await crearCarta(selectedRelacion);
            if (!blob) {
                return;
            }
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Carta_${numRelacionLimpio}_${nombreEmpresa}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert(`Error al descargar la carta de ${nombreEmpresa}`); }
    };

    const crearCalendario = async (alumno: Alumno, relacion: RelacionAlumno) => {
        if (!relacion) return;
        const numRelacionLimpio = relacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${relacion.id}/calendario`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar el calendario de ${nombreAlumno}`); }
    };

    const descargarCalendario = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/calendario`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;

        if (modoCreacion === 'crear') {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const data = await response.json();
                if (data.success) {
                    mostrarToast(`Calendario guardado en docs/${data.filename}`);
                }
            } catch {
                mostrarToast(`Error al guardar el calendario de ${nombreAlumno}`, 'error');
            }
            return;
        }

        try {
            const blob = await crearCalendario(alumno, selectedRelacion);
            if (!blob) {
                return;
            }
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Calendario_${numRelacionLimpio}_${nombreAlumno}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert(`Error al descargar el calendario de ${nombreAlumno}`); }
    };

    const crearValoracion = async (alumno: Alumno, relacion: RelacionAlumno) => {
        if (!relacion) return undefined;
        const numRelacionLimpio = relacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${relacion.id}/valoracion`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar la valoración de ${nombreAlumno}`); }
    };

    const descargarValoracion = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const numRelacionLimpio = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const baseUrl = `/api/relaciones-alumnos/${selectedRelacion.id}/valoracion`;
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}`;

        if (modoCreacion === 'crear') {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const data = await response.json();
                if (data.success) {
                    mostrarToast(`Valoración guardada en docs/${data.filename}`);
                }
            } catch {
                mostrarToast(`Error al guardar la valoración de ${nombreAlumno}`, 'error');
            }
            return;
        }

        try {
            const blob = await crearValoracion(alumno, selectedRelacion);
            if (!blob) {
                return;
            }
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

    // ── Estadísticas handlers ──
    const handleOpenEstadistica = async (rel: RelacionAlumno) => {
        const conv = convenios.find(c => c.id === rel.convenioId);
        if (!conv) return;
        const empresaNombre = conv.empresaNombre;
        const cursoNombre = curso ? `${new Date(curso.fechaInicio).getFullYear()}/${new Date(curso.fechaFin).getFullYear()}` : '';
        const numAlumnos = rel.alumnos?.length ?? 0;

        setEstadisticaRelacion(rel);
        setEstadisticaEmpresaNombre(empresaNombre);
        setEstadisticaCurso(cursoNombre);
        setEstadisticaNumAlumnos(numAlumnos);

        try {
            const res = await fetch(`/api/empresas-estadisticas/by-curso?empresaId=${conv.empresaId}&curso=${encodeURIComponent(cursoNombre)}`);
            if (res.ok) {
                const data: EmpresaEstadistica | null = await res.json();
                setEstadisticaContratados(data?.contratados ?? 0);
                setEstadisticaValoracion(data?.valoracion ?? 0);
            } else {
                setEstadisticaContratados(0);
                setEstadisticaValoracion(0);
            }
        } catch {
            setEstadisticaContratados(0);
            setEstadisticaValoracion(0);
        }

        setShowEstadisticaModal(true);
    };

    const handleEstadisticaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const conv = convenios.find(c => c.id === estadisticaRelacion?.convenioId);
        if (!conv) return;

        try {
            const res = await fetch('/api/empresas-estadisticas/upsert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empresaId: conv.empresaId,
                    curso: estadisticaCurso,
                    contratados: estadisticaContratados,
                    valoracion: estadisticaValoracion,
                }),
            });
            if (!res.ok) { alert('Error al guardar las estadísticas'); return; }
            setShowEstadisticaModal(false);
        } catch {
            alert('Error al guardar las estadísticas');
        }
    };

    const handleDescargarTodo = async (relaciones: RelacionAlumno[]) => {
        try {

            const docsAlumno = ['plan', 'seguimiento', 'valoracion', 'calendario'];
            const docsRelacion = ['relacion', 'carta'];

            const numDocsAlumno = docsAlumno.filter(k => selectedDocs[k as keyof typeof selectedDocs]).length;
            const numDocsGeneral = docsRelacion.filter(k => selectedDocs[k as keyof typeof selectedDocs]).length;

            if (numDocsAlumno === 0 && numDocsGeneral === 0) {
                alert('Debes seleccionar al menos un tipo de documento para descargar.');
                return;
            }

            // 0. Ocultamos el selector y mostramos el modal de progreso real
            setTargetDownloadRelaciones([]);
            setIsDownloadingMasivo(true);
            setDownloadProgress(0);
            setDownloadStatus('Iniciando preparación de archivos...');

            // ── MODO CREAR: solo disparar generaciones, el servidor guarda en docs/ ──
            if (modoCreacion === 'crear') {
                const tareasCrear: (() => Promise<void>)[] = [];
                for (const relacion of relaciones) {
                    for (const alumno of relacion.alumnos) {
                        if (!alumno.relacionId) continue;
                        if (selectedDocs.plan) {
                            const urlPlanPdf = `/api/relaciones-alumnos/${relacion.id}/plan-formativo/pdf?alumnoId=${alumno.id}&t=${Date.now()}`;
                            const urlPlanDocx = `/api/relaciones-alumnos/${relacion.id}/plan-formativo?alumnoId=${alumno.id}&t=${Date.now()}`;
                            tareasCrear.push(async () => { try { await fetch(urlPlanPdf); } catch {} });
                            tareasCrear.push(async () => { try { await fetch(urlPlanDocx); } catch {} });
                        }
                        if (selectedDocs.seguimiento) {
                            const url = `/api/relaciones-alumnos/${relacion.id}/seguimiento?alumnoId=${alumno.id}&t=${Date.now()}`;
                            tareasCrear.push(async () => { try { await fetch(url); } catch {} });
                        }
                        if (selectedDocs.valoracion) {
                            const url = `/api/relaciones-alumnos/${relacion.id}/valoracion?alumnoId=${alumno.id}&t=${Date.now()}`;
                            tareasCrear.push(async () => { try { await fetch(url); } catch {} });
                        }
                        if (selectedDocs.calendario) {
                            const url = `/api/relaciones-alumnos/${relacion.id}/calendario?alumnoId=${alumno.id}&t=${Date.now()}`;
                            tareasCrear.push(async () => { try { await fetch(url); } catch {} });
                        }
                    }
                    if (selectedDocs.relacion) {
                        const urlRelPdf = `/api/relaciones-alumnos/${relacion.id}/documento/pdf?t=${Date.now()}`;
                        const urlRelDocx = `/api/relaciones-alumnos/${relacion.id}/documento?t=${Date.now()}`;
                        tareasCrear.push(async () => { try { await fetch(urlRelPdf); } catch {} });
                        tareasCrear.push(async () => { try { await fetch(urlRelDocx); } catch {} });
                    }
                    if (selectedDocs.carta) {
                        const url = `/api/relaciones-alumnos/${relacion.id}/carta/pdf?t=${Date.now()}`;
                        tareasCrear.push(async () => { try { await fetch(url); } catch {} });
                    }
                }
                let completadas = 0;
                const totalTareas = tareasCrear.length;
                const LOTE = 5;
                for (let i = 0; i < totalTareas; i += LOTE) {
                    await Promise.all(tareasCrear.slice(i, i + LOTE).map(t => t()));
                    completadas = Math.min(i + LOTE, totalTareas);
                    setDownloadProgress(Math.min(90, Math.round((completadas / totalTareas) * 90)));
                    setDownloadStatus(`Generando documentos... ${completadas}/${totalTareas}`);
                }
                setDownloadStatus('¡Todos los documentos guardados en docs/!');
                setDownloadProgress(100);
                mostrarToast('Documentos guardados en la carpeta docs/');
                setIsDownloadingMasivo(false);
                return;
            }

            // ── MODO DESCARGAR: ZIP actual ──
            // 1. Inicializar JSZip
            const zip = new JSZip();

            // 1. CÁLCULO DINÁMICO EXACTO DEL TOTAL DE OPERACIONES
            let totalOperaciones = 0;
            relaciones.forEach(rel => {
                const alumnosValidos = rel.alumnos?.filter(a => a.relacionId) || [];
                totalOperaciones += (alumnosValidos.length * numDocsAlumno) + numDocsGeneral;
            });

            let operacionesCompletadas = 0;
            const reportarProgreso = (mensaje: string) => {
                operacionesCompletadas++;
                const porcentaje = totalOperaciones > 0 ? (operacionesCompletadas / totalOperaciones) * 90 : 90;
                setDownloadProgress(porcentaje);
                setDownloadStatus(mensaje);
            };

            // Array maestro donde amontonaremos TODAS las promesas en paralelo de todas las relaciones
            const tareas: (() => Promise<void>)[] = [];
            // 2. ITERAR POR CADA RELACIÓN
            for (const relacion of relaciones) {
                const numRelacionLimpio = relacion.numRelacion.replace(/\//g, '_');

                // (Opcional) Crear una carpeta dentro del ZIP
                const mainFolder = zip.folder(relacion.empresa.nombre);

                // 2. Iterar sobre todos los alumnos
                for (const alumno of relacion.alumnos) {
                    if (!alumno.relacionId) continue; // Si no tiene relación, saltamos

                    // Subcarpeta por alumno solo si la opción está marcada
                    const targetFolder = carpetaEstudiante
                        ? mainFolder?.folder(`${alumno.apellidos}_${alumno.nombre}`)
                        : mainFolder;

                    // --- 1. PLAN FORMATIVO PDF ---
                    if (selectedDocs.plan) {
                        const tarea = crearPlanFormativo('pdf', alumno, relacion).then((blob) => {
                            if (blob) { // Si no falló y tenemos el archivo
                                targetFolder?.file(`Plan_Formativo_${alumno.apellidos}.pdf`, blob);
                            }
                        });
                        tareas.push(async () => tarea);


                        // --- 2. PLAN FORMATIVO DOCX ---
                        const tareaDoc = crearPlanFormativo('docx', alumno, relacion).then((blob) => {
                            if (blob) { // Si no falló y tenemos el archivo
                                targetFolder?.file(`Plan_Formativo_${alumno.apellidos}.docx`, blob);
                                reportarProgreso(`Plan Formativo: ${alumno.apellidos}`);
                            }
                        });
                        tareas.push(async () => tareaDoc);

                    }


                    // --- 3. FICHA DE SEGUIMIENTO ---
                    if (selectedDocs.seguimiento) {
                        const tarea = crearSeguimiento(alumno, relacion).then((blob) => {
                            if (blob) {
                                targetFolder?.file(`Ficha_Seguimiento_${alumno.apellidos}.docx`, blob);
                                reportarProgreso(`Ficha Seguimiento: ${alumno.apellidos}`);
                            }
                        });
                        tareas.push(async () => tarea);
                    }

                    // ---4. VALORACIÓN FINAL ---
                    if (selectedDocs.valoracion) {
                        const tarea = crearValoracion(alumno, relacion).then((blob) => {
                            if (blob) {
                                targetFolder?.file(`Valoracion_Final_${alumno.apellidos}.docx`, blob);
                                reportarProgreso(`Valoración Final: ${alumno.apellidos}`);
                            }
                        });
                        tareas.push(async () => tarea);
                    }

                    // ---5. CALENDARIO ---
                    if (selectedDocs.calendario) {
                        const tarea = crearCalendario(alumno, relacion).then((blob) => {
                            if (blob) {
                                targetFolder?.file(`Calendario_${alumno.apellidos}.pdf`, blob);
                                reportarProgreso(`Calendario: ${alumno.apellidos}`);
                            }
                        });
                        tareas.push(async () => tarea);
                    }

                }

                if (numDocsGeneral > 0 && relacion) {

                    if (selectedDocs.relacion) {
                        // ---6. RELACION PDF---
                        // Usamos tu función crearDocumentoRelacion
                        const tarea = crearDocumentoRelacion('pdf', relacion).then((blob) => {
                            if (blob) {
                                mainFolder?.file(`Relacion_${numRelacionLimpio}.pdf`, blob);
                            }
                        });
                        tareas.push(async () => tarea);

                        // ---7. RELACION DOCX---
                        const tareaDocx = crearDocumentoRelacion('docx', relacion).then((blob) => {
                            if (blob) {
                                mainFolder?.file(`Relacion_${numRelacionLimpio}.docx`, blob);
                                reportarProgreso(`Relacion_${numRelacionLimpio}`);
                            }
                        });
                        tareas.push(async () => tareaDocx);
                    }

                    if (selectedDocs.carta) {
                        // ---8. CARTA ---
                        const tarea = crearCarta(relacion).then((blob) => {
                            if (blob) {
                                mainFolder?.file(`Carta.pdf`, blob);
                                reportarProgreso(`Carta: ${numRelacionLimpio}`);
                            }
                        });
                        tareas.push(async () => tarea);
                    }
                }
            }
            // ---------------------------------------------------------
            // NUEVO MOTOR DE EJECUCIÓN POR LOTES (CHUNK PROCESSING)
            // ---------------------------------------------------------
            // En lugar de await Promise.all(todasLasTareas); que lanza todo a la vez:

            const TAMAÑO_LOTE = 3; // Lanza de 3 en 3 navegadores (ajusta según tu CPU)

            for (let i = 0; i < tareas.length; i += TAMAÑO_LOTE) {
                const loteActual = tareas.slice(i, i + TAMAÑO_LOTE);
                // Ejecutamos solo estas 3 en paralelo y ESPERAMOS a que terminen
                await Promise.all(loteActual.map(tarea => tarea()));
            }
            // Cuando el bucle termine, todas se habrán ejecutado sin saturar el backend

            // 5. Fase final: Compresión (solo ocurre cuando todo lo anterior ha descargado)
            setDownloadStatus('Comprimiendo todos los archivos en un ZIP...');
            setDownloadProgress(95);
            const zipContent = await zip.generateAsync({ type: 'blob' });

            setDownloadStatus('¡Tarea completada!');
            setDownloadProgress(100);

            // 4. Forzar la descarga del ZIP en el navegador
            const url = window.URL.createObjectURL(zipContent);
            const link = document.createElement('a');
            link.href = url;

            // Nombre del archivo que se descargará
            const fecha = new Date().toISOString().split('T')[0];
            link.download = `Documentacion_Relacion_${fecha}.zip`;

            document.body.appendChild(link);
            link.click();

            // 6. Limpieza de memoria
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error al generar el ZIP con la documentación:", error);
            setDownloadStatus('Ocurrió un error al procesar el lote masivo.');
            // Aquí puedes añadir una notificación/toast informando al usuario del error
        } finally {
            setIsDownloadingMasivo(false);
        }
    };
    // ─────────────────────────────────────────
    //  DATOS DERIVADOS
    // ─────────────────────────────────────────

    const filteredAndSortedRelaciones = useMemo(() => relaciones
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
            if (!searchMatch) return false;

            // Filtros de estado (AND entre tipos)
            if (statusFilters.relacion.value !== 'all') {
                const match = rel.estado === statusFilters.relacion.value;
                if (statusFilters.relacion.negate ? match : !match) return false;
            }
            if (statusFilters.plan.value !== 'all') {
                const match = rel.alumnos?.some(a => (a as any).estadoPlanFormativo === statusFilters.plan.value);
                if (statusFilters.plan.negate ? (match ?? false) : !(match ?? false)) return false;
            }
            if (statusFilters.seguimiento.value !== 'all') {
                const match = rel.alumnos?.some(a => (a as any).estadoSeguimiento === statusFilters.seguimiento.value);
                if (statusFilters.seguimiento.negate ? (match ?? false) : !(match ?? false)) return false;
            }
            if (statusFilters.valoracion.value !== 'all') {
                const match = rel.alumnos?.some(a => (a as any).estadoValoracion === statusFilters.valoracion.value);
                if (statusFilters.valoracion.negate ? (match ?? false) : !(match ?? false)) return false;
            }

            // Filtros de fecha
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dateFilters.inicioDias > 0) {
                const match = rel.alumnos?.some(a => {
                    if (!a.fechaInicio) return false;
                    const inicio = new Date(a.fechaInicio);
                    const diff = Math.ceil((inicio.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff >= 0 && diff <= dateFilters.inicioDias;
                });
                if (!match) return false;
            }

            if (dateFilters.finDias > 0) {
                const match = rel.alumnos?.some(a => {
                    if (!a.fechaFin) return false;
                    const fin = new Date(a.fechaFin);
                    const diff = Math.ceil((fin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff >= 0 && diff <= dateFilters.finDias;
                });
                if (!match) return false;
            }

            if (dateFilters.especificaDate) {
                const target = new Date(dateFilters.especificaDate);
                target.setHours(0, 0, 0, 0);
                const match = rel.alumnos?.some(a => {
                    const raw = dateFilters.especificaField === 'inicio' ? a.fechaInicio : a.fechaFin;
                    if (!raw) return false;
                    const d = new Date(raw);
                    d.setHours(0, 0, 0, 0);
                    switch (dateFilters.especificaOp) {
                        case 'on':    return d.getTime() === target.getTime();
                        case 'before': return d.getTime() < target.getTime();
                        case 'after':  return d.getTime() > target.getTime();
                    }
                });
                if (!match) return false;
            }

            return true;
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
        }), [relaciones, convenios, listSearchTerm, statusFilters, dateFilters, sortBy, sortOrder]);

    const filteredAlumnos = useMemo(() => searchTermAlumno.trim().length > 0
        ? alumnos.filter(a => {
            const matchesSearch = (a.nombre + ' ' + a.apellidos).toLowerCase().includes(searchTermAlumno.toLowerCase());
            const isAlreadyInForm = selectedAlumnosIds.includes(a.id!);
            return matchesSearch && !isAlreadyInForm && !a.relacionId;
        })
        : [], [searchTermAlumno, alumnos, selectedAlumnosIds]);

    const filteredConvenios = useMemo(() => convenios.filter(c =>
        c.estado === 'COMPLETADO' &&
        `${c.empresaNombre} ${c.numConvenio}`.toLowerCase().includes(searchTermConvenio.toLowerCase())
    ), [convenios, searchTermConvenio]);

    // ─────────────────────────────────────────
    //  EMAIL
    // ─────────────────────────────────────────

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTo, setEmailTo] = useState<string[]>([]);
    const [emailBcc, setEmailBcc] = useState<string[]>([]);
    const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
    const [contextualContactIds, setContextualContactIds] = useState<Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }>>([]);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    const getContextualContactIds = (): Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }> => {
        if (!selectedRelacion) return [];
        const ids: Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }> = [
            { type: 'empresa', id: selectedRelacion.empresa.id! },
            { type: 'tutor', id: selectedRelacion.tutorEmpresaId },
        ];
        for (const a of selectedRelacion.alumnos) {
            if (a.id) ids.push({ type: 'alumno', id: a.id });
        }
        return ids;
    };

    const getEmpresaEmail = (): string[] => {
        const email = selectedRelacion?.empresa?.email;
        return email ? [email] : [];
    };

    const getEstudianteEmail = (alumno: Alumno): string[] => {
        const email = alumno.emailEduca || alumno.emailPersonal;
        return email ? [email] : [];
    };

    const getTutorEmail = (): string[] => {
        if (!selectedRelacion) return [];
        const tutor = tutores.find(t => t.id === selectedRelacion.tutorEmpresaId);
        return tutor?.email ? [tutor.email] : [];
    };

    const getPlanDestinatarios = (alumno: Alumno): { to: string[]; bcc: string[] } => {
        const estado = alumno.estadoPlanFormativo;
        if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE || estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE) {
            return { to: getEstudianteEmail(alumno), bcc: [] };
        }
        return { to: getTutorEmail(), bcc: [] };
    };

    const buildPlaceholders = (relacion: RelacionAlumno, alumno?: Alumno, contactoOverride?: string) => {
        const empresa = relacion.empresa;
        const nombreEmpresa = convenios?.find(c => c.id === relacion.convenioId)?.empresaNombre ?? empresa?.nombre ?? '';
        const tutor = tutores?.find(t => t.id === relacion.tutorEmpresaId);
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const contactoEmpresa = empresa?.personaContacto || `persona de contacto de ${nombreEmpresa}`;
        const nombreProfesor = profesor ? `${profesor.nombre} ${profesor.apellidos}` : '';
        const listaAlumnos = (relacion.alumnos || [])
            .map(a => `${a.nombre} ${a.apellidos}`)
            .filter(Boolean);
        const nombresUnicos = [...new Set(listaAlumnos)];
        const nombreApellidosAlumnos = nombresUnicos.length <= 1
          ? nombresUnicos.join(', ')
          : nombresUnicos.slice(0, -1).join(', ') +
            (nombresUnicos[nombresUnicos.length - 1].startsWith('I') || nombresUnicos[nombresUnicos.length - 1].startsWith('Í')
              ? ' e '
              : ' y ') +
            nombresUnicos[nombresUnicos.length - 1];
        const direccion = empresa?.direccion ?? '';
        let alumnoTutor = '';
        if (alumno) {
            const estado = alumno.estadoPlanFormativo;
            const esEstudiante = estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE || estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
            alumnoTutor = esEstudiante ? `${alumno.nombre} ${alumno.apellidos}` : nombreTutor;
        } else {
            alumnoTutor = nombreTutor;
        }
        const contacto = contactoOverride ?? (alumno ? `${alumno.nombre} ${alumno.apellidos}` : nombreTutor);
        return { nombreTutor, nombreEmpresa, contactoEmpresa, nombreProfesor, nombreApellidosAlumnos, alumnoTutor, contacto, Dirección: direccion };
    };

    const handleEmailConRelacion = async (tipo: 'docx' | 'pdf') => {
        if (!selectedRelacion) return;
        const blob = await crearDocumentoRelacion(tipo, selectedRelacion);
        if (!blob) return;
        const ext = tipo === 'pdf' ? 'pdf' : 'docx';
        const numRel = selectedRelacion.numRelacion.replace(/\//g, '_');
        const att = await uploadGeneratedAttachment(blob, `Relacion_${numRel}.${ext}`);
        const cfg = getPlantillaById('relacion');
        const placeholders = buildPlaceholders(selectedRelacion);
        setEmailTo(getEmpresaEmail());
        setEmailBcc([]);
        setEmailAttachments([att]);
        setContextualContactIds(getContextualContactIds());
        setEmailSubject(cfg?.subject ?? '');
        setEmailBody(cfg ? interpolateBody(cfg.body, placeholders) : '');
        setShowEmailModal(true);
    };

    const handleEmailConPlanFormativo = async (tipo: 'docx' | 'pdf', alumno: Alumno) => {
        if (!selectedRelacion) return;
        const blob = await crearPlanFormativo(tipo, alumno, selectedRelacion);
        if (!blob) return;
        const ext = tipo === 'pdf' ? 'pdf' : 'docx';
        const numRel = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const att = await uploadGeneratedAttachment(blob, `Plan_${numRel}_${nombreAlumno}.${ext}`);
        const { to, bcc } = getPlanDestinatarios(alumno);
        const cfg = getPlantillaById('plan');
        const placeholders = buildPlaceholders(selectedRelacion, alumno);
        setEmailTo(to);
        setEmailBcc(bcc);
        setEmailAttachments([att]);
        setContextualContactIds(getContextualContactIds());
        setEmailSubject(cfg?.subject ?? '');
        setEmailBody(cfg ? interpolateBody(cfg.body, placeholders) : '');
        setShowEmailModal(true);
    };

    const handleEmailConSeguimiento = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const blob = await crearSeguimiento(alumno, selectedRelacion);
        if (!blob) return;
        const numRel = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const att = await uploadGeneratedAttachment(blob, `Seguimiento_${numRel}_${nombreAlumno}.docx`);
        const cfg = getPlantillaById('seg');
        const tutor = tutores.find(t => t.id === selectedRelacion.tutorEmpresaId);
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const placeholders = buildPlaceholders(selectedRelacion, undefined, nombreTutor);
        setEmailTo(getTutorEmail());
        setEmailBcc([]);
        setEmailAttachments([att]);
        setContextualContactIds(getContextualContactIds());
        setEmailSubject(cfg?.subject ?? '');
        setEmailBody(cfg ? interpolateBody(cfg.body, placeholders) : '');
        setShowEmailModal(true);
    };

    const handleEmailConValoracion = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const blob = await crearValoracion(alumno, selectedRelacion);
        if (!blob) return;
        const numRel = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const att = await uploadGeneratedAttachment(blob, `Valoracion_${numRel}_${nombreAlumno}.docx`);
        const cfg = getPlantillaById('val');
        const tutor = tutores.find(t => t.id === selectedRelacion.tutorEmpresaId);
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const placeholders = buildPlaceholders(selectedRelacion, undefined, nombreTutor);
        setEmailTo(getTutorEmail());
        setEmailBcc([]);
        setEmailAttachments([att]);
        setContextualContactIds(getContextualContactIds());
        setEmailSubject(cfg?.subject ?? '');
        setEmailBody(cfg ? interpolateBody(cfg.body, placeholders) : '');
        setShowEmailModal(true);
    };

    const handleEmailConCarta = async () => {
        if (!selectedRelacion) return;
        const blob = await crearCarta(selectedRelacion);
        if (!blob) return;
        const numRel = selectedRelacion.numRelacion.replace(/\//g, '_');
        let nombreEmpresa = 'Empresa';
        const convenio = convenios.find(c => c.id === selectedRelacion.convenioId);
        if (convenio) nombreEmpresa = convenio.empresaNombre.replace(/\s+/g, '_');
        const att = await uploadGeneratedAttachment(blob, `Carta_${numRel}_${nombreEmpresa}.pdf`);
        const cfg = getPlantillaById('carta-inicio');
        const lugarContacto = selectedRelacion.empresa?.personaContacto || `persona de contacto de ${nombreEmpresa}`;
        const placeholders = buildPlaceholders(selectedRelacion, undefined, lugarContacto);
        setEmailTo(getEmpresaEmail());
        setEmailBcc([]);
        setEmailAttachments([att]);
        setContextualContactIds(getContextualContactIds());
        setEmailSubject(cfg?.subject ?? '');
        setEmailBody(cfg ? interpolateBody(cfg.body, placeholders) : '');
        setShowEmailModal(true);
    };

    const handleEmailConCalendario = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const blob = await crearCalendario(alumno, selectedRelacion);
        if (!blob) return;
        const numRel = selectedRelacion.numRelacion.replace(/\//g, '_');
        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
        const att = await uploadGeneratedAttachment(blob, `Calendario_${numRel}_${nombreAlumno}.pdf`);
        const cfg = getPlantillaById('cal');
        const placeholders = buildPlaceholders(selectedRelacion, alumno);
        setEmailTo(alumno.emailEduca ? [alumno.emailEduca] : []);
        setEmailBcc([]);
        setEmailAttachments([att]);
        setContextualContactIds(getContextualContactIds());
        setEmailSubject(cfg?.subject ?? '');
        setEmailBody(cfg ? interpolateBody(cfg.body, placeholders) : '');
        setShowEmailModal(true);
    };

    const handleEmailConTodo = async (relaciones: RelacionAlumno[]) => {
        if (!relaciones.length) return;

        const docsAlumno: (keyof SelectedDocs)[] = ['plan', 'seguimiento', 'valoracion', 'calendario'];

        const hasAlumnoDocs = docsAlumno.some(k => selectedDocs[k]);
        const hasRelacionDocs = (['relacion', 'carta'] as (keyof SelectedDocs)[]).some(k => selectedDocs[k]);

        if (!hasAlumnoDocs && !hasRelacionDocs) {
            alert('Debes seleccionar al menos un tipo de documento para enviar.');
            return;
        }

        setTargetEmailRelaciones([]);

        const atts: EmailAttachment[] = [];
        const destinatarios = new Set<string>();
        const soloRelacion = selectedDocs.relacion && !hasAlumnoDocs && !selectedDocs.carta;

        for (const relacion of relaciones) {
            if (!relacion.alumnos?.length) continue;

            const numRel = relacion.numRelacion.replace(/\//g, '_');

            // Recipiente por relación
            let recipient: string | undefined;
            if (soloRelacion) {
                recipient = relacion.empresa?.email;
            } else {
                const tutor = tutores.find(t => t.id === relacion.tutorEmpresaId);
                recipient = tutor?.email || relacion.empresa?.email;
            }
            if (recipient) destinatarios.add(recipient);

            for (const alumno of relacion.alumnos) {
                const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');

                if (selectedDocs.plan) {
                    const blob = await crearPlanFormativo('pdf', alumno, relacion);
                    if (blob) {
                        const a = await uploadGeneratedAttachment(blob, `Plan_${numRel}_${nombreAlumno}.pdf`);
                        atts.push(a);
                    }
                }

                if (selectedDocs.seguimiento) {
                    const blob = await crearSeguimiento(alumno, relacion);
                    if (blob) {
                        const a = await uploadGeneratedAttachment(blob, `Seguimiento_${numRel}_${nombreAlumno}.docx`);
                        atts.push(a);
                    }
                }

                if (selectedDocs.valoracion) {
                    const blob = await crearValoracion(alumno, relacion);
                    if (blob) {
                        const a = await uploadGeneratedAttachment(blob, `Valoracion_${numRel}_${nombreAlumno}.docx`);
                        atts.push(a);
                    }
                }

                if (selectedDocs.calendario) {
                    const blob = await crearCalendario(alumno, relacion);
                    if (blob) {
                        const a = await uploadGeneratedAttachment(blob, `Calendario_${numRel}_${nombreAlumno}.pdf`);
                        atts.push(a);
                    }
                }
            }

            if (selectedDocs.carta) {
                const blob = await crearCarta(relacion);
                if (blob) {
                    let nombreEmpresa = 'Empresa';
                    const convenio = convenios.find(c => c.id === relacion.convenioId);
                    if (convenio) nombreEmpresa = convenio.empresaNombre.replace(/\s+/g, '_');
                    const a = await uploadGeneratedAttachment(blob, `Carta_${numRel}_${nombreEmpresa}.pdf`);
                    atts.push(a);
                }
            }

            if (selectedDocs.relacion) {
                const blob = await crearDocumentoRelacion('pdf', relacion);
                if (blob) {
                    const a = await uploadGeneratedAttachment(blob, `Relacion_${numRel}.pdf`);
                    atts.push(a);
                }
            }
        }

        setEmailTo(Array.from(destinatarios));
        setEmailBcc([]);
        setEmailAttachments(atts);
        setContextualContactIds([]);
        setEmailSubject('');
        setEmailBody('');
        setShowEmailModal(true);
    };

    const handleEmailConPlantilla = async (relaciones: RelacionAlumno[], plantillaId: string) => {
        if (!relaciones.length) return;
        const cfg = getPlantillaById(plantillaId);
        if (!cfg) return;

        setIsPreparingEmail(true);
        setTargetEmailRelaciones([]);

        const atts: EmailAttachment[] = [];
        const destinatarios = new Set<string>();
        const contactIds: Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }> = [];

        for (const relacion of relaciones) {
            if (!relacion.alumnos?.length) continue;
            const numRel = relacion.numRelacion.replace(/\//g, '_');

            if (relacion.empresa?.id) contactIds.push({ type: 'empresa', id: relacion.empresa.id });
            if (relacion.tutorEmpresaId) contactIds.push({ type: 'tutor', id: relacion.tutorEmpresaId });
            for (const a of relacion.alumnos) {
                if (a.id) contactIds.push({ type: 'alumno', id: a.id });
            }

            // Destinatarios según la configuración de la plantilla
            if (cfg.recipientTarget === 'empresa') {
                if (relacion.empresa?.email) destinatarios.add(relacion.empresa.email);
            } else if (cfg.recipientTarget === 'tutor') {
                const tutor = tutores.find(t => t.id === relacion.tutorEmpresaId);
                if (tutor?.email) destinatarios.add(tutor.email);
                if (!tutor?.email && relacion.empresa?.email) destinatarios.add(relacion.empresa.email);
            } else if (cfg.recipientTarget === 'estudiante_conditional') {
                for (const alumno of relacion.alumnos) {
                    const estado = alumno.estadoPlanFormativo;
                    const esEstudiante = estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE || estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
                    if (esEstudiante) {
                        const email = alumno.emailEduca || alumno.emailPersonal;
                        if (email) destinatarios.add(email);
                    } else {
                        const tutor = tutores.find(t => t.id === relacion.tutorEmpresaId);
                        if (tutor?.email) destinatarios.add(tutor.email);
                    }
                }
            }

            // Documentos según la configuración de la plantilla
            for (const doc of cfg.documents) {
                if (doc === 'relacion') {
                    const blob = await crearDocumentoRelacion('pdf', relacion);
                    if (blob) {
                        atts.push(await uploadGeneratedAttachment(blob, `Relacion_${numRel}.pdf`));
                    }
                }

                if (doc === 'plan') {
                    for (const alumno of relacion.alumnos) {
                        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
                        const blob = await crearPlanFormativo('pdf', alumno, relacion);
                        if (blob) {
                            atts.push(await uploadGeneratedAttachment(blob, `Plan_${numRel}_${nombreAlumno}.pdf`));
                        }
                    }
                }

                if (doc === 'seguimiento') {
                    for (const alumno of relacion.alumnos) {
                        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
                        const blob = await crearSeguimiento(alumno, relacion);
                        if (blob) {
                            atts.push(await uploadGeneratedAttachment(blob, `Seguimiento_${numRel}_${nombreAlumno}.docx`));
                        }
                    }
                }

                if (doc === 'valoracion') {
                    for (const alumno of relacion.alumnos) {
                        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
                        const blob = await crearValoracion(alumno, relacion);
                        if (blob) {
                            atts.push(await uploadGeneratedAttachment(blob, `Valoracion_${numRel}_${nombreAlumno}.docx`));
                        }
                    }
                }

                if (doc === 'calendario') {
                    for (const alumno of relacion.alumnos) {
                        const nombreAlumno = `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_');
                        const blob = await crearCalendario(alumno, relacion);
                        if (blob) {
                            atts.push(await uploadGeneratedAttachment(blob, `Calendario_${numRel}_${nombreAlumno}.pdf`));
                        }
                    }
                }

                if (doc === 'carta') {
                    const blob = await crearCarta(relacion);
                    if (blob) {
                        let nombreEmpresa = 'Empresa';
                        const convenio = convenios.find(c => c.id === relacion.convenioId);
                        if (convenio) nombreEmpresa = convenio.empresaNombre.replace(/\s+/g, '_');
                        atts.push(await uploadGeneratedAttachment(blob, `Carta_${numRel}_${nombreEmpresa}.pdf`));
                    }
                }
            }
        }

        setIsPreparingEmail(false);

        const primeraRelacion = relaciones.find(r => r.alumnos?.length);
        const nombreEmpresa = primeraRelacion
            ? (convenios.find(c => c.id === primeraRelacion.convenioId)?.empresaNombre ?? primeraRelacion.empresa?.nombre ?? '')
            : '';
        const tutor = primeraRelacion ? tutores.find(t => t.id === primeraRelacion.tutorEmpresaId) : undefined;
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const nombreProfesor = profesor ? `${profesor.nombre} ${profesor.apellidos}` : '';
        const listaAlumnos = relaciones
            .flatMap(r => r.alumnos || [])
            .map(a => `${a.nombre} ${a.apellidos}`)
            .filter(Boolean);
        const nombresUnicos = [...new Set(listaAlumnos)];
        const nombreApellidosAlumnos = nombresUnicos.length <= 1
          ? nombresUnicos.join(', ')
          : nombresUnicos.slice(0, -1).join(', ') +
            (nombresUnicos[nombresUnicos.length - 1].startsWith('I') || nombresUnicos[nombresUnicos.length - 1].startsWith('Í')
              ? ' e '
              : ' y ') +
            nombresUnicos[nombresUnicos.length - 1];
        const direccion = primeraRelacion?.empresa?.direccion ?? '';

        const contactoEmpresa = primeraRelacion?.empresa?.personaContacto || `persona de contacto de ${nombreEmpresa}`;

        let alumnoTutor = '';
        if (plantillaId === 'plan' && primeraRelacion?.alumnos?.length) {
            const firstAlumno = primeraRelacion.alumnos[0];
            const estado = firstAlumno.estadoPlanFormativo;
            const esEstudiante = estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE || estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
            if (esEstudiante) {
                alumnoTutor = nombreApellidosAlumnos;
            } else {
                const tutor = tutores.find(t => t.id === primeraRelacion.tutorEmpresaId);
                alumnoTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
            }
        }

        const bodyInterpolado = interpolateBody(cfg.body, {
            nombreTutor,
            nombreEmpresa,
            contactoEmpresa,
            nombreProfesor,
            nombreApellidosAlumnos,
            alumnoTutor,
            Dirección: direccion,
        });

        setEmailTo(Array.from(destinatarios));
        setEmailBcc([]);
        setEmailAttachments(atts);
        setEmailSubject(cfg.subject);
        setEmailBody(bodyInterpolado);
        setContextualContactIds(contactIds);
        setShowEmailModal(true);
    };

    // ─────────────────────────────────────────
    //  RETURN
    // ─────────────────────────────────────────

    return {
        // Datos
        relaciones, convenios, alumnos, tutores, curso, centroFestivos, profesor,
        usarFestivos, usarFestivosEmpresa, empresaFestivosActuales,
        modoCreacion, carpetaEstudiante,
        // Listado UI
        selectedRelacion, setSelectedRelacion,
        showDeleteConfirm, setShowDeleteConfirm,
        listSearchTerm, setListSearchTerm,
        statusFilters, setStatusFilters,
        dateFilters, setDateFilters, clearFilters,
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
        applyTargetEndDate, applyStartDateToAll, applyBulkHorario, updateFirma,
        // Handlers estados
        advanceStatus, moveBackStatus,
        advancePlanStatus, moveBackPlanStatus,
        advancePlanStatusIndividual, moveBackPlanStatusIndividual,
        advanceSeguimientoStatusIndividual, moveBackSeguimientoStatusIndividual,
        advanceValoracionStatusIndividual, moveBackValoracionStatusIndividual,
        // Handlers estadísticas
        showEstadisticaModal, setShowEstadisticaModal,
        estadisticaEmpresaNombre, estadisticaCurso, estadisticaNumAlumnos,
        estadisticaContratados, setEstadisticaContratados,
        estadisticaValoracion, setEstadisticaValoracion,
        handleOpenEstadistica, handleEstadisticaSubmit,
        // Descargas
        descargarRelacion, descargarPlanFormativo,
        descargarSeguimiento, descargarValoracion,
        descargarCarta, descargarCalendario, handleDescargarTodo,
        isDownloadingMasivo, downloadProgress, downloadStatus,
        targetDownloadRelaciones, setTargetDownloadRelaciones, setSelectedDocs, selectedDocs,
        // Email
        showEmailModal, setShowEmailModal,
        emailTo, emailBcc, emailAttachments, setEmailAttachments, contextualContactIds,
        emailSubject, setEmailSubject,
        emailBody, setEmailBody,
        handleEmailConRelacion, handleEmailConPlanFormativo,
        handleEmailConSeguimiento, handleEmailConValoracion,
        handleEmailConCarta, handleEmailConCalendario,
        handleEmailConTodo, handleEmailConPlantilla,
        isPreparingEmail,
        targetEmailRelaciones, setTargetEmailRelaciones,
    };

}