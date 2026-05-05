import React, { useState, useEffect } from 'react';
import {
  Download, FileText, File as FilePdf, Plus, Edit2, Trash2, Calendar,
  ChevronRight, Building2, User, Hash, X, Info, ArrowLeftRight,
  Send, Clock, ShieldCheck, CheckCircle2, ArrowLeft, Loader2, Search
} from 'lucide-react';
import { RelacionAlumno, Convenio, TutorEmpresa, Empresa, RelacionEstado, PlanFormativoEstado, RelacionEstadoLabels, PlanFormativoEstadoLabels, Curso, HorarioSemanal, HorarioDia, Alumno } from '../types/index.ts';
import { BotonDescargaPDF } from '../components/BotonDescargaPDF.tsx';
import { BotonDescargaDOCX } from '../components/BotonDescargaDOCX.tsx';
import { CustomSelect } from '../components/CustomSelect.tsx';

interface Props {
  cursoId: number;
}

const DEFAULT_HORARIO_DIA: HorarioDia = { inicio: '08:00', fin: '17:00', horas: 8 };
const DEFAULT_HORARIO: HorarioSemanal = {
  lunes: { ...DEFAULT_HORARIO_DIA },
  martes: { ...DEFAULT_HORARIO_DIA },
  miercoles: { ...DEFAULT_HORARIO_DIA },
  jueves: { ...DEFAULT_HORARIO_DIA },
  viernes: { ...DEFAULT_HORARIO_DIA },
  sabado: { inicio: '00:00', fin: '00:00', horas: 0 },
  domingo: { inicio: '00:00', fin: '00:00', horas: 0 },
};

