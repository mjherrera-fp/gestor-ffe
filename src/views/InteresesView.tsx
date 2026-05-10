import React, { useState, useEffect } from 'react';
import { Heart, Trophy, User, Building2, ChevronRight, CheckCircle2, Circle, Briefcase, Search, X, Send } from 'lucide-react';
import { Alumno, Empresa, InteresAlumnoEmpresa } from '../types/index.ts';

interface Props {
  cursoId: number;
}

export default function InteresesView({ cursoId }: Props) {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [intereses, setIntereses] = useState<InteresAlumnoEmpresa[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [searchAlumno, setSearchAlumno] = useState('');
  const [searchEmpresa, setSearchEmpresa] = useState('');

  const fetchData = async () => {
    const [alRes, emRes, intRes] = await Promise.all([
      fetch(`/api/alumnos?cursoId=${cursoId}`),
      fetch('/api/empresas'),
      fetch('/api/intereses')
    ]);
    setAlumnos(await alRes.json());
    setEmpresas(await emRes.json());
    setIntereses(await intRes.json());
  };

  useEffect(() => {
    fetchData();
  }, [cursoId]);

  const toggleInteres = async (alumnoId: number, empresaId: number, interesado: 'alumno' | 'empresa') => {
    const exists = intereses.find(i => i.alumnoId === alumnoId && i.empresaId === empresaId && i.interesado === interesado);
    if (exists) {
      await fetch('/api/intereses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumnoId, empresaId, interesado })
      });
    } else {
      await fetch('/api/intereses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumnoId, empresaId, interesado })
      });
    }
    fetchData();
  };

  const isMatched = (alId: number, emId: number) => {
    const iA = intereses.some(i => i.alumnoId === alId && i.empresaId === emId && i.interesado === 'alumno');
    const iE = intereses.some(i => i.alumnoId === alId && i.empresaId === emId && i.interesado === 'empresa');
    return { iA, iE, fullyMatched: iA && iE };
  };

  const filteredAlumnos = alumnos.filter(al => 
    al.nombre.toLowerCase().includes(searchAlumno.toLowerCase()) ||
    al.apellidos.toLowerCase().includes(searchAlumno.toLowerCase())
  );

  const filteredEmpresas = empresas.filter(em => 
    em.nombre.toLowerCase().includes(searchEmpresa.toLowerCase()) ||
    em.ciudad.toLowerCase().includes(searchEmpresa.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-start">
      {/* Alumnos Sidebar Card */}
      <div className="w-full lg:w-75 lg:shrink-0 bg-white rounded-xl border border-border-base shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border-base bg-slate-50/50 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Listado de Alumnado</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alumno..."
              value={searchAlumno}
              onChange={(e) => setSearchAlumno(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
            />
            {searchAlumno && (
              <button 
                onClick={() => setSearchAlumno('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="lg:overflow-y-auto divide-y divide-border-base max-h-75 lg:max-h-full">
          {filteredAlumnos.map(al => {
            const alumnoMatches = intereses.filter(i => i.alumnoId === al.id && i.interesado === 'alumno').length;
            const companyInterests = intereses.filter(i => i.alumnoId === al.id && i.interesado === 'empresa').length;
            
            return (
              <div 
                key={al.id}
                onClick={() => setSelectedAlumno(al)}
                className={`p-5 cursor-pointer transition-colors ${selectedAlumno?.id === al.id ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
              >
                <div className="flex flex-col gap-2">
                  <div className="font-bold text-sm text-text-main leading-tight">{al.nombre} {al.apellidos}</div>
                  <div className="flex gap-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {alumnoMatches} Envíos
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {companyInterests} Solics
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredAlumnos.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              No hay resultados
            </div>
          )}
        </div>
      </div>

      {/* Grid of Interests Card */}
      <div className="w-full flex-1 bg-white rounded-xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden">
        {selectedAlumno ? (
          <>
            <div className="p-6 border-b border-border-base bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text-main leading-tight">{selectedAlumno.nombre} {selectedAlumno.apellidos}</h2>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Interacción Alumno-Empresa</p>
              </div>
              <div className="flex flex-col sm:items-end gap-3">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
                    <Send className="h-3 w-3 text-primary" /> Envío de CV del alumno
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
                    <Briefcase className="h-3 w-3 text-emerald-500" /> Empresa
                  </div>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar empresa por nombre o ciudad..."
                    value={searchEmpresa}
                    onChange={(e) => setSearchEmpresa(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                  />
                  {searchEmpresa && (
                    <button 
                      onClick={() => setSearchEmpresa('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden border-b border-border-base font-sans">
               {/* Mobile Cards for Interests */}
               <div className="lg:hidden divide-y divide-border-base">
                 {filteredEmpresas.map(empresa => {
                   const { iA, iE, fullyMatched } = isMatched(selectedAlumno.id!, empresa.id!);
                   return (
                     <div key={empresa.id} className={`p-4 flex items-center justify-between gap-4 ${fullyMatched ? 'bg-emerald-50/30' : ''}`}>
                       <div className="min-w-0">
                         <h4 className="font-bold text-sm text-text-main truncate">{empresa.nombre}</h4>
                         <p className="text-[10px] text-text-muted">{empresa.ciudad}</p>
                       </div>
                       <div className="flex items-center gap-3 shrink-0">
                          <button 
                            onClick={() => toggleInteres(selectedAlumno.id!, empresa.id!, 'alumno')}
                            className={`p-2 rounded-lg transition-all ${iA ? 'bg-primary text-white shadow-md' : 'text-text-muted bg-slate-50'}`}
                          >
                            <Send className={`h-4 w-4 ${iA ? 'fill-current' : ''}`} />
                          </button>
                          <button 
                            onClick={() => toggleInteres(selectedAlumno.id!, empresa.id!, 'empresa')}
                            className={`p-2 rounded-lg transition-all ${iE ? 'bg-emerald-600 text-white shadow-md' : 'text-text-muted bg-slate-50'}`}
                          >
                            <Briefcase className="h-4 w-4" />
                          </button>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${fullyMatched ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-300'}`}>
                            {fullyMatched ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </div>
                       </div>
                     </div>
                   );
                 })}
                 {filteredEmpresas.length === 0 && (
                   <div className="p-20 text-center">
                     <Search className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                     <p className="text-slate-500 font-bold text-sm">No se encontraron empresas.</p>
                   </div>
                 )}
               </div>

               {/* Desktop Table View */}
               <div className="hidden lg:block">
                 <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50 border-b border-border-base text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        <th className="px-6 py-3">Empresa / Institución</th>
                        <th className="px-6 py-3 text-center">Envío de CV</th>
                        <th className="px-6 py-3 text-center">Interés Empresa</th>
                        <th className="px-6 py-3 text-center">Match</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border-base font-sans">
                     {filteredEmpresas.map(empresa => {
                       const { iA, iE, fullyMatched } = isMatched(selectedAlumno.id!, empresa.id!);
                       return (
                         <tr key={empresa.id} className={`transition-colors ${fullyMatched ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                           <td className="px-6 py-4">
                              <p className="font-bold text-sm text-text-main">{empresa.nombre}</p>
                              <p className="text-[10px] text-text-muted">{empresa.ciudad}</p>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => toggleInteres(selectedAlumno.id!, empresa.id!, 'alumno')}
                                className={`p-2 rounded-lg transition-all ${iA ? 'bg-primary text-white shadow-md shadow-primary/20 scale-110' : 'text-text-muted hover:bg-slate-100'}`}
                              >
                                <Send className={`h-5 w-5 ${iA ? 'fill-current' : ''}`} />
                              </button>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => toggleInteres(selectedAlumno.id!, empresa.id!, 'empresa')}
                                className={`p-2 rounded-lg transition-all ${iE ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-110' : 'text-text-muted hover:bg-slate-100'}`}
                              >
                                <Briefcase className="h-5 w-5" />
                              </button>
                           </td>
                           <td className="px-6 py-4 text-center">
                              {fullyMatched ? (
                                <div className="inline-flex h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center animate-bounce">
                                  <Trophy className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="inline-flex h-8 w-8 rounded-full bg-slate-50 text-slate-200 items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                              )}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
                 {filteredEmpresas.length === 0 && (
                   <div className="p-20 text-center">
                     <Search className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                     <p className="text-slate-500 font-bold text-sm">No se encontraron empresas con esos criterios.</p>
                   </div>
                 )}
               </div>
            </div>

            <div className="p-6 bg-slate-50/50 text-center mt-auto">
               <p className="text-[10px] text-text-muted italic leading-relaxed">
                 Las empresas marcadas en <span className="text-emerald-600 font-bold">verde</span> indican un "Match" (interés mutuo confirmado).
               </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="bg-slate-50 p-8 rounded-full mb-6">
              <Heart className="h-16 w-16 text-slate-100 fill-slate-50" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-2">Panel de Mapeo de Intereses</h3>
            <p className="text-xs text-text-muted max-w-xs leading-relaxed">
              Selecciona un alumno del listado lateral para comenzar a cruzar sus preferencias personales con las solicitudes oficiales de las empresas colaboradoras.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
