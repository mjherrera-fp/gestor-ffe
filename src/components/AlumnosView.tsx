import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, User, Phone, Mail, Calendar, Hash, FileUp, Download, CheckCircle, FileText, GraduationCap, X, Clock, FileSpreadsheet, LayoutGrid, List, Search, ArrowUpDown } from 'lucide-react';
import { Alumno, DetalleAcademico, RelacionAlumno } from '../types/index.ts';
import DetalleAcademicoModal from './DetalleAcademicoModal.tsx';
import * as XLSX from 'xlsx';

interface Props {
  cursoId: number;
}

export default function AlumnosView({ cursoId }: Props) {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [relaciones, setRelaciones] = useState<RelacionAlumno[]>([]);
  const [detalles, setDetalles] = useState<DetalleAcademico[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Alumno | null>(null);
  const [academicDetailAlumno, setAcademicDetailAlumno] = useState<Alumno | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('alumnos_view_mode');
    return (saved === 'grid' || saved === 'table') ? saved : 'grid';
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [sortBy, setSortBy] = useState<'nombre' | 'apellidos' | 'horas'>('apellidos');

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'assigned'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('alumnos_view_mode', viewMode);
  }, [viewMode]);

  const [formData, setFormData] = useState<Partial<Alumno>>({
    nombre: '', apellidos: '', dni: '', numSS: '', tlfn: '', emailEduca: '', emailPersonal: '', fechaNacimiento: '', cursoId, detalleAcademicoId: undefined, horasPendientesFFE: 0
  });

  const fetchDetalles = async () => {
    const res = await fetch('/api/detalles-academicos');
    const data = await res.json();
    setDetalles(data);
  };

  const fetchAlumnos = async () => {
    const res = await fetch(`/api/alumnos?cursoId=${cursoId}`);
    setAlumnos(await res.json());
    
    // Fetch relationships to determine assignment status
    const relRes = await fetch('/api/relaciones-alumnos');
    if (relRes.ok) {
      setRelaciones(await relRes.json());
    }
  };

  useEffect(() => {
    fetchAlumnos();
    fetchDetalles();
  }, [cursoId]);

  const handleOpenForm = (alumno: Alumno | null) => {
    if (alumno) {
      setEditing(alumno);
      setFormData(alumno);
    } else {
      setEditing(null);
      setFormData({ 
        nombre: '', apellidos: '', dni: '', numSS: '', tlfn: '', emailEduca: '', emailPersonal: '', fechaNacimiento: '', cursoId,
        detalleAcademicoId: detalles.length > 0 ? detalles[0].id : undefined,
        horasPendientesFFE: 0
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e?: React.FormEvent, manualData?: any) => {
    if (e) e.preventDefault();
    const dataToSend = manualData || { ...formData, cursoId };
    const method = editing && !manualData ? 'PUT' : 'POST';
    const url = editing && !manualData ? `/api/alumnos/${editing.id}` : '/api/alumnos';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      if (res.ok) {
        if (!manualData) {
          setShowForm(false);
          setEditing(null);
          setFormData({ nombre: '', apellidos: '', dni: '', numSS: '', tlfn: '', emailEduca: '', emailPersonal: '', fechaNacimiento: '', cursoId, horasPendientesFFE: 0 });
        }
        fetchAlumnos();
        return true;
      }
    } catch (error) {
      console.error(error);
    }
    return false;
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/alumnos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setShowDeleteConfirm(null);
      fetchAlumnos();
    } catch (error) {
      console.error(error);
      alert('Error: No se pudo eliminar el alumno. Es posible que tenga dependencias activas (como relaciones de prácticas).');
    }
  };

  const handleFileUpload = async (alumnoId: number, file: File) => {
    const fd = new FormData();
    fd.append('cv', file);
    try {
      const res = await fetch(`/api/alumnos/${alumnoId}/cv`, {
        method: 'POST',
        body: fd
      });
      if (res.ok) fetchAlumnos();
    } catch (error) {
      console.error(error);
    }
  };

  const downloadTemplate = () => {
    const headers = [[
      'Primer Apellido', 
      'Segundo Apellido', 
      'Nombre', 
      'DNI/Pasaporte', 
      'Fecha Nacimiento', 
      'Num SS', 
      'Tlfn', 
      'Email personal', 
      'Código Grupo', 
      'Email educamadrid', 
      'Horas pendientes FFE'
    ]];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Alumnos');
    XLSX.writeFile(wb, 'plantilla_importacion_alumnos.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as any[];

        let successCount = 0;
        let updateCount = 0;
        
        for (const row of data) {
          const dni = (row['DNI/Pasaporte'] || '').toString().trim();
          const nombre = (row['Nombre'] || '').toString().trim();
          const primerApellido = (row['Primer Apellido'] || '').toString().trim();
          const segundoApellido = (row['Segundo Apellido'] || '').toString().trim();

          if (!dni || !nombre || !primerApellido) continue;

          let fechaNacimiento = row['Fecha Nacimiento'] || '2000-01-01';
          
          // Handle dd/MM/yyyy format or Date objects
          if (fechaNacimiento instanceof Date) {
            fechaNacimiento = fechaNacimiento.toISOString().split('T')[0];
          } else if (typeof fechaNacimiento === 'string' && fechaNacimiento.includes('/')) {
            const parts = fechaNacimiento.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              const fullYear = year.length === 2 ? (Number(year) > 40 ? '19'+year : '20'+year) : year;
              fechaNacimiento = `${fullYear}-${month}-${day}`;
            }
          }
          
          // Check if student exists by DNI
          const existingAlumno = alumnos.find(a => a.dni.trim().toLowerCase() === dni.toLowerCase());
          
          const studentData = {
            nombre,
            apellidos: `${primerApellido} ${segundoApellido}`.trim(),
            dni,
            numSS: row['Num SS'] || '',
            tlfn: row['Tlfn'] || '',
            emailEduca: row['Email educamadrid'] || '',
            emailPersonal: row['Email personal'] || '',
            fechaNacimiento: fechaNacimiento,
            cursoId,
            horasPendientesFFE: Number(row['Horas pendientes FFE']) || 0,
            detalleAcademicoId: detalles.find(d => d.codigoGrupo === row['Código Grupo'])?.id || (existingAlumno?.detalleAcademicoId || (detalles.length > 0 ? detalles[0].id : null))
          };

          const method = existingAlumno ? 'PUT' : 'POST';
          const url = existingAlumno ? `/api/alumnos/${existingAlumno.id}` : '/api/alumnos';

          try {
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(studentData)
            });
            if (res.ok) {
              if (existingAlumno) updateCount++;
              else successCount++;
            }
          } catch (err) {
            console.error('Error processing student:', studentData.nombre, err);
          }
        }
        
        fetchAlumnos();
        alert(`Importación finalizada:\n- Alumnos nuevos: ${successCount}\n- Alumnos actualizados: ${updateCount}`);
      } catch (error) {
        console.error('Error al importar Excel:', error);
        alert('Hubo un error al procesar el archivo Excel.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleSort = (field: 'nombre' | 'apellidos' | 'horas') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedAlumnos = alumnos
    .filter(alumno => {
      const searchTerms = searchTerm.toLowerCase();
      const matchesSearch = 
        alumno.nombre.toLowerCase().includes(searchTerms) ||
        alumno.apellidos.toLowerCase().includes(searchTerms) ||
        alumno.dni.toLowerCase().includes(searchTerms) ||
        alumno.emailEduca.toLowerCase().includes(searchTerms) ||
        alumno.emailPersonal.toLowerCase().includes(searchTerms);

      const isAssigned = relaciones.some(rel => 
        rel.alumnosRelacion.some(ar => ar.alumnoId === alumno.id)
      );

      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'pending' && !isAssigned) ||
        (filterStatus === 'assigned' && isAssigned);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'nombre') {
        comparison = a.nombre.localeCompare(b.nombre);
      } else if (sortBy === 'apellidos') {
        comparison = a.apellidos.localeCompare(b.apellidos);
      } else if (sortBy === 'horas') {
        comparison = (a.horasPendientesFFE || 0) - (b.horasPendientesFFE || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-xl lg:text-2xl font-bold font-sans text-text-main tracking-tight">Alumnado del Curso</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
            title="Descargar plantilla Excel"
          >
            <Download className="h-4 w-4" />
            Plantilla
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
            title="Importar desde Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isImporting ? 'Importando...' : 'Importar Excel'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button
            onClick={() => handleOpenForm(null)}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            + Registrar Alumno
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellidos, DNI, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-sans"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Vista Tabla"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-100 border-none rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 cursor-pointer"
            >
              <option value="all">Todos los Alumnos</option>
              <option value="pending">Pendiente de Asignar</option>
              <option value="assigned">Asignados</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
           <span className="text-[10px] items-center flex uppercase tracking-wider text-slate-500 font-bold mr-2">Ordenar por:</span>
           {[
             { id: 'apellidos', label: 'Apellidos' },
             { id: 'nombre', label: 'Nombre' },
             { id: 'horas', label: 'Horas FFE' }
           ].map(option => (
             <button
               key={option.id}
               onClick={() => toggleSort(option.id as any)}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                 sortBy === option.id 
                   ? 'bg-blue-50 text-blue-600 border-blue-200 ring-4 ring-blue-500/5' 
                   : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
               }`}
             >
               {option.label}
               {sortBy === option.id && (
                 <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
               )}
             </button>
           ))}
        </div>
      </div>

      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="p-8 text-center transition-all">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">¿Eliminar alumno?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">Esta acción eliminará el expediente del alumno de forma permanente y no se puede deshacer.</p>
              
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
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden scroll-auto">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{editing ? 'Editar Expediente' : 'Nuevo Registro de Alumno'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre</label>
                <input required className={inputClass} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Apellidos</label>
                <input required className={inputClass} value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>DNI / Pasaporte</label>
                <input required className={inputClass} value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Número Seguridad Social</label>
                <input required className={inputClass} value={formData.numSS} onChange={e => setFormData({...formData, numSS: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input required className={inputClass} value={formData.tlfn} onChange={e => setFormData({...formData, tlfn: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Fecha Nacimiento</label>
                <input required type="date" className={inputClass} value={formData.fechaNacimiento} onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Email EducaMadrid</label>
                <input required type="email" className={inputClass} value={formData.emailEduca} onChange={e => setFormData({...formData, emailEduca: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Email Personal</label>
                <input required type="email" className={inputClass} value={formData.emailPersonal} onChange={e => setFormData({...formData, emailPersonal: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Horas Pendientes FFE</label>
                <input required type="number" min="0" className={inputClass} value={formData.horasPendientesFFE} onChange={e => setFormData({...formData, horasPendientesFFE: Number(e.target.value)})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Detalle Académico Asignado</label>
                <select 
                  required
                  className={inputClass}
                  value={formData.detalleAcademicoId || ''}
                  onChange={e => setFormData({...formData, detalleAcademicoId: Number(e.target.value)})}
                >
                  <option value="" disabled>Selecciona un detalle académico</option>
                  {detalles.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.ciclo} - {(d as any).centroNombre} ({d.grado})
                    </option>
                  ))}
                </select>
                {detalles.length === 0 && (
                  <p className="text-xs text-red-500 mt-1 font-medium italic">
                    * Debes crear al menos un detalle académico primero.
                  </p>
                )}
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-all">
                  Descartar
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedAlumnos.map(alumno => {
            const isAssigned = relaciones.some(rel => 
              rel.alumnosRelacion.some(ar => ar.alumnoId === alumno.id)
            );

            return (
              <div key={alumno.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full">
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 group-hover:bg-primary/5 transition-colors">
                      <User className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => setAcademicDetailAlumno(alumno)} 
                        className={`p-1.5 transition-colors rounded-md ${alumno.detalleAcademicoId ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                        title="Detalles Académicos"
                      >
                        <GraduationCap className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleOpenForm(alumno)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary-light rounded-md">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(alumno.id!)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-md">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-base text-slate-900 leading-tight mb-0.5">{alumno.nombre} {alumno.apellidos}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DNI: {alumno.dni}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-50 pt-4 mt-auto">
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                      <Mail className="h-3.5 w-3.5 text-slate-300" /> <span className="truncate">{alumno.emailEduca}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                      <Phone className="h-3.5 w-3.5 text-slate-300" /> {alumno.tlfn}
                    </div>
                    {isAssigned ? (
                      <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mt-1 border border-emerald-100/50">
                        <CheckCircle className="h-3.5 w-3.5" /> Alumno Asignado
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-1 border border-amber-100/50">
                        <Clock className="h-3.5 w-3.5" /> Pendiente de Asignación
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                   {alumno.cvPath ? (
                     <a 
                       href={`/${alumno.cvPath}`} 
                       target="_blank" 
                       rel="noreferrer"
                       className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider hover:underline"
                     >
                       <CheckCircle className="h-4 w-4 text-emerald-500" /> CV Adjunto
                     </a>
                   ) : (
                     <label className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                       <FileUp className="h-4 w-4" />
                       Subir CV (.pdf)
                       <input type="file" className="hidden" accept=".pdf" onChange={e => e.target.files && handleFileUpload(alumno.id!, e.target.files[0])} />
                     </label>
                   )}
                   <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest opacity-50">#{alumno.id}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alumno</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">DNI / Pasaporte</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email EducaMadrid</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Asignación</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">FFE Pte.</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedAlumnos.map((alumno) => {
                const isAssigned = relaciones.some(rel => 
                  rel.alumnosRelacion.some(ar => ar.alumnoId === alumno.id)
                );

                return (
                  <tr key={alumno.id} className="hover:bg-slate-50/50 transition-colors group font-sans">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{alumno.nombre}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{alumno.apellidos}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600 font-mono">{alumno.dni}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                        <Phone className="h-3.5 w-3.5 text-slate-300" /> {alumno.tlfn}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-500 truncate max-w-[180px] font-medium">
                        {alumno.emailEduca}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-tight border border-emerald-100">
                          Asignado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-tight border border-amber-100">
                          Pdte. Asignar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(alumno.horasPendientesFFE || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                          <Clock className="h-3 w-3" /> {alumno.horasPendientesFFE} Horas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                          <CheckCircle className="h-3 w-3" /> Completado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                         <button onClick={() => setAcademicDetailAlumno(alumno)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Ver Expediente">
                          <GraduationCap className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleOpenForm(alumno)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(alumno.id!)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAndSortedAlumnos.length === 0 && (
            <div className="p-20 text-center">
              <Search className="h-12 w-12 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold text-sm">No se encontraron alumnos con los criterios de búsqueda.</p>
            </div>
          )}
        </div>
      )}


      {academicDetailAlumno && (
        <DetalleAcademicoModal 
          alumno={academicDetailAlumno} 
          onClose={() => {
            setAcademicDetailAlumno(null);
            fetchAlumnos();
          }} 
        />
      )}
    </div>
  );
}
