import {useEffect, useMemo, useRef, useState} from 'react';
import JSZip from 'jszip';
import {
    Alumno,
    AnulacionPreview,
    Convenio,
    Curso,
    EmpresaEstadistica,
    FirmaTipo,
    HorarioSemanal,
    PlanFormativoEstado,
    Profesor,
    RelacionAlumno,
    RelacionEstado,
    SeguimientoEstado,
    SelectedDocs,
    TutorEmpresa,
    ValoracionEstado
} from '../../../types/index.ts';
import {
    DEFAULT_HORARIO,
    getNextPlanEstado,
    getNextRelacionEstado,
    getNextSeguimientoEstado,
    getNextValoracionEstado,
    getPrevPlanEstado,
    getPrevRelacionEstado,
    getPrevSeguimientoEstado,
    getPrevValoracionEstado
} from '../utils/relacionesUtils.ts';
import {EmailAttachment} from '../../../types/email.ts';
import {crearResolutorFechas} from '../../../lib/calculoFechas.ts';
import {
    aplicarPersonalizados,
    deltaPersonalizados,
    festivosHeredados,
} from '../../../lib/festivosAlumno.ts';
import {uploadGeneratedAttachment} from '../../../utils/emailUtils.ts';
import {adjuntoDesdeGestor, type TipoDocCorreo} from '../../../utils/emailAdjuntos.ts';
import {mostrarToast} from '../../../utils/toast.ts';
import {applyCustomMarkers, interpolarCuerpo} from '../../../../templates/emails/emailTemplates.ts';

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

