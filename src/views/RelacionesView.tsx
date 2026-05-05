import React, { useState, useEffect } from 'react';
import {
  Download, FileText, File as FilePdf, Plus, Edit2, Trash2, Calendar,
  ChevronRight, Building2, User, Hash, X, Info, ArrowLeftRight,
  Send, Clock, ShieldCheck, CheckCircle2, ArrowLeft, Loader2
} from 'lucide-react';
import { RelacionAlumno, Convenio, TutorEmpresa, Empresa, Curso, HorarioSemanal, HorarioDia, Alumno, RelacionEstado } from '../types/index.ts';
import { BotonDescargaPDF } from '../components/BotonDescargarPDF.tsx';
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

  const [formData, setFormData] = useState<Partial<RelacionAlumno>>({
    alumnosRelacion: [],
    numRelacion: '',
    fechaInicio: '',
    fechaFin: '',
    horario: { ...DEFAULT_HORARIO },
    estado: RelacionEstado.PENDIENTE_ENVIAR
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

      // If we still have hours, move to next day
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
      case RelacionEstado.PENDIENTE_ENVIAR: nextEstado = RelacionEstado.PENDIENTE_FIRMA_EMPRESA; break;
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
    fetchData();
  };

  const moveBackStatus = async (rel: RelacionAlumno) => {
    let prevEstado = rel.estado;
    switch (rel.estado) {
      case RelacionEstado.PENDIENTE_FIRMA_EMPRESA: prevEstado = RelacionEstado.PENDIENTE_ENVIAR; break;
      case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR: prevEstado = RelacionEstado.PENDIENTE_FIRMA_EMPRESA; break;
      case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR: prevEstado = RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR; break;
      case RelacionEstado.COMPLETADO: prevEstado = RelacionEstado.PENDIENTE_FIRMA_DIRECTOR; break;
    }

    if (prevEstado === rel.estado) return;

    await fetch(`/api/relaciones-alumnos/${rel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rel, estado: prevEstado })
    });
    fetchData();
  };

  const statusBadge = (estado: RelacionEstado) => {
    const styles = {
      [RelacionEstado.PENDIENTE_ENVIAR]: 'bg-orange-50 text-orange-700 border-orange-100',
      [RelacionEstado.PENDIENTE_FIRMA_EMPRESA]: 'bg-amber-50 text-amber-700 border-amber-100',
      [RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'bg-blue-50 text-blue-700 border-blue-100',
      [RelacionEstado.PENDIENTE_FIRMA_DIRECTOR]: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      [RelacionEstado.COMPLETADO]: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${styles[estado] || 'bg-slate-50 text-slate-500'}`}>
        {estado}
      </span>
    );
  };

  const filteredAndSortedRelaciones = relaciones
    .filter(rel => {
      const conv = convenios.find(c => c.id === rel.convenioId);
      if (!conv) return false;

      const searchMatch = !listSearchTerm ||
        conv.empresaNombre.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        rel.numRelacion.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        rel.alumnosRelacion.some(ar => {
          const a = alumnos.find(al => al.id === ar.alumnoId);
          return a && (a.nombre + ' ' + a.apellidos).toLowerCase().includes(listSearchTerm.toLowerCase());
        });

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

  const getStatusButton = (estado: RelacionEstado) => {
    switch (estado) {
      case RelacionEstado.PENDIENTE_ENVIAR: return { label: 'Enviar a Empresa', icon: Send, color: 'bg-blue-600' };
      case RelacionEstado.PENDIENTE_FIRMA_EMPRESA: return { label: 'Recibido de Empresa', icon: Clock, color: 'bg-amber-500' };
      case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR: return { label: 'Enviar a Dirección', icon: Send, color: 'bg-indigo-600' };
      case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR: return { label: 'Recibido de Dirección', icon: ShieldCheck, color: 'bg-emerald-600' };
      default: return null;
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
        estado: RelacionEstado.PENDIENTE_ENVIAR
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
          fechaInicio: prev.fechaInicio // Use default from form as initial value
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
      // 1. Verificar si el nombre coincide con la búsqueda
      const matchesSearch = (a.nombre + ' ' + a.apellidos).toLowerCase().includes(searchTermAlumno.toLowerCase());

      // 2. Verificar si el alumno ya está en el formulario actual (evitar duplicados en la misma relación)
      const isAlreadyInForm = (formData.alumnosRelacion || []).some(ar => ar.alumnoId === a.id);

      // 3. Verificar si el alumno ya tiene una relación guardada en la base de datos
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

  // Opciones para Convenios
  const conveniosOptions = convenios.map(c => ({
    id: c.id,
    label: `${c.empresaNombre} (Ref: ${c.numConvenio})`
  }));

  // Opciones para Tutores (filtrados por la empresa seleccionada)
  const tutoresOptions = tutores.map(t => ({
    id: t.id,
    label: `${t.nombre} ${t.apellidos}`
  }));

  // Opciones para Estados
  const estadosOptions = [
    { id: 'all', label: 'Cualquier estado' }, // <--- Añadimos esta línea
    ...Object.values(RelacionEstado).map(e => ({
      id: e,
      label: e
    }))
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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

      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-60 p-4 text-center">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative p-8 transition-all">
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

      <div className="bg-white rounded-xl lg:rounded-4xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 rotate-45" />
              <input
                type="text"
                placeholder="Buscar por empresa, alumno o relación..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
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
                name="estado"
              />
            </div>

            <div className="md:col-span-4 flex bg-white border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => {
                  if (sortBy === 'empresa') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setBy('empresa'); setSortOrder('asc'); }
                }}
                className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${sortBy === 'empresa' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Empresa {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'estado') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setBy('estado'); setSortOrder('asc'); }
                }}
                className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${sortBy === 'estado' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Estado {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Views for Relaciones */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredAndSortedRelaciones.length > 0 ? (
            filteredAndSortedRelaciones.map(rel => {
              const conv = convenios.find(c => c.id === rel.convenioId);
              return (
                <div key={rel.id} className="p-5 space-y-5 bg-white">
                  {/* Cabecera: Empresa y Estado */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Empresa / Convenio</span>
                      <h3 className="text-sm font-black text-slate-800 leading-tight">{conv?.empresaNombre}</h3>
                      <p className="text-[10px] text-primary font-bold">Convenio: {conv?.numConvenio}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(rel.estado)}
                    </div>
                  </div>

                  {/* Alumnos y Periodos en Grid para Tablets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rel.alumnosRelacion.map((ar, idx) => {
                      const a = alumnos.find(al => al.id === ar.alumnoId);
                      const studentStartDate = ar.fechaInicio || rel.fechaInicio || '';
                      const studentEndDate = calculateEndDateForHours(studentStartDate, ar.totalHoras, rel.horario);
                      return (
                        <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-black text-slate-800">{a?.nombre} {a?.apellidos}</span>
                            <span className="text-[10px] font-bold text-primary bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                              {ar.totalHoras}h
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-2">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{studentStartDate ? new Date(studentStartDate).toLocaleDateString() : '—'}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-emerald-600">{studentEndDate ? new Date(studentEndDate).toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barra de Acciones: Centrada y aprovechando el ancho */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      {/* Grupo Edición/Borrado */}
                      <button onClick={() => handleOpenForm(rel)} className="p-3 text-slate-500 hover:text-primary bg-slate-50 rounded-xl border border-slate-200 transition-all">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(rel.id!)} className="p-3 text-slate-500 hover:text-red-500 bg-slate-50 rounded-xl border border-slate-200 transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="w-px h-6 bg-slate-200 mx-1" />

                      {/* Grupo Documentos */}
                      <BotonDescargaDOCX
                        url={`/api/relaciones-alumnos/${rel.id}/documento`}
                        name={`Anexo_Relacion_${rel.numRelacion.replace(/\//g, '_')}.docx`}
                        showText={true}
                      />

                      <BotonDescargaPDF
                        url={`/api/relaciones-alumnos/${rel.id}/documento/pdf`}
                        name={`Anexo_Relacion_${rel.numRelacion.replace(/\//g, '_')}.pdf`}
                        showText={true}
                      />
                    </div>

                    {/* Grupo Flujo de Estado */}
                    <div className="flex items-center gap-2 ml-auto">
                      {rel.estado !== RelacionEstado.PENDIENTE_ENVIAR && (
                        <button
                          onClick={() => moveBackStatus(rel)}
                          className="p-3 bg-white text-slate-400 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                      )}
                      {getStatusButton(rel.estado) ? (
                        <button
                          onClick={() => advanceStatus(rel)}
                          className={`flex items-center gap-2 px-4 py-3 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-md ${getStatusButton(rel.estado)!.color}`}
                        >
                          {React.createElement(getStatusButton(rel.estado)!.icon, { className: 'h-4 w-4' })}
                          <span className="md:inline hidden">{getStatusButton(rel.estado)!.label}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-emerald-100">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Completado</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-slate-300 text-right uppercase italic">Ref: {rel.numRelacion}</div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">No se encontraron relaciones</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => { setBy('empresa'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Información General {sortBy === 'empresa' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle de Alumnos y Periodos</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-primary transition-colors" onClick={() => { setBy('estado'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Estado / Acciones {sortBy === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedRelaciones.length > 0 ? (
                filteredAndSortedRelaciones.map(rel => {
                  const conv = convenios.find(c => c.id === rel.convenioId);
                  return (
                    <tr key={rel.id} className="hover:bg-slate-50/50 transition-colors group align-top">
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-2">
                          <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Empresa / Convenio</div>
                            <div className="text-[13px] font-black text-slate-800 leading-tight">{conv?.empresaNombre}</div>
                            <div className="text-[10px] font-bold text-slate-400">Convenio: {conv?.numConvenio}</div>
                          </div>
                          <div className="pt-2 border-t border-slate-50">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Relación Nº</div>
                            <div className="text-[11px] font-mono font-bold text-primary">{rel.numRelacion}</div>
                          </div>
                          <div className="pt-2">
                            {statusBadge(rel.estado)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-4">
                          {rel.alumnosRelacion.map((ar, idx) => {
                            const a = alumnos.find(al => al.id === ar.alumnoId);
                            const studentStartDate = ar.fechaInicio || rel.fechaInicio || '';
                            const studentEndDate = calculateEndDateForHours(studentStartDate, ar.totalHoras, rel.horario);
                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-slate-800">{a?.nombre} {a?.apellidos}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{ar.totalHoras} horas FFEE</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Periodo</div>
                                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                    <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                    <span>{studentStartDate ? new Date(studentStartDate).toLocaleDateString() : '—'}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-emerald-600">{studentEndDate ? new Date(studentEndDate).toLocaleDateString() : '—'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 mb-4">
                          <button
                            onClick={() => handleOpenForm(rel)}
                            className="p-2.5 text-slate-400 hover:text-primary transition-all hover:bg-slate-100 rounded-xl border border-slate-100 shadow-sm"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(rel.id!)}
                            className="p-2.5 text-slate-400 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl border border-slate-100 shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-2 mb-4">
                          {/* Botón DOCX */}
                          <BotonDescargaDOCX
                            url={`/api/relaciones-alumnos/${rel.id}/documento`}
                            name={`Anexo_Relacion_${rel.numRelacion.replace(/\//g, '_')}.docx`}
                            showText={true}
                          />

                          {/* Botón PDF (Preparado para cuando hagamos el backend) */}
                          <BotonDescargaPDF
                            url={`/api/relaciones-alumnos/${rel.id}/documento/pdf`}
                            name={`Anexo_Relacion_${rel.numRelacion.replace(/\//g, '_')}.pdf`}
                            showText={true}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {rel.estado !== RelacionEstado.PENDIENTE_ENVIAR && (
                            <button
                              onClick={() => moveBackStatus(rel)}
                              className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center"
                              title="Retroceder estado"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                          )}
                          {getStatusButton(rel.estado) ? (
                            <button
                              onClick={() => advanceStatus(rel)}
                              className={`flex items-center gap-2 px-3 py-2 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm ${getStatusButton(rel.estado)!.color}`}
                            >
                              {React.createElement(getStatusButton(rel.estado)!.icon, { className: 'h-3.5 w-3.5' })}
                              {getStatusButton(rel.estado)!.label}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Completado
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <FileText className="h-8 w-8" />
                    </div>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">No se encontraron relaciones para mostrar</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300 my-8">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
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

            <form onSubmit={handleSubmit} className="p-10">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
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
                        {/* Aviso informativo */}
                        <p className="text-[10px] text-slate-400 mt-1 ml-1 italic">
                          * Solo se muestran alumnos sin relación asignada.
                        </p>

                        {/* Lista de resultados (el resto del código se mantiene igual) */}
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

                      <div className="space-y-3">
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
                          options={estadosOptions}
                          value={formData.estado || ''}
                          onChange={(val) => setFormData({ ...formData, estado: val as RelacionEstado })}
                          required={true}
                          name="estado"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Horario de Trabajo
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

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="w-full sm:flex-1 py-4 bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:flex-2 py-4 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
                    >
                      {editing ? 'Guardar Cambios' : 'Crear Relación'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
