import React, { useState, useEffect } from 'react';
import { FFEInformeRow } from '../../../types/index.ts';
import { CalendarDays, FileBadge, Loader2 } from 'lucide-react';

export function ValoracionTab({ cursoId }: { cursoId: number }) {
  const today = new Date();
  const [fecha, setFecha] = useState(today.toISOString().slice(0, 10));
  const [rows, setRows] = useState<FFEInformeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ffe/informe?cursoId=${cursoId}&fechaEvaluacion=${fecha}`);
        if (!res.ok) throw new Error('Error al cargar el informe');
        setRows(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    })();
  }, [cursoId, fecha]);

  const conFFE = rows.filter(r => r.relacionId !== null);
  const sinFFE = rows.filter(r => r.relacionId === null);
  const allOK = conFFE.filter(r => r.resultadoFFE === 'Todos los RA superados');
  const sinEvaluar = conFFE.filter(r => r.resultadoFFE === 'Sin evaluar');
  const conPendientes = conFFE.filter(r => r.resultadoFFE !== 'Todos los RA superados' && r.resultadoFFE !== 'Sin evaluar' && r.resultadoFFE !== 'FFE No cursada');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <FileBadge className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Valoración FFE</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Fecha de evaluación</span>
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Summary cards row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-slate-800">{rows.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Alumnos</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-emerald-600">{conFFE.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Con FFE</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-amber-600">{sinFFE.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">No cursada</span>
        </div>
      </div>

      {/* Summary cards row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-slate-500">{sinEvaluar.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Sin evaluar</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-blue-600">{allOK.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Todos los RA superados</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-red-600">{conPendientes.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Con algún RA pendiente</span>
        </div>
      </div>

      {/* Table */}
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileBadge className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No hay datos de valoración para el mes seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alumno</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Nivel</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Horas FFE</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultado FFE</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nota final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(r => (
                <tr key={r.alumnoId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="text-sm font-semibold text-slate-800">{r.apellidos}, {r.nombre}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="text-xs font-bold text-slate-500">{r.nivel}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="font-mono text-sm font-bold text-slate-700">
                      {r.relacionId === null ? r.totalHorasFFE : r.horasRealizadas}h
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold leading-relaxed ${r.relacionId === null ? 'text-amber-600' : r.resultadoFFE === 'Todos los RA superados' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.resultadoFFE.split('\n').map((line, i) => (
                        <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
                      ))}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-bold text-slate-700">{r.notaFinal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