export function useRelaciones(cursoId: number, detalleAcademicoId?: number, profesor?: Profesor, preloadRelacion?: { empresaId: number; alumnoIds: number[] } | null) {

    // ── Datos del servidor ──
    const [relaciones, setRelaciones] = useState<RelacionAlumno[]>([]);
    const [convenios, setConvenios] = useState<(Convenio & { empresaNombre: string; empresaCiudad?: string; centroNombre?: string })[]>([]);
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [tutores, setTutores] = useState<TutorEmpresa[]>([]);
    const [curso, setCurso] = useState<Curso | null>(null);
    const [centroFestivos, setCentroFestivos] = useState<string[]>([]);
    const [usarFestivos, setUsarFestivos] = useState(true);
    const [usarFestivosEmpresa, setUsarFestivosEmpresa] = useState(false);
    const [empresaFestivosMap, setEmpresaFestivosMap] = useState<Record<string, string[]>>({});
    const [empresaFestivosActuales, setEmpresaFestivosActuales] = useState<string[]>([]);

    // Resolvedor de fechas con la configuracion de festivos ya atada. Antes
    // cada calculo repetia a mano los siete argumentos.
    const resolutorFechas = useMemo(
        () => crearResolutorFechas({
            centroFestivos,
            usarFestivos,
            empresaFestivos: empresaFestivosActuales,
            usarFestivosEmpresa,
        }),
        [centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa],
    );
    const [modoCreacion, setModoCreacion] = useState('descargar');
    const [carpetaEstudiante, setCarpetaEstudiante] = useState(false);

    // ── Configuración anexo de relación ──
    const [anexoRelacionModo, setAnexoRelacionModo] = useState('app');
    const [anexoRelacionUrl, setAnexoRelacionUrl] = useState('');

    // ── UI de listado ──
    const [selectedRelacion, setSelectedRelacion] = useState<RelacionAlumno | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [anularAlumno, setAnularAlumno] = useState<{ rel: RelacionAlumno; alumnoId: number } | null>(null);
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
        try {
            const relParams = new URLSearchParams();
            if (detalleAcademicoId) relParams.set('detalleAcademicoId', String(detalleAcademicoId));
            const convParams = new URLSearchParams({cursoId: String(cursoId)});
            const alumParams = new URLSearchParams({cursoId: String(cursoId)});
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
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => { fetchData(); }, [cursoId, detalleAcademicoId]);
    useEffect(() => { setSelectedRelacion(null); }, [cursoId, detalleAcademicoId]);

    // ── Pre-carga desde match en Intereses ──
    const preloadProcessed = useRef(false);
    const preloadData = useRef(preloadRelacion);
    useEffect(() => {
        if (!preloadRelacion) {
            preloadProcessed.current = false;
            preloadData.current = null;
            return;
        }
        preloadData.current = preloadRelacion;
        const { empresaId, alumnoIds } = preloadRelacion;

        if (!preloadProcessed.current) {
            preloadProcessed.current = true;
            setEditing(null);
            setSelectedAlumnosIds([]);
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

            // Buscar el convenio de la empresa via API (los datos pueden no estar cargados aún)
            fetch(`/api/convenios?cursoId=${cursoId}`)
                .then(r => r.json())
                .then((convs: any[]) => {
                    if (preloadData.current !== preloadRelacion) return;
                    const found = convs.find((c: any) => c.empresaId === empresaId);
                    if (found) {
                        setFormData(prev => ({ ...prev, convenioId: found.id }));
                        setSearchTermConvenio(`${found.empresaNombre || ''} (Ref: ${found.numConvenio})`);
                    }
                });

            setShowForm(true);
        }

        // Pre-seleccionar alumnos (se ejecuta también cuando ctx.alumnos se cargue después)
        const formAlumnos: any[] = [];
        for (const id of alumnoIds) {
            const alumnoObj = alumnos.find(a => a.id === id);
            if (alumnoObj) {
                formAlumnos.push({
                    ...alumnoObj,
                    totalHorasFFE: alumnoObj.totalHorasFFE ?? 500,
                    fechaInicio: '',
                    fechaFin: '',
                });
            }
        }
        if (formAlumnos.length > 0) {
            setFormData(prev => ({ ...prev, alumnos: formAlumnos }));
            setSelectedAlumnosIds(prev => {
                const newIds = alumnoIds.filter(id => !prev.includes(id));
                return newIds.length > 0 ? [...prev, ...newIds] : prev;
            });
        }

        // Tutor automático si solo hay 1
        if (tutores.length === 1) {
            setFormData(prev => ({ ...prev, tutorEmpresaId: tutores[0].id }));
        }
    }, [preloadRelacion, alumnos, tutores]);

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

    // Cargar configuración del anexo de relación
    useEffect(() => {
        fetch('/api/profesor/config/anexo-relacion')
            .then(r => r.json())
            .then(data => {
                setAnexoRelacionModo(data.modo || 'app');
                setAnexoRelacionUrl(data.url || '');
            })
            .catch(() => {});
    }, []);

    const anexoRelacionExterno = anexoRelacionModo === 'externo';

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
                    const endDate = resolutorFechas.calcularFechaFin(ar.fechaInicio || '', ar.totalHorasFFE, prev.horario);
                    return endDate ? { ...ar, fechaFin: endDate } : ar;
                }),
            }));
        }
    }, [formData.horario, resolutorFechas]);

    // ─────────────────────────────────────────
    //  LÓGICA DEL FORMULARIO
    // ─────────────────────────────────────────

    /**
     * Vaciar lo que el usuario ha ido escogiendo en el formulario.
     *
     * `selectedAlumnosIds` no es solo memoria de lo añadido: el selector de
     * alumnos esconde a quien ya esté en la lista, y lo hace para que no se
     * pueda añadir dos veces al mismo. Ese filtro solo tiene sentido mientras
     * el borrador está abierto. Si sobrevive a un cancelar, el alumno elegido en
     * el borrador que se abandonó sigue apareciendo como "ya está en la
     * relación" y desaparece del selector el resto de la vida de la página:
     * para volver a elegirlo hay que recargar, porque `alumnos` viene del
     * servidor y su `relacionId` sigue vacío.
     *
     * Se vacía al cerrar y también al abrir, porque las dos rutas tienen que
     * dejar el mismo borrador limpio: si el formulario se cerrara por otra vía
     * que no pase por aquí, quedaría a medias otra vez.
     */
    const limpiarBorradorAlumnos = () => {
        setSelectedAlumnosIds([]);
        setSearchTermAlumno('');
    };

    /** Cerrar el formulario es descartar el borrador, no solo esconderlo. */
    const closeForm = () => {
        setShowForm(false);
        setFestivosAlumnoId(null);
        limpiarBorradorAlumnos();
    };

    const handleOpenForm = (rel: RelacionAlumno | null) => {
        // Empezar siempre de cero. Ver `limpiarBorradorAlumnos`.
        limpiarBorradorAlumnos();
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
                closeForm();
                setEditing(null);
                await fetchData();
            } else {
                const err = await res.json().catch(() => ({error: 'Error desconocido'}));
                alert(err.error || 'Error al guardar la relación');
            }
        } catch (error) {
            console.error('Error guardando relación:', error);
            mostrarToast('No se pudo guardar la relación: error de conexión con el servidor.', 'error');
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

    // ── ANULACIÓN FFE ──
    const previewAnulacionFFE = async (alumnoId: number, fecha: string): Promise<AnulacionPreview | null> => {
        try {
            const res = await fetch(`/api/alumnos/${alumnoId}/anular-ffe/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fecha }),
            });
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    };

    const handleAnularFFE = async (alumnoId: number, fecha: string, motivo: string) => {
        const res = await fetch(`/api/alumnos/${alumnoId}/anular-ffe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, motivo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al anular la FFE');
        // Si el alumno anulado estaba en la relación seleccionada, la cerramos
        if (selectedRelacion?.alumnos?.some(a => a.id === alumnoId)) setSelectedRelacion(null);
        setAnularAlumno(null);
        await fetchData();
        return data;
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

    // ── Dias no lectivos propios de cada alumno ──
    //
    // El modal de festivos trabaja con la lista efectiva (los dias que el alumno
    // no asiste) porque es lo que se ve y lo que se desmarca. Lo que se guarda
    // es solo el desvío respecto a los festivos heredados, que es lo que hace
    // que un festivo nuevo del centro llegue a todos sin tocar sus filas.
    const [festivosAlumnoId, setFestivosAlumnoId] = useState<number | null>(null);

    // La lista con la que se siembra el modal: los festivos heredados de este
    // convenio (los del centro y los de la ciudad de la empresa, segun los
    // interruptores) mas lo que ese alumno ya tiene desfasado.
    const festivosConvenio = useMemo(
        () => festivosHeredados({
            centro: centroFestivos,
            usarCentro: usarFestivos,
            empresa: empresaFestivosActuales,
            usarEmpresa: usarFestivosEmpresa,
        }),
        [centroFestivos, usarFestivos, empresaFestivosActuales, usarFestivosEmpresa]
    );

    const festivosEfectivosAlumno = (id: number): string[] => {
        const alu = (formData.alumnos || []).find(a => a.id === id);
        return aplicarPersonalizados(festivosConvenio, alu?.festivosPersonalizados);
    };

    // El nombre va en el subtitulo del modal de dias, para que se sepa a quien
    // se le estan editando sin tener que cerrar el formulario de la relacion.
    // El numero de dias propios no va aqui: el modal lo recalcula en vivo
    // mientras se edita, y un numero aqui se quedaria en el valor guardado,
    // contradiciendo a los dias que se verian marcados delante.
    const festivosAlumnoNombre = useMemo(() => {
        const alu = (formData.alumnos || []).find(a => a.id === festivosAlumnoId);
        if (!alu) return '';
        return `${alu.nombre ?? ''} ${alu.apellidos ?? ''}`.trim();
    }, [formData.alumnos, festivosAlumnoId]);

    /**
     * Que pasaria con este alumno si se guardaran estos dias, sin guardarlos.
     *
     * Lo que el editor necesita para ir diciendo cuanto se mueve la fecha fin
     * mientras se tocan los dias. Devuelve el desvio ademas de la fecha porque
     * es el mismo calculo que hace el guardado, y se calcula una sola vez aqui
     * para que la cifra que enseña el editor sea exactamente la que se va a
     * guardar. Si se calculara en los dos sitios, cualquier diferencia entre
     * ambos haria que el editor prometiese una fecha y se guardara otra.
     */
    const desvioYFinAlumno = (id: number, efectivos: string[]) => {
        const alu = (formData.alumnos || []).find(a => a.id === id);
        if (!alu) return null;
        const desvio = deltaPersonalizados(festivosConvenio, efectivos);
        return {
            desvio,
            fechaFin: resolutorFechas.calcularFechaFin(
                alu.fechaInicio || '', alu.totalHorasFFE || 0, formData.horario, desvio
            ),
        };
    };

    /**
     * Guarda la lista que devuelve el modal como desvío del alumno.
     *
     * Se guarda el desvío y no la lista entera a proposito: si el profesor
     * desmarca un festivo heredado, eso es un `QUITAR`, y si añade un dia
     * suelto, es un `ANADIR`. Aplicar despues el desvío sobre la lista
     * heredada devuelve exactamente lo que se marcó.
     */
    const saveFestivosAlumno = (id: number, efectivos: string[]) => {
        const calculo = desvioYFinAlumno(id, efectivos);
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                if (a.id !== id || !calculo) return a;
                return {
                    ...a,
                    festivosPersonalizados: calculo.desvio,
                    // Los dias propios cambian cuantas horas se consumen, asi que
                    // la fecha fin se recalcula aqui y no espera a guardar.
                    fechaFin: calculo.fechaFin || a.fechaFin,
                };
            }),
        }));
        setFestivosAlumnoId(null);
    };

    /**
     * La previsualizacion del editor de dias, en forma de funcion pura sobre la
     * lista efectiva. No guarda nada; el guardado es `saveFestivosAlumno`.
     */
    const previewFestivosAlumno = (id: number, efectivos: string[]): { fechaFin: string | null; diasPropios: number } => {
        const calculo = desvioYFinAlumno(id, efectivos);
        return {
            fechaFin: calculo?.fechaFin ?? null,
            diasPropios: calculo?.desvio.length ?? 0,
        };
    };

    const updateStudentHours = (id: number, hours: number) => {
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                if (a.id !== id) return a;
                const newEndDate = resolutorFechas.calcularFechaFin(a.fechaInicio || '', hours, prev.horario, a.festivosPersonalizados);
                return { ...a, totalHorasFFE: hours, fechaFin: newEndDate || a.fechaFin };
            }),
        }));
    };

    const updateStudentStartDate = (id: number, date: string) => {
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                if (a.id !== id) return a;
                const newEndDate = resolutorFechas.calcularFechaFin(date, a.totalHorasFFE || 0, prev.horario, a.festivosPersonalizados);
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
                fechaInicio: resolutorFechas.calcularFechaInicio(targetEndDate, a.totalHorasFFE, prev.horario, a.festivosPersonalizados) || a.fechaInicio,
                fechaFin: targetEndDate,
            })),
        }));
    };

    const applyStartDateToAll = () => {
        if (!targetStartDate) return;
        setFormData(prev => ({
            ...prev,
            alumnos: (prev.alumnos || []).map(a => {
                const endDate = resolutorFechas.calcularFechaFin(targetStartDate, a.totalHorasFFE || 0, prev.horario, a.festivosPersonalizados);
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
        try {
            const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rel, estado: nextEstado }),
            });
            if (res.ok) {
                setSelectedRelacion({ ...rel, estado: nextEstado });
                fetchData();
            } else {
                mostrarToast('Error al avanzar el estado', 'error');
            }
        } catch (error) {
            console.error('Error al avanzar estado:', error);
            mostrarToast('Error al avanzar el estado', 'error');
        }
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
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?t=${Date.now()}&raw=1` : `${baseUrl}?t=${Date.now()}&raw=1`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const blob = await response.blob();
            return blob;
        } catch (error) { alert(`Error al descargar el plan.`); }

    };

    const descargarRelacion = async (tipo: 'docx' | 'pdf') => {
        if (anexoRelacionExterno) return;
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
        const url = tipo === 'pdf' ? `${baseUrl}/pdf?alumnoId=${alumno.id}&t=${Date.now()}&raw=1` : `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}&raw=1`;
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
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}&raw=1`;
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
        const url = `${baseUrl}?t=${Date.now()}&raw=1`;
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
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}&raw=1`;
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
        const url = `${baseUrl}?alumnoId=${alumno.id}&t=${Date.now()}&raw=1`;
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

            const relacionSeleccionada = !anexoRelacionExterno && !!selectedDocs.relacion;

            const numDocsAlumno = docsAlumno.filter(k => selectedDocs[k as keyof typeof selectedDocs]).length;
            const numDocsGeneral = docsRelacion.filter(k => k === 'relacion'
                ? relacionSeleccionada
                : selectedDocs[k as keyof typeof selectedDocs]).length;
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
                    if (relacionSeleccionada) {
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
            //
            // Se cuenta por FICHERO, no por tipo de documento: el plan
            // formativo genera un PDF y un DOCX, y la relación también. Antes
            // el total contaba un tipo mientras la barra solo avanzaba con el
            // DOCX, de modo que se quedaba muy por debajo del 100 %.
            const ficherosPorAlumno =
                (selectedDocs.plan ? 2 : 0)
                + (selectedDocs.seguimiento ? 1 : 0)
                + (selectedDocs.valoracion ? 1 : 0)
                + (selectedDocs.calendario ? 1 : 0);
            const ficherosPorRelacion =
                (relacionSeleccionada ? 2 : 0)
                + (selectedDocs.carta ? 1 : 0);

            let totalOperaciones = 0;
            relaciones.forEach(rel => {
                const alumnosValidos = rel.alumnos?.filter(a => a.relacionId) || [];
                totalOperaciones += (alumnosValidos.length * ficherosPorAlumno) + ficherosPorRelacion;
            });

            let operacionesCompletadas = 0;
            const reportarProgreso = (mensaje: string) => {
                operacionesCompletadas++;
                // min(90) como red de seguridad: si el recuento se desajusta,
                // la barra no puede sobrepasar el tramo de generación.
                const porcentaje = totalOperaciones > 0
                    ? Math.min(90, (operacionesCompletadas / totalOperaciones) * 90)
                    : 90;
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
                            // Avanza tanto si sale como si falla: si no, la
                            // barra se queda parada en ese documento.
                            reportarProgreso(`Plan Formativo (PDF): ${alumno.apellidos}`);
                        });
                        tareas.push(async () => tarea);


                        // --- 2. PLAN FORMATIVO DOCX ---
                        const tareaDoc = crearPlanFormativo('docx', alumno, relacion).then((blob) => {
                            if (blob) { // Si no falló y tenemos el archivo
                                targetFolder?.file(`Plan_Formativo_${alumno.apellidos}.docx`, blob);
                            }
                            reportarProgreso(`Plan Formativo: ${alumno.apellidos}`);
                        });
                        tareas.push(async () => tareaDoc);

                    }


                    // --- 3. FICHA DE SEGUIMIENTO ---
                    if (selectedDocs.seguimiento) {
                        const tarea = crearSeguimiento(alumno, relacion).then((blob) => {
                            if (blob) {
                                targetFolder?.file(`Ficha_Seguimiento_${alumno.apellidos}.docx`, blob);
                            }
                            reportarProgreso(`Ficha Seguimiento: ${alumno.apellidos}`);
                        });
                        tareas.push(async () => tarea);
                    }

                    // ---4. VALORACIÓN FINAL ---
                    if (selectedDocs.valoracion) {
                        const tarea = crearValoracion(alumno, relacion).then((blob) => {
                            if (blob) {
                                targetFolder?.file(`Valoracion_Final_${alumno.apellidos}.docx`, blob);
                            }
                            reportarProgreso(`Valoración Final: ${alumno.apellidos}`);
                        });
                        tareas.push(async () => tarea);
                    }

                    // ---5. CALENDARIO ---
                    if (selectedDocs.calendario) {
                        const tarea = crearCalendario(alumno, relacion).then((blob) => {
                            if (blob) {
                                targetFolder?.file(`Calendario_${alumno.apellidos}.pdf`, blob);
                            }
                            reportarProgreso(`Calendario: ${alumno.apellidos}`);
                        });
                        tareas.push(async () => tarea);
                    }

                }

                if (numDocsGeneral > 0 && relacion) {

                    if (relacionSeleccionada) {
                        // ---6. RELACION PDF---
                        // Usamos tu función crearDocumentoRelacion
                        const tarea = crearDocumentoRelacion('pdf', relacion).then((blob) => {
                            if (blob) {
                                mainFolder?.file(`Relacion_${numRelacionLimpio}.pdf`, blob);
                            }
                            reportarProgreso(`Relacion_${numRelacionLimpio} (PDF)`);
                        });
                        tareas.push(async () => tarea);

                        // ---7. RELACION DOCX---
                        const tareaDocx = crearDocumentoRelacion('docx', relacion).then((blob) => {
                            if (blob) {
                                mainFolder?.file(`Relacion_${numRelacionLimpio}.docx`, blob);
                            }
                            reportarProgreso(`Relacion_${numRelacionLimpio}`);
                        });
                        tareas.push(async () => tareaDocx);
                    }

                    if (selectedDocs.carta) {
                        // ---8. CARTA ---
                        const tarea = crearCarta(relacion).then((blob) => {
                            if (blob) {
                                mainFolder?.file(`Carta.pdf`, blob);
                            }
                            reportarProgreso(`Carta: ${numRelacionLimpio}`);
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
    /** Sustitución de `{{@...}}` por destinatario. Vacío si la plantilla no los usa. */
    const [emailPerRecipient, setEmailPerRecipient] = useState<Record<string, Record<string, string>>>({});
    /**
     * Marcadores que quedaron sin valor y salieron como hueco.
     *
     * Se avisa en el modal antes de enviar: el correo ya va a salir con el hueco,
     * pero el profesor tiene que enterarse de que «Estimado/a, » va sin nombre,
     * y no descubrirlo cuando la empresa conteste.
     */
    const [emailMarcadoresVacios, setEmailMarcadoresVacios] = useState<string[]>([]);

    /**
     * Los documentos que cuelgan de una relación.
     *
     * El catálogo `TipoDocCorreo` incluye el del convenio, que vive en su propio
     * gestor documental y lo resuelve la pantalla de Convenios. Aquí no tiene
     * sentido ni el nombre del archivo (que saldría con el número de relación) ni
     * la autogeneración (que no existe para él), así que el ámbito se declara
     * aparte en vez de ampliar el mapa de prefijos con un caso imposible.
     */
    type DocDeRelacion = Exclude<TipoDocCorreo, 'convenio'>;

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

    /**
     * Nombres del alumnado, unidos con comas y con "y" o "e" al final.
     *
     * Se de-duplican porque las relaciones repiten a un mismo alumno cuando hay
     * más de una relación en la lista, y sin quitarlo el correo lo nombraría dos
     * veces.
     */
    const unirNombres = (lista: string[]) => {
        const nombres = [...new Set(lista)];
        if (nombres.length <= 1) return nombres.join(', ');
        return nombres.slice(0, -1).join(', ') +
            (nombres[nombres.length - 1].startsWith('I') || nombres[nombres.length - 1].startsWith('Í')
                ? ' e '
                : ' y ') +
            nombres[nombres.length - 1];
    };

    const buildPlaceholders = (relacion: RelacionAlumno, alumno?: Alumno, contactoOverride?: string) => {
        const empresa = relacion.empresa;
        const convenio = convenios?.find(c => c.id === relacion.convenioId);
        const nombreEmpresa = convenio?.empresaNombre ?? empresa?.nombre ?? '';
        const tutor = tutores?.find(t => t.id === relacion.tutorEmpresaId);
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const contactoEmpresa = empresa?.personaContacto || `persona de contacto de ${nombreEmpresa}`;
        const listaAlumnos = (relacion.alumnos || [])
            .map(a => `${a.nombre} ${a.apellidos}`)
            .filter(Boolean);
        const nombreApellidosAlumnos = unirNombres(listaAlumnos);
        const direccion = empresa?.direccion ?? '';

        // A quién se dirige el correo. El plan formativo es el único que puede
        // ir al alumno, y solo mientras lo tiene pendiente de firma: en cuanto
        // lo firma, el destinatario es el tutor.
        const esPendienteEstudiante = alumno
            ? alumno.estadoPlanFormativo === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE
            || alumno.estadoPlanFormativo === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE
            : false;
        const alumnoTutor = esPendienteEstudiante && alumno
            ? `${alumno.nombre} ${alumno.apellidos}`
            : nombreTutor;

        const contacto = contactoOverride ?? (alumno ? `${alumno.nombre} ${alumno.apellidos}` : nombreTutor);

        const context: Record<string, any> = {
            profesor: profesor ? { nombre: profesor.nombre, apellidos: profesor.apellidos } : null,
            empresa: empresa ? { nombre: nombreEmpresa, direccion, personaContacto: contactoEmpresa } : null,
            tutor: tutor ? { nombre: tutor.nombre, apellidos: tutor.apellidos } : null,
            // El centro y el curso vienen del convenio, no de la relación: es lo
            // único que los dos tienen en común. Antes se podían escribir en una
            // plantilla y no salían nunca.
            centro: convenio?.centroNombre ? { nombre: convenio.centroNombre } : null,
            curso: curso ? { descripcion: curso.descripcion } : null,
            relacion: { numRelacion: relacion.numRelacion || '' },
            nombreApellidosAlumnos,
            alumnoTutor,
        };
        return { context, nombreEmpresa, nombreTutor, contacto, contactoEmpresa };
    };

    /**
     * Datos que el modal de correo sustituye por destinatario (`{{@contacto}}`,
     * `{{@nombreEmpresa}}`).
     *
     * Van indexados por correo porque cada destinatario recibe el suyo. Antes
     * este flujo no rellenaba nada y el modal, al no encontrar su marca,
     * borraba los marcadores en silencio: la plantilla se escribía, el correo
     * salía con el hueco vacío y no había ni rastro ni aviso.
     */
    const perRecipientDeRelaciones = (
        relaciones: RelacionAlumno[],
        primera: { nombreEmpresa: string; nombreTutor: string; contacto: string }
    ): Record<string, Record<string, string>> => {
        const porCorreo: Record<string, Record<string, string>> = {};

        const anotar = (correo: string | undefined, nombreEmpresa: string, contacto: string) => {
            if (!correo) return;
            porCorreo[correo] = { nombreEmpresa, contacto };
        };

        for (const relacion of relaciones) {
            const empresa = relacion.empresa;
            const convenio = convenios?.find(c => c.id === relacion.convenioId);
            const nombreEmpresa = convenio?.empresaNombre ?? empresa?.nombre ?? '';
            const tutor = tutores?.find(t => t.id === relacion.tutorEmpresaId);
            const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';

            anotar(empresa?.email, nombreEmpresa, empresa?.personaContacto || `persona de contacto de ${nombreEmpresa}`);
            anotar(tutor?.email, nombreEmpresa, nombreTutor);

            for (const alumno of relacion.alumnos || []) {
                const estado = alumno.estadoPlanFormativo;
                const aAlumno = estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE
                    || estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
                if (aAlumno) {
                    anotar(alumno.emailEduca || alumno.emailPersonal, nombreEmpresa, `${alumno.nombre} ${alumno.apellidos}`);
                }
            }
        }

        // Cuando varias relaciones comparten el mismo correo de empresa, gana la
        // principal. Se vuelve a calcular su contacto en vez de usar el de la
        // primera: aquí `contacto` es el del envío (tutor o alumno según el
        // caso) y pisaba la persona de contacto de la empresa.
        const principal = relaciones.find(r => r.alumnos?.length);
        if (principal) {
            const nombreEmpresa = convenios?.find(c => c.id === principal.convenioId)?.empresaNombre
                ?? principal.empresa?.nombre
                ?? primera.nombreEmpresa;
            const contactoEmpresa = principal.empresa?.personaContacto
                || `persona de contacto de ${nombreEmpresa}`;
            anotar(principal.empresa?.email, nombreEmpresa, contactoEmpresa);
        }

        return porCorreo;
    };

    /**
     * La extensión tiene que ser la del blob que se manda, no la que se le
     * supone al tipo de documento. El profesor puede pedir la relación en DOCX,
     * y llamarla `.pdf` hacía que Word le abriera un PDF con una cabecera que no
     * correspondía (y al revés).
     */
    const nombreAdjunto = (
        tipo: DocDeRelacion,
        relacion: RelacionAlumno,
        alumno?: Alumno,
        formato?: 'docx' | 'pdf'
    ) => {
        const numRel = (relacion.numRelacion || '').replace(/\//g, '_');
        const quien = alumno
            ? `${alumno.nombre}_${alumno.apellidos}`.replace(/\s+/g, '_')
            : (convenios.find(c => c.id === relacion.convenioId)?.empresaNombre ?? 'Empresa').replace(/\s+/g, '_');
        const prefijo: Record<DocDeRelacion, string> = {
            relacion: 'Relacion', plan: 'Plan', seguimiento: 'Seguimiento',
            valoracion: 'Valoracion', calendario: 'Calendario', carta: 'Carta',
        };
        const extension = formato
            ?? (tipo === 'seguimiento' || tipo === 'valoracion' ? 'docx' : 'pdf');
        return `${prefijo[tipo]}_${numRel}_${quien}.${extension}`;
    };

    /**
     * El adjunto de un documento, de la fuente que deba: el gestor documental
     * si el profesor tiene algo subido, y si no, el que genera la aplicación.
     *
     * `autogenerar` sabe hacerlo y devuelve `null` cuando no puede; entonces no
     * se adjunta nada. Ver `src/utils/emailAdjuntos.ts`, donde está el porqué de
     * este orden.
     */
    const adjuntar = async (
        tipo: DocDeRelacion,
        relacion: RelacionAlumno,
        alumno: Alumno | undefined,
        autogenerar: () => Promise<Blob | null>,
        formato?: 'docx' | 'pdf'
    ): Promise<EmailAttachment | null> => {
        if (relacion.id) {
            const delGestor = await adjuntoDesdeGestor(tipo, { relacionId: relacion.id, alumnoId: alumno?.id });
            if (delGestor) return delGestor;
        }
        const blob = await autogenerar();
        if (!blob) return null;
        return uploadGeneratedAttachment(blob, nombreAdjunto(tipo, relacion, alumno, formato));
    };

    const buildTemplateBody = async (plantillaId: string, placeholders: Record<string, any>) => {
        const res = await fetch(`/api/plantillas/by-plantilla-id/${plantillaId}`);
        if (!res.ok) return null;
        const cfg = await res.json();
        const marcadoresRes = await fetch('/api/marcadores-personalizados');
        const marcadores = marcadoresRes.ok ? await marcadoresRes.json() : [];
        const conPersonalizados = applyCustomMarkers(cfg.body, marcadores);
        const { texto, sinResolver } = interpolarCuerpo(conPersonalizados, placeholders);
        // El asunto se interpola también. Antes solo se hacía con el cuerpo, y un
        // `{{...}}` escrito en la línea de asunto llegaba así a la empresa.
        const { texto: asunto, sinResolver: sinResolverAsunto } = interpolarCuerpo(
            applyCustomMarkers(cfg.subject || '', marcadores),
            placeholders,
        );
        return { ...cfg, subject: asunto, body: texto, sinResolver: [...new Set([...sinResolver, ...sinResolverAsunto])] };
    };

    /**
     * Deja el modal de correo listo con todo lo que se ha calculado.
     *
     * Los seis envíos por documento hacen exactamente los mismos pasos, y cada
     * uno se olvidaba de alguno. Reunirlos aquí es lo que hace que el aviso de
     * marcadores vacíos y los `{{@...}}` aparezcan igual en todos, y no solo en
     * los que se tocan.
     */
    const abrirCorreo = (opts: {
        to: string[];
        bcc?: string[];
        attachments: Array<EmailAttachment | null>;
        cfg: { subject: string; body: string; sinResolver?: string[] };
        perRecipient?: Record<string, Record<string, string>>;
        /** Por defecto, los contactos de la relación abierta. El envío masivo
         *  lleva los suyos, que son los de todas las relaciones del lote. */
        contactIds?: Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }>;
    }) => {
        const { to, bcc = [], attachments, cfg, perRecipient = {}, contactIds } = opts;
        setEmailTo(to);
        setEmailBcc(bcc);
        // Un documento que no se pudo obtener deja hueco en vez de romper el envío.
        setEmailAttachments(attachments.filter((a): a is EmailAttachment => !!a));
        setContextualContactIds(contactIds ?? getContextualContactIds());
        setEmailSubject(cfg.subject);
        setEmailBody(cfg.body);
        setEmailPerRecipient(perRecipient);
        setEmailMarcadoresVacios(cfg.sinResolver || []);
        setShowEmailModal(true);
    };

    const perRecipientDeUna = (relacion: RelacionAlumno, alumno?: Alumno) => {
        // `contactoEmpresa` y no `contacto`: sin alumno, `contacto` cae al tutor,
        // y el correo a la empresa se abría saludando a Marta Gómez en lugar de
        // a la persona de contacto que consta en su ficha.
        const { nombreEmpresa, nombreTutor, contactoEmpresa } = buildPlaceholders(relacion, alumno);
        const correoAlumno = alumno && (
            alumno.estadoPlanFormativo === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE
            || alumno.estadoPlanFormativo === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE)
            ? alumno.emailEduca || alumno.emailPersonal
            : undefined;
        const datos: Record<string, Record<string, string>> = {};
        if (relacion.empresa?.email) datos[relacion.empresa.email] = { nombreEmpresa, contacto: contactoEmpresa };
        const tutor = tutores.find(t => t.id === relacion.tutorEmpresaId);
        if (tutor?.email) datos[tutor.email] = { nombreEmpresa, contacto: nombreTutor };
        if (correoAlumno && alumno) {
            datos[correoAlumno] = { nombreEmpresa, contacto: `${alumno.nombre} ${alumno.apellidos}` };
        }
        return datos;
    };

    const handleEmailConRelacion = async (tipo: 'docx' | 'pdf') => {
        if (!selectedRelacion) return;
        const { context } = buildPlaceholders(selectedRelacion);
        const cfg = await buildTemplateBody('relacion', context);
        if (!cfg) return;

        // El modo externo solo apaga la autogeneración, no la búsqueda. El
        // profesor tiene su propio documento, pero lo puede haber subido él
        // mismo al gestor documental, y si está ahí es el que hay que mandar:
        // el autogenerado no, porque es justo lo que el modo externo descarta.
        const att = await adjuntar(
            'relacion',
            selectedRelacion,
            undefined,
            () => (anexoRelacionExterno ? null : crearDocumentoRelacion(tipo, selectedRelacion)),
            tipo
        );

        // Si el documento no sale, el correo se abre igualmente y sin adjunto:
        // el profesor ve que falta, y decide. Cerrar el modal en silencio le
        // deja sin explicación de por qué no se puede mandar.
        abrirCorreo({
            to: getEmpresaEmail(),
            attachments: [att],
            cfg,
            perRecipient: perRecipientDeUna(selectedRelacion),
        });
    };

    const handleEmailConPlanFormativo = async (tipo: 'docx' | 'pdf', alumno: Alumno) => {
        if (!selectedRelacion) return;
        const { context } = buildPlaceholders(selectedRelacion, alumno);
        const cfg = await buildTemplateBody('plan', context);
        if (!cfg) return;

        const att = await adjuntar('plan', selectedRelacion, alumno, () =>
            crearPlanFormativo(tipo, alumno, selectedRelacion), tipo
        );
        const { to, bcc } = getPlanDestinatarios(alumno);
        abrirCorreo({
            to,
            bcc,
            attachments: [att],
            cfg,
            perRecipient: perRecipientDeUna(selectedRelacion, alumno),
        });
    };

    const handleEmailConSeguimiento = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const tutor = tutores.find(t => t.id === selectedRelacion.tutorEmpresaId);
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const { context } = buildPlaceholders(selectedRelacion, undefined, nombreTutor);
        const cfg = await buildTemplateBody('seg', context);
        if (!cfg) return;

        const att = await adjuntar('seguimiento', selectedRelacion, alumno, () =>
            crearSeguimiento(alumno, selectedRelacion)
        );
        abrirCorreo({
            to: getTutorEmail(),
            attachments: [att],
            cfg,
            perRecipient: perRecipientDeUna(selectedRelacion),
        });
    };

    const handleEmailConValoracion = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const tutor = tutores.find(t => t.id === selectedRelacion.tutorEmpresaId);
        const nombreTutor = tutor ? `${tutor.nombre} ${tutor.apellidos}` : '';
        const { context } = buildPlaceholders(selectedRelacion, undefined, nombreTutor);
        const cfg = await buildTemplateBody('val', context);
        if (!cfg) return;

        const att = await adjuntar('valoracion', selectedRelacion, alumno, () =>
            crearValoracion(alumno, selectedRelacion)
        );
        abrirCorreo({
            to: getTutorEmail(),
            attachments: [att],
            cfg,
            perRecipient: perRecipientDeUna(selectedRelacion),
        });
    };

    const handleEmailConCarta = async () => {
        if (!selectedRelacion) return;
        const convenio = convenios.find(c => c.id === selectedRelacion.convenioId);
        const nombreEmpresaLegible = convenio?.empresaNombre ?? selectedRelacion.empresa?.nombre ?? '';
        const lugarContacto = selectedRelacion.empresa?.personaContacto
            || `persona de contacto de ${nombreEmpresaLegible}`;
        const { context } = buildPlaceholders(selectedRelacion, undefined, lugarContacto);
        const cfg = await buildTemplateBody('carta-inicio', context);
        if (!cfg) return;

        const att = await adjuntar('carta', selectedRelacion, undefined, () =>
            crearCarta(selectedRelacion)
        );
        abrirCorreo({
            to: getEmpresaEmail(),
            attachments: [att],
            cfg,
            perRecipient: perRecipientDeUna(selectedRelacion),
        });
    };

    const handleEmailConCalendario = async (alumno: Alumno) => {
        if (!selectedRelacion) return;
        const { context } = buildPlaceholders(selectedRelacion, alumno);
        const cfg = await buildTemplateBody('cal', context);
        if (!cfg) return;

        const att = await adjuntar('calendario', selectedRelacion, alumno, () =>
            crearCalendario(alumno, selectedRelacion)
        );
        abrirCorreo({
            to: alumno.emailEduca ? [alumno.emailEduca] : [],
            attachments: [att],
            cfg,
            perRecipient: perRecipientDeUna(selectedRelacion, alumno),
        });
    };

    const handleEmailConPlantilla = async (relaciones: RelacionAlumno[], plantillaId: string) => {
        if (!relaciones.length) return;
        const res = await fetch(`/api/plantillas/by-plantilla-id/${plantillaId}`);
        if (!res.ok) return;
        const cfg = await res.json();

        setIsPreparingEmail(true);
        setTargetEmailRelaciones([]);

        try {
            const atts: EmailAttachment[] = [];
            const destinatarios = new Set<string>();
            const contactIds: Array<{ type: 'empresa' | 'tutor' | 'alumno'; id: number }> = [];

            for (const relacion of relaciones) {
                if (!relacion.alumnos?.length) continue;

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

                // Documentos según la configuración de la plantilla. Cada uno va
                // primero al gestor documental, y solo si no hay nada se genera.
                for (const doc of JSON.parse(cfg.documents || '[]') as TipoDocCorreo[]) {
                    // Una plantilla de relaciones solo puede pedir documentos de
                    // relación. El del convenio se resuelve en Convenios, contra su
                    // propio gestor; aquí no se busca ni se genera, y se dice de
                    // forma explícita en vez de dejarlo en que se caiga solo.
                    if (doc === 'convenio') continue;

                    // El anexo externo apaga la autogeneración de la relación,
                    // pero no su búsqueda en el gestor: si el profesor subió
                    // su versión ahí, esa es la que va, y es la buena.
                    const autogenerarRelacion = () => (anexoRelacionExterno ? null : crearDocumentoRelacion('pdf', relacion));

                    if (doc === 'relacion' || doc === 'carta') {
                        const att = await adjuntar(doc, relacion, undefined, () =>
                            doc === 'relacion'
                                ? autogenerarRelacion()
                                : crearCarta(relacion)
                        );
                        if (att) atts.push(att);
                        continue;
                    }

                    // Los otros cuatro son de un alumno, y van uno a uno.
                    for (const alumno of relacion.alumnos) {
                        const att = await adjuntar(doc, relacion, alumno, () => {
                            if (doc === 'plan') return crearPlanFormativo('pdf', alumno, relacion);
                            if (doc === 'seguimiento') return crearSeguimiento(alumno, relacion);
                            if (doc === 'valoracion') return crearValoracion(alumno, relacion);
                            if (doc === 'calendario') return crearCalendario(alumno, relacion);
                            return Promise.resolve(null);
                        });
                        if (att) atts.push(att);
                    }
                }
            }

            const primeraRelacion = relaciones.find(r => r.alumnos?.length);
            const { context, nombreEmpresa, nombreTutor, contacto } = buildPlaceholders(primeraRelacion || relaciones[0]);
            const cuerpo = await buildTemplateBody(plantillaId, context);
            if (!cuerpo) return;

            abrirCorreo({
                to: Array.from(destinatarios),
                attachments: atts,
                cfg: cuerpo,
                contactIds,
                perRecipient: perRecipientDeRelaciones(relaciones, { nombreEmpresa, nombreTutor, contacto }),
            });
        } finally {
            // Sin esto, un fallo a mitad de la generación deja el botón de
            // envío girando para siempre y no explica qué pasó.
            setIsPreparingEmail(false);
        }
    };

    // ─────────────────────────────────────────
    //  RETURN
    // ─────────────────────────────────────────

    return {
        // Datos
        relaciones, convenios, alumnos, tutores, curso, centroFestivos, profesor,
        usarFestivos, usarFestivosEmpresa, empresaFestivosActuales, setEmpresaFestivosActuales,
        modoCreacion, carpetaEstudiante,
        anexoRelacionModo, anexoRelacionExterno, anexoRelacionUrl,
        // Listado UI
        selectedRelacion, setSelectedRelacion,
        showDeleteConfirm, setShowDeleteConfirm,
        anularAlumno, setAnularAlumno,
        previewAnulacionFFE, handleAnularFFE,
        listSearchTerm, setListSearchTerm,
        statusFilters, setStatusFilters,
        dateFilters, setDateFilters, clearFilters,
        sortBy, setBy, sortOrder, setSortOrder,
        filteredAndSortedRelaciones,
        // Formulario UI
        showForm,
        editing, setEditing,
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
        handleOpenForm, handleSubmit, handleDelete, closeForm,
        addAlumnoToRelacion, removeAlumnoFromRelacion,
    updateStudentHours, updateStudentStartDate,
    festivosAlumnoId, setFestivosAlumnoId, festivosEfectivosAlumno, saveFestivosAlumno,
    previewFestivosAlumno,
        festivosAlumnoNombre,
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
        emailPerRecipient, emailMarcadoresVacios,
        handleEmailConRelacion, handleEmailConPlanFormativo,
        handleEmailConSeguimiento, handleEmailConValoracion,
        handleEmailConCarta, handleEmailConCalendario,
        handleEmailConPlantilla,
        isPreparingEmail,
        targetEmailRelaciones, setTargetEmailRelaciones,
        fetchData,
    };

}