export default function RelacionesView({ cursoId }: Props) {
  const [relaciones, setRelaciones] = useState<RelacionAlumno[]>([]);
  const [convenios, setConvenios] = useState<(Convenio & { empresaNombre: string })[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [tutores, setTutores] = useState<TutorEmpresa[]>([]);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RelacionAlumno | null>(null);
  const [searchTermAlumno, setSearchTermAlumno] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [searchTermConvenio, setSearchTermConvenio] = useState('');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setBy] = useState<'empresa' | 'estado'>('empresa');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isConvenioDropdownOpen, setIsConvenioDropdownOpen] = useState(false);

  const [selectedRelacion, setSelectedRelacion] = useState<RelacionAlumno | null>(null);

  const [formData, setFormData] = useState<Partial<RelacionAlumno>>({
    alumnosRelacion: [],
    numRelacion: '',
    fechaInicio: '',
    fechaFin: '',
    horario: { ...DEFAULT_HORARIO },
    estado: RelacionEstado.PENDIENTE_ENVIAR_EMPRESA,
    estadoPlanFormativo: PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE
  });

  const fetchData = async () => {
    const [relRes, convRes, cursoRes, alumRes] = await Promise.all([
      fetch('/api/relaciones-alumnos'),
      fetch(`/api/convenios?cursoId=${cursoId}`),
      fetch(`/api/cursos`),
      fetch(`/api/alumnos?cursoId=${cursoId}`)
    ]);

    const allRelaciones = await relRes.json();
    const allConvenios = await convRes.json();
    const allCursos = await cursoRes.json();
    const allAlumnos = await alumRes.json();

    setRelaciones(allRelaciones);
    setConvenios(allConvenios);
    setAlumnos(allAlumnos);
    setCurso(allCursos.find((c: Curso) => c.id === cursoId));
  };

  const [bulkHorario, setBulkHorario] = useState({
    inicio: '08:00',
    fin: '17:00',
    horas: 8,
    dias: {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      sabado: false,
      domingo: false
    }
  });

  useEffect(() => {
    fetchData();
  }, [cursoId]);

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

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calculateEndDateForHours = (startDate: string, totalHours: number, horario: HorarioSemanal | undefined = formData.horario) => {
    if (!startDate || !totalHours || !horario || !curso) return null;

    const startParts = startDate.split('-').map(Number);
    const festivos = curso.festivos || [];
    let remainingHoras = totalHours;
    let current = new Date(startParts[0], startParts[1] - 1, startParts[2]);

    let iterations = 0;
    while (remainingHoras > 0 && iterations < 365) {
      const dateStr = formatDateLocal(current);
      const dayOfWeek = current.getDay();
      const isFestivo = festivos.includes(dateStr);

      if (!isFestivo) {
        let dailyHoras = 0;
        switch (dayOfWeek) {
          case 1: dailyHoras = horario.lunes.horas; break;
          case 2: dailyHoras = horario.martes.horas; break;
          case 3: dailyHoras = horario.miercoles.horas; break;
          case 4: dailyHoras = horario.jueves.horas; break;
          case 5: dailyHoras = horario.viernes.horas; break;
          case 6: dailyHoras = horario.sabado.horas; break;
          case 0: dailyHoras = horario.domingo.horas; break;
        }
        remainingHoras -= dailyHoras;
      }

      if (remainingHoras > 0) {
        current.setDate(current.getDate() + 1);
      }
      iterations++;
    }
    return formatDateLocal(current);
  };

  const calculateStartDateFromEnd = (targetEndDate: string, totalHours: number, horario: HorarioSemanal | undefined = formData.horario) => {
    if (!targetEndDate || !totalHours || !horario || !curso) return null;

    const endParts = targetEndDate.split('-').map(Number);
    const festivos = curso.festivos || [];
    let remainingHoras = totalHours;
    let current = new Date(endParts[0], endParts[1] - 1, endParts[2]);

    let iterations = 0;
    while (remainingHoras > 0 && iterations < 365) {
      const dateStr = formatDateLocal(current);
      const dayOfWeek = current.getDay();
      const isFestivo = festivos.includes(dateStr);

      if (!isFestivo) {
        let dailyHoras = 0;
        switch (dayOfWeek) {
          case 1: dailyHoras = horario.lunes.horas; break;
          case 2: dailyHoras = horario.martes.horas; break;
          case 3: dailyHoras = horario.miercoles.horas; break;
          case 4: dailyHoras = horario.jueves.horas; break;
          case 5: dailyHoras = horario.viernes.horas; break;
          case 6: dailyHoras = horario.sabado.horas; break;
          case 0: dailyHoras = horario.domingo.horas; break;
        }
        remainingHoras -= dailyHoras;
      }

      if (remainingHoras > 0) {
        current.setDate(current.getDate() - 1);
      }
      iterations++;
    }
    return formatDateLocal(current);
  };

  const applyBulkHorario = () => {
    setFormData((prev) => {
      // Clonamos el horario actual para no mutar el estado directamente
      const newHorario = { ...prev.horario } as HorarioSemanal;

      // Obtenemos las claves de los días (lunes, martes, etc.)
      const diasKeys = Object.keys(bulkHorario.dias) as Array<keyof typeof bulkHorario.dias>;

      diasKeys.forEach((day) => {
        if (bulkHorario.dias[day]) {
          // Si el día está seleccionado, aplicamos los valores del panel
          newHorario[day] = {
            inicio: bulkHorario.inicio,
            fin: bulkHorario.fin,
            horas: bulkHorario.horas
          };
        } else {
          // Si NO está seleccionado, reseteamos a cero
          newHorario[day] = {
            inicio: '00:00',
            fin: '00:00',
            horas: 0
          };
        }
      });

      return { ...prev, horario: newHorario };
    });
  };


  const [targetEndDate, setTargetEndDate] = useState('');

  const applyTargetEndDate = () => {
    if (!targetEndDate) return;
    setFormData(prev => ({
      ...prev,
      alumnosRelacion: (prev.alumnosRelacion || []).map(a => {
        const calculatedStart = calculateStartDateFromEnd(targetEndDate, a.totalHoras);
        return { ...a, fechaInicio: calculatedStart || a.fechaInicio };
      })
    }));
  };

  useEffect(() => {
    if (formData.alumnosRelacion?.length && formData.horario) {
      let maxEndDate: string | null = null;
      let minStartDate: string | null = null;

      formData.alumnosRelacion.forEach(ar => {
        const studentStartDate = ar.fechaInicio || formData.fechaInicio || '';
        const endDate = calculateEndDateForHours(studentStartDate, ar.totalHoras);

        if (!minStartDate || (studentStartDate && studentStartDate < minStartDate)) {
          minStartDate = studentStartDate;
        }

        if (!maxEndDate || (endDate && endDate > maxEndDate)) {
          maxEndDate = endDate;
        }
      });

      const updates: Partial<RelacionAlumno> = {};
      if (maxEndDate && maxEndDate !== formData.fechaFin) {
        updates.fechaFin = maxEndDate || '';
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formData.fechaInicio, formData.alumnosRelacion, formData.horario, curso]);

  const advanceStatus = async (rel: RelacionAlumno) => {
    let nextEstado = rel.estado;
    switch (rel.estado) {
      case RelacionEstado.PENDIENTE_ENVIAR_EMPRESA: nextEstado = RelacionEstado.PENDIENTE_FIRMA_EMPRESA; break;
      case RelacionEstado.PENDIENTE_FIRMA_EMPRESA: nextEstado = RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR; break;
      case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR: nextEstado = RelacionEstado.PENDIENTE_FIRMA_DIRECTOR; break;
      case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR: nextEstado = RelacionEstado.COMPLETADO; break;
    }

    if (nextEstado === rel.estado) return;

    await fetch(`/api/relaciones-alumnos/${rel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rel, estado: nextEstado })
    });

    setSelectedRelacion({ ...rel, estado: nextEstado });
    fetchData();
  };

  const moveBackStatus = async (rel: RelacionAlumno) => {
    console.log("👉 [ANEXO] Intentando retroceder. Estado actual:", rel.estado);
    let prevEstado = rel.estado;

    switch (rel.estado) {
      case RelacionEstado.PENDIENTE_FIRMA_EMPRESA:
        prevEstado = RelacionEstado.PENDIENTE_ENVIAR_EMPRESA; break;

      case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR:
        prevEstado = RelacionEstado.PENDIENTE_FIRMA_EMPRESA; break;

      case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR:
        prevEstado = RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR; break;

      case RelacionEstado.COMPLETADO:
        prevEstado = RelacionEstado.PENDIENTE_FIRMA_DIRECTOR; break;
    }

    if (prevEstado === rel.estado) {
      console.warn("⚠️ No se puede retroceder. El estado no se reconoce o ya es el inicial.");
      return;
    }

    try {
      const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rel, estado: prevEstado })
      });

      if (res.ok) {
        setSelectedRelacion({ ...rel, estado: prevEstado });
        fetchData();
      } else {
        console.error("❌ Error del servidor al retroceder:", await res.text());
      }
    } catch (error) {
      console.error("💥 Error de red:", error);
    }
  };

  const moveBackPlanStatus = async (rel: RelacionAlumno) => {
    console.log("👉 [PLAN FORMATIVO] Intentando retroceder. Estado actual:", rel.estadoPlanFormativo);
    const currentState = rel.estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
    let prevEstado = currentState;

    switch (currentState) {
      case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE:
      case 'PENDIENTE_FIRMAR_ESTUDIANTE':
        prevEstado = PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE; break;

      case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:
      case 'PENDIENTE_ENVIAR_EMPRESA':
        prevEstado = PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE; break;

      case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:
      case 'PENDIENTE_FIRMA_EMPRESA':
        prevEstado = PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA; break;

      case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:
      case 'PENDIENTE_FIRMA_TUTOR':
        prevEstado = PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA; break;

      case PlanFormativoEstado.COMPLETADO:
      case 'COMPLETADO':
        prevEstado = PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR; break;
    }

    if (prevEstado === currentState) {
      console.warn("⚠️ No se puede retroceder en el Plan Formativo. Ya está en el estado inicial.");
      return;
    }

    try {
      const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rel, estadoPlanFormativo: prevEstado })
      });

      if (res.ok) {
        setSelectedRelacion({ ...rel, estadoPlanFormativo: prevEstado });
        fetchData();
      } else {
        console.error("❌ Error del servidor al retroceder el plan:", await res.text());
      }
    } catch (error) {
      console.error("💥 Error de red:", error);
    }
  };

  // ESTADOS (PLAN FORMATIVO)
  const advancePlanStatus = async (rel: RelacionAlumno) => {
    // 1. Vemos qué estado tiene exactamente al pulsar
    const currentState = rel.estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
    console.log("👉 Estado ACTUAL antes de pulsar:", currentState);

    let nextEstado = currentState;

    switch (currentState) {
      case PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE:
        nextEstado = PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE; break;

      case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE:
        nextEstado = PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA; break;

      case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:
        nextEstado = PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA; break;

      case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:
        nextEstado = PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR; break;

      case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:
        nextEstado = PlanFormativoEstado.COMPLETADO; break;
    }

    console.log("👉 Estado SIGUIENTE calculado:", nextEstado);

    if (nextEstado === currentState) {
      console.warn("⚠️ El estado no ha cambiado. Me salgo de la función.");
      return;
    }

    try {
      console.log("🚀 Enviando petición al servidor...");
      const res = await fetch(`/api/relaciones-alumnos/${rel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rel, estadoPlanFormativo: nextEstado })
      });

      if (res.ok) {
        console.log("✅ Servidor respondió OK. Actualizando vista.");
        setSelectedRelacion({ ...rel, estadoPlanFormativo: nextEstado });
        fetchData();
      } else {
        console.error("❌ El servidor devolvió un error:", await res.text());
      }
    } catch (error) {
      console.error("💥 Error crítico de red:", error);
    }
  };

  // --- LÓGICA DE ETIQUETAS (BADGES) ---
  const statusBadge = (estado: string, isPlan: boolean = false) => {
    let color = 'bg-slate-50 text-slate-500 border-slate-200';
    let displayText = estado;

    if (!isPlan) {
      if (estado === RelacionEstado.PENDIENTE_ENVIAR_EMPRESA) color = 'bg-blue-50 text-blue-700 border-blue-100';
      else if (estado === RelacionEstado.PENDIENTE_FIRMA_EMPRESA) color = 'bg-amber-50 text-amber-700 border-amber-100';
      else if (estado === RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR) color = 'bg-blue-50 text-blue-700 border-blue-100';
      else if (estado === RelacionEstado.PENDIENTE_FIRMA_DIRECTOR) color = 'bg-indigo-50 text-indigo-700 border-indigo-100';
      else if (estado === RelacionEstado.COMPLETADO) color = 'bg-emerald-50 text-emerald-700 border-emerald-100';

      // Obtenemos el texto bonito del diccionario
      displayText = RelacionEstadoLabels[estado as RelacionEstado] || estado;
    } else {
      if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE) color = 'bg-blue-50 text-blue-700 border-blue-100';
      else if (estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE) color = 'bg-amber-50 text-amber-700 border-amber-100';
      else if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA) color = 'bg-blue-50 text-blue-700 border-blue-100';
      else if (estado === PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA) color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
      else if (estado === PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR) color = 'bg-teal-50 text-teal-700 border-teal-100';
      else if (estado === PlanFormativoEstado.COMPLETADO) color = 'bg-emerald-50 text-emerald-700 border-emerald-100';

      // Obtenemos el texto bonito del diccionario
      displayText = PlanFormativoEstadoLabels[estado as PlanFormativoEstado] || estado;
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${color}`}>
        {displayText}
      </span>
    );
  };

  const filteredAndSortedRelaciones = relaciones
    .filter(rel => {
      const conv = convenios.find(c => c.id === rel.convenioId);
      if (!conv) return false;

      const alumnoMatch = rel.alumnosRelacion.some(ar => {
        const a = alumnos.find(al => al.id === ar.alumnoId);
        return a && (a.nombre + ' ' + a.apellidos).toLowerCase().includes(listSearchTerm.toLowerCase());
      });

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
        const convA = convenios.find(c => c.id === a.convenioId)?.empresaNombre || '';
        const convB = convenios.find(c => c.id === b.convenioId)?.empresaNombre || '';
        comparison = convA.localeCompare(convB);
      } else {
        comparison = a.estado.localeCompare(b.estado);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // --- LÓGICA DE BOTONES PARA ANEXO ---
  const getAnexoStatusButton = (estado: string) => {
    switch (estado) {
      case RelacionEstado.PENDIENTE_ENVIAR_EMPRESA: return { label: 'Enviar Doc. a Empresa', icon: Send, color: 'bg-blue-600' };
      case RelacionEstado.PENDIENTE_FIRMA_EMPRESA: return { label: 'Recibido de Empresa', icon: Clock, color: 'bg-amber-500' };
      case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR: return { label: 'Enviar a Dirección', icon: Send, color: 'bg-indigo-600' };
      case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR: return { label: 'Recibido de Dirección', icon: ShieldCheck, color: 'bg-emerald-600' };
      default: return null;
    }
  };

  // --- LÓGICA DE BOTONES PARA PLAN FORMATIVO ---
  const getPlanStatusButton = (estado: string) => {
    switch (estado) {
      case PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE:
      case 'PENDIENTE_ENVIAR_ESTUDIANTE':
        return { label: 'Enviar Doc. a Estudiante', icon: Send, color: 'bg-blue-600' };

      case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE:
      case 'PENDIENTE_FIRMAR_ESTUDIANTE':
        return { label: 'Recibir Firma Estudiante', icon: Clock, color: 'bg-amber-600' };

      case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:
      case 'PENDIENTE_ENVIAR_EMPRESA':
        return { label: 'Enviar a Empresa', icon: Send, color: 'bg-indigo-600' };

      case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:
      case 'PENDIENTE_FIRMA_EMPRESA':
        return { label: 'Recibir Firma Empresa', icon: Clock, color: 'bg-emerald-600' };

      case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:
      case 'PENDIENTE_FIRMA_TUTOR':
        return { label: 'Recibir Firma Tutor', icon: ShieldCheck, color: 'bg-teal-600' };

      default: return null; // Si es COMPLETADO o no coincide, no muestra botón
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.alumnosRelacion || formData.alumnosRelacion.length === 0 || !formData.convenioId || !formData.tutorEmpresaId) {
      alert('Por favor, selecciona al menos un alumno, un convenio y un tutor válidos.');
      return;
    }

    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/relaciones-alumnos/${editing.id}` : '/api/relaciones-alumnos';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving relacion:', error);
    }
  };

  const handleOpenForm = (rel: RelacionAlumno | null) => {
    if (rel) {
      setEditing(rel);
      setFormData(rel);
      const conv = convenios.find(c => c.id === rel.convenioId);
      setSearchTermAlumno('');
      setSearchTermConvenio(conv ? `${conv.empresaNombre} (Ref: ${conv.numConvenio})` : '');
    } else {
      setEditing(null);
      setFormData({
        alumnosRelacion: [],
        numRelacion: '',
        fechaInicio: '',
        fechaFin: '',
        horario: { ...DEFAULT_HORARIO },
        estado: RelacionEstado.PENDIENTE_ENVIAR_EMPRESA
      });
      setSearchTermAlumno('');
      setSearchTermConvenio('');
    }
    setShowForm(true);
  };

  const addAlumnoToRelacion = (alumno: Alumno) => {
    setFormData(prev => {
      const current = prev.alumnosRelacion || [];
      if (current.some(a => a.alumnoId === alumno.id)) return prev;
      return {
        ...prev,
        alumnosRelacion: [...current, {
          alumnoId: alumno.id!,
          totalHoras: alumno.horasPendientesFFE || 0,
          fechaInicio: prev.fechaInicio
        }]
      };
    });
    setSearchTermAlumno('');
  };

  const removeAlumnoFromRelacion = (id: number) => {
    setFormData(prev => ({
      ...prev,
      alumnosRelacion: (prev.alumnosRelacion || []).filter(a => a.alumnoId !== id)
    }));
  };

  const updateStudentHours = (id: number, hours: number) => {
    setFormData(prev => ({
      ...prev,
      alumnosRelacion: (prev.alumnosRelacion || []).map(a =>
        a.alumnoId === id ? { ...a, totalHoras: hours } : a
      )
    }));
  };

  const updateStudentStartDate = (id: number, date: string) => {
    setFormData(prev => ({
      ...prev,
      alumnosRelacion: (prev.alumnosRelacion || []).map(a =>
        a.alumnoId === id ? { ...a, fechaInicio: date } : a
      )
    }));
  };

  const applyStartDateToAll = () => {
    if (!formData.fechaInicio) return;
    setFormData(prev => ({
      ...prev,
      alumnosRelacion: (prev.alumnosRelacion || []).map(a => ({ ...a, fechaInicio: prev.fechaInicio }))
    }));
  };

  const filteredAlumnos = searchTermAlumno.trim().length > 0
    ? alumnos.filter(a => {
      const matchesSearch = (a.nombre + ' ' + a.apellidos).toLowerCase().includes(searchTermAlumno.toLowerCase());
      const isAlreadyInForm = (formData.alumnosRelacion || []).some(ar => ar.alumnoId === a.id);
      const hasExistingRelacion = relaciones.some(rel =>
        rel.alumnosRelacion.some(ar => ar.alumnoId === a.id)
      );
      return matchesSearch && !isAlreadyInForm && !hasExistingRelacion;
    })
    : [];

  const filteredConvenios = convenios.filter(c =>
    `${c.empresaNombre} ${c.numConvenio}`.toLowerCase().includes(searchTermConvenio.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/relaciones-alumnos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar relational data');
      setShowDeleteConfirm(null);
      if (selectedRelacion?.id === id) setSelectedRelacion(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar la relación.');
    }
  };

  const getDayName = (day: string) => {
    const names: Record<string, string> = {
      lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
      viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
    };
    return names[day];
  };

  const conveniosOptions = convenios.map(c => ({
    id: c.id,
    label: `${c.empresaNombre} (Ref: ${c.numConvenio})`
  }));

  const tutoresOptions = tutores.map(t => ({
    id: t.id,
    label: `${t.nombre} ${t.apellidos}`
  }));

  const estadosOptions = [
    { id: 'all', label: 'Cualquier estado' },
    ...Object.values(RelacionEstado).map(e => ({
      id: e,
      label: RelacionEstadoLabels[e as RelacionEstado] // <-- Usamos el diccionario aquí
    }))
  ];

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">

      {/* Header superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Relación de Alumnos</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">Gestión de periodos de prácticas y horarios grupales.</p>
        </div>
        <button
          onClick={() => handleOpenForm(null)}
          className="w-full sm:w-auto bg-primary text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Nueva Relación
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL DOS COLUMNAS */}
      <div className="flex flex-col lg:flex-row gap-6 h-full items-start">

        {/* COLUMNA IZQUIERDA: Listado y Búsqueda */}
        <div className="w-full lg:flex-1 bg-white rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">

          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar empresa, relación, o alumno..."
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                />
                {listSearchTerm && (
                  <button onClick={() => setListSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <CustomSelect
                  options={estadosOptions}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  name="estadoFilter"
                />
              </div>

              <div className="md:col-span-4 flex bg-white border border-slate-200 rounded-lg p-1">
                <button
                  onClick={() => {
                    if (sortBy === 'empresa') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setBy('empresa'); setSortOrder('asc'); }
                  }}
                  className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-md transition-all ${sortBy === 'empresa' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => {
                    if (sortBy === 'estado') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setBy('estado'); setSortOrder('asc'); }
                  }}
                  className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-md transition-all ${sortBy === 'estado' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Listado */}
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Empresa / Alumnos
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAndSortedRelaciones.length > 0 ? (
                  filteredAndSortedRelaciones.map(rel => {
                    const conv = convenios.find(c => c.id === rel.convenioId);
                    return (
                      <tr
                        key={rel.id}
                        onClick={() => setSelectedRelacion(rel)}
                        className={`cursor-pointer transition-colors group align-top ${selectedRelacion?.id === rel.id ? 'bg-primary/5' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 mb-3">
                            <div className="text-[13px] font-black text-slate-800 leading-tight">{conv?.empresaNombre}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-primary">Ref: {rel.numRelacion}</span>
                              
                            </div>
                          </div>

                          <div className="space-y-2">
                            {rel.alumnosRelacion.map((ar, idx) => {
                              const a = alumnos.find(al => al.id === ar.alumnoId);
                              const studentStartDate = ar.fechaInicio || rel.fechaInicio || '';
                              const studentEndDate = calculateEndDateForHours(studentStartDate, ar.totalHoras, rel.horario);
                              return (
                                <div key={idx} className="bg-white border border-slate-100 p-2.5 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-700">{a?.nombre} {a?.apellidos}</span>
                                    <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                                      {ar.totalHoras}h
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>{studentStartDate ? new Date(studentStartDate).toLocaleDateString() : '—'}</span>
                                    <span className="text-slate-300">-</span>
                                    <span className="text-emerald-600">{studentEndDate ? new Date(studentEndDate).toLocaleDateString() : '—'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenForm(rel)}
                              className="p-2 text-slate-400 hover:text-primary transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(rel.id!)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <FileText className="h-8 w-8" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">No se encontraron relaciones</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: Tarjeta de Detalles y Acciones */}
        <div className="w-full lg:w-96 lg:shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden min-h-[600px]">
          {selectedRelacion ? (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Gestión de Documentación</h2>
                <p className="text-xs font-mono text-slate-500 mt-1">Ref: {selectedRelacion.numRelacion}</p>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">

                {/* BLOQUE 1: ANEXO DE RELACIÓN */}
                <section className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">1. Anexo de Relación</label>
                    {statusBadge(selectedRelacion.estado)}
                  </div>

                  <div className="flex gap-2">
                    <BotonDescargaDOCX
                      url={`/api/relaciones-alumnos/${selectedRelacion.id}/documento`}
                      name={`Anexo_${selectedRelacion.numRelacion.replace(/\//g, '_')}.docx`}
                      showText={true}
                    />
                    <BotonDescargaPDF
                      url={`/api/relaciones-alumnos/${selectedRelacion.id}/documento/pdf`}
                      name={`Anexo_${selectedRelacion.numRelacion.replace(/\//g, '_')}.pdf`}
                      showText={true}
                    />
                  </div>

                  {getAnexoStatusButton(selectedRelacion.estado) ? (
                    <button
                      onClick={() => advanceStatus(selectedRelacion)}
                      className={`w-full py-2.5 rounded-xl text-white font-bold text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg transition-all ${getAnexoStatusButton(selectedRelacion.estado)!.color}`}
                    >
                      {React.createElement(getAnexoStatusButton(selectedRelacion.estado)!.icon, { className: 'h-4 w-4' })}
                      {getAnexoStatusButton(selectedRelacion.estado)!.label}
                    </button>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl text-center font-bold text-[10px] border border-emerald-100 uppercase">
                      Anexo Completado
                    </div>
                  )}

                  {/* Botón para regresar estado (General para la relación) */}
                  {selectedRelacion.estado !== RelacionEstado.PENDIENTE_ENVIAR_EMPRESA && (
                    <button
                      onClick={() => moveBackStatus(selectedRelacion)}
                      className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Regresar Estado Anterior
                    </button>
                  )}
                </section>

                {/* BLOQUE 2: PLAN FORMATIVO (Dependiente de selectedRelacion pero con flujo propio) */}
                <section className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> 2. Plan Formativo</label>
                    {statusBadge(selectedRelacion.estadoPlanFormativo || PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE, true)}
                  </div>
                  <div className="flex gap-2">
                    <BotonDescargaDOCX url={`/api/relaciones-alumnos/${selectedRelacion.id}/plan-formativo`} name={`Plan_${selectedRelacion.numRelacion}.docx`} showText />
                    <BotonDescargaPDF url={`/api/relaciones-alumnos/${selectedRelacion.id}/plan-formativo/pdf`} name={`Plan_${selectedRelacion.numRelacion}.pdf`} showText />
                  </div>
                  {getPlanStatusButton(selectedRelacion.estadoPlanFormativo || 'PENDIENTE_ENVIAR_ESTUDIANTE') ? (
                    <button
                      onClick={() => advancePlanStatus(selectedRelacion)}
                      className={`w-full py-2.5 rounded-xl text-white font-bold text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg transition-all hover:brightness-90 ${getPlanStatusButton(selectedRelacion.estadoPlanFormativo || 'PENDIENTE_ENVIAR_ESTUDIANTE')!.color}`}>
                      {React.createElement(getPlanStatusButton(selectedRelacion.estadoPlanFormativo || 'PENDIENTE_ENVIAR_ESTUDIANTE')!.icon, { className: 'h-4 w-4' })}
                      {getPlanStatusButton(selectedRelacion.estadoPlanFormativo || 'PENDIENTE_ENVIAR_ESTUDIANTE')!.label}
                    </button>
                  ) : <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl text-center font-bold text-[10px] border border-emerald-100">COMPLETADO</div>}
                  {/* NUEVO BOTÓN PARA RETROCEDER ESTADO DEL PLAN FORMATIVO */}
                  {(selectedRelacion.estadoPlanFormativo &&
                    selectedRelacion.estadoPlanFormativo !== PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE) && (
                      <button
                        onClick={() => moveBackPlanStatus(selectedRelacion)}
                        className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Regresar Estado Anterior
                      </button>
                    )}
                </section>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <FileText className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-2">Selecciona una relación</h3>
              <p className="text-xs text-slate-500">Para gestionar los Anexos y Planes Formativos asociados.</p>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-center">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative p-8 transition-all">
            <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Plus className="rotate-45 h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">¿Eliminar relación?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">Esta acción eliminará la relación de prácticas de forma permanente y no se puede deshacer.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all font-sans"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

            {/* Modal Header Fijo */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editing ? 'Editar Relación' : 'Nueva Relación'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Sincroniza alumnos, empresas y sus horarios específicos.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Formulario con Body Scrolleable y Footer Fijo */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">

              {/* Modal Body (Scrolleable) */}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

                  {/* Izquierda */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-50 rounded-3xl p-6 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="h-3.5 w-3.5" /> Selección de Alumno(s)
                      </h4>

                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                            placeholder="Buscar por nombre..."
                            value={searchTermAlumno}
                            onChange={(e) => setSearchTermAlumno(e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400 mt-1 ml-1 italic">
                            * Solo se muestran alumnos sin relación asignada.
                          </p>

                          {filteredAlumnos.length > 0 && (
                            <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto py-2">
                              {filteredAlumnos.map(a => (
                                <button
                                  key={a.id}
                                  type="button"
                                  className="w-full text-left px-5 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                                  onClick={() => addAlumnoToRelacion(a)}
                                >
                                  <span className="font-bold text-slate-700">{a.nombre} {a.apellidos}</span>
                                  <Plus className="h-4 w-4 text-primary" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* LISTA DE ALUMNOS CON SCROLL INDEPENDIENTE */}
                        <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-2">
                          {formData.alumnosRelacion?.map(ar => {
                            const alum = alumnos.find(a => a.id === ar.alumnoId);
                            const studentStartDate = ar.fechaInicio || formData.fechaInicio || '';
                            const studentEndDate = calculateEndDateForHours(studentStartDate, ar.totalHoras);
                            return (
                              <div key={ar.alumnoId} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black text-slate-800">{alum?.nombre} {alum?.apellidos}</span>
                                  <button type="button" onClick={() => removeAlumnoFromRelacion(ar.alumnoId)} className="text-red-400 hover:text-red-500 transition-colors">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Horas FFE</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-primary focus:ring-2 focus:ring-primary/10 outline-none"
                                      value={ar.totalHoras}
                                      onChange={e => updateStudentHours(ar.alumnoId, Number(e.target.value))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Fecha Inicio</label>
                                    <input
                                      type="date"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/10 outline-none"
                                      value={ar.fechaInicio || ''}
                                      onChange={e => updateStudentStartDate(ar.alumnoId, e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Fin Estimado</span>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    {studentEndDate ? new Date(studentEndDate).toLocaleDateString() : '—'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {(!formData.alumnosRelacion || formData.alumnosRelacion.length === 0) && (
                            <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic bg-white rounded-2xl border border-dashed border-slate-200">
                              No hay alumnos seleccionados
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" /> Periodo general
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha Inicio General</label>
                            <button
                              type="button"
                              onClick={applyStartDateToAll}
                              disabled={!formData.alumnosRelacion?.length}
                              className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tight disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                            >
                              Aplicar a todos
                            </button>
                          </div>
                          <input
                            type="date"
                            disabled={!formData.alumnosRelacion?.length}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            value={formData.fechaInicio}
                            onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha Fin Objetivo</label>
                            <button
                              type="button"
                              onClick={applyTargetEndDate}
                              disabled={!formData.alumnosRelacion?.length}
                              className="text-[9px] font-bold text-emerald-600 hover:underline uppercase tracking-tight disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                            >
                              Cálculo retroactivo
                            </button>
                          </div>
                          <input
                            type="date"
                            disabled={!formData.alumnosRelacion?.length}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            value={targetEndDate}
                            onChange={e => setTargetEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> Entidad Colaboradora
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Relación Nº</label>
                          <input
                            required
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                            value={formData.numRelacion}
                            onChange={e => setFormData({ ...formData, numRelacion: e.target.value })}
                          />
                        </div>

                        <div className="relative">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Convenio</label>
                          <input
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                            placeholder="Buscar convenio..."
                            value={searchTermConvenio}
                            onChange={(e) => {
                              setSearchTermConvenio(e.target.value);
                              setFormData(prev => ({ ...prev, convenioId: undefined }));
                              setIsConvenioDropdownOpen(true);
                            }}
                            onFocus={() => setIsConvenioDropdownOpen(true)}
                          />
                          {isConvenioDropdownOpen && (searchTermConvenio || filteredConvenios.length > 0) && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                              {filteredConvenios.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                  onClick={() => {
                                    setFormData({ ...formData, convenioId: c.id });
                                    setSearchTermConvenio(`${c.empresaNombre} (Ref: ${c.numConvenio})`);
                                    setIsConvenioDropdownOpen(false);
                                  }}
                                >
                                  <div className="font-bold">{c.empresaNombre}</div>
                                  <div className="text-[10px] text-slate-400">Ref: {c.numConvenio}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <CustomSelect
                            label="Tutor Empresa"
                            options={tutoresOptions}
                            value={formData.tutorEmpresaId || ''}
                            onChange={(val) => setFormData({ ...formData, tutorEmpresaId: Number(val) })}
                            required={true}
                            name="tutorEmpresaId"
                          />
                        </div>

                        <div>
                          <CustomSelect
                            label="Estado de Tramitación"
                            options={estadosOptions.filter(o => o.id !== 'all')}
                            value={formData.estado || ''}
                            onChange={(val) => setFormData({ ...formData, estado: val as RelacionEstado })}
                            required={true}
                            name="estado"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Derecha */}
                  <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-50 border border-primary/20 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Clock className="h-3.5 w-3.5" /> Configuración rápida de horario
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Hora Inicio</label>
                          <input
                            type="time"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                            value={bulkHorario.inicio}
                            onChange={(e) => setBulkHorario({ ...bulkHorario, inicio: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Hora Fin</label>
                          <input
                            type="time"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                            value={bulkHorario.fin}
                            onChange={(e) => setBulkHorario({ ...bulkHorario, fin: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Total Horas</label>
                          <input
                            type="number"
                            step="0.5"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary font-bold text-primary"
                            value={bulkHorario.horas}
                            onChange={(e) => setBulkHorario({ ...bulkHorario, horas: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                        <div className="flex gap-2">
                          {Object.keys(bulkHorario.dias).map((day) => {
                            const labels: any = { lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V', sabado: 'S', domingo: 'D' };
                            const isChecked = (bulkHorario.dias as any)[day];
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const newDias = { ...bulkHorario.dias } as any;
                                  newDias[day] = !newDias[day];
                                  setBulkHorario({ ...bulkHorario, dias: newDias });
                                }}
                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border ${isChecked
                                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                              >
                                {labels[day]}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={applyBulkHorario}
                          className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20 border border-primary"
                        >
                          Aplicar horario a la semana
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Detalle por día
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {Object.keys(DEFAULT_HORARIO).map((day) => {
                        const d = day as keyof HorarioSemanal;
                        return (
                          <div key={day} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-4">
                              <h5 className="text-[11px] font-black text-slate-700 w-24">
                                {getDayName(day)}
                              </h5>
                              <div className="grid grid-cols-3 gap-4 flex-1">
                                <input
                                  type="time"
                                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium"
                                  value={formData.horario?.[d].inicio}
                                  onChange={e => {
                                    const h = { ...formData.horario! };
                                    h[d].inicio = e.target.value;
                                    setFormData({ ...formData, horario: h });
                                  }}
                                />
                                <input
                                  type="time"
                                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium"
                                  value={formData.horario?.[d].fin}
                                  onChange={e => {
                                    const h = { ...formData.horario! };
                                    h[d].fin = e.target.value;
                                    setFormData({ ...formData, horario: h });
                                  }}
                                />
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.5"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-primary outline-none focus:border-primary"
                                    value={formData.horario?.[d].horas}
                                    onChange={e => {
                                      const h = { ...formData.horario! };
                                      h[d].horas = Number(e.target.value);
                                      setFormData({ ...formData, horario: h });
                                    }}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">h</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Fijo */}
              <div className="px-8 py-5 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all uppercase tracking-widest"
                >
                  {editing ? 'Guardar Cambios' : 'Crear Relación'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}