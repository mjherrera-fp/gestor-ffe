import React, { useState, useEffect } from 'react';
import { FFEInformeRow } from '../../../types/index.ts';
import { CalendarDays, FileBadge, Loader2 } from 'lucide-react';

export function ValoracionTab({ cursoId, detalleAcademicoId }: { cursoId: number; detalleAcademicoId?: number }) {
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
        const params = new URLSearchParams({ cursoId: String(cursoId), fechaEvaluacion: fecha });
        if (detalleAcademicoId) params.set('detalleAcademicoId', String(detalleAcademicoId));
        const res = await fetch(`/api/ffe/informe?${params}`);
        if (!res.ok) throw new Error('Error al cargar el informe');
        setRows(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    })();
  }, [cursoId, detalleAcademicoId, fecha]);

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
          <div className="p-2 rounded-lg bg-primary-light text-primary">
            <FileBadge className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-text-main">Valoración FFE</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-muted">Fecha de evaluación</span>
          <CalendarDays className="h-4 w-4 text-text-muted" />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="bg-surface-card border border-border-base rounded-lg px-3 py-1.5 text-sm font-medium text-text-main outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Summary cards row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-xl border border-border-base p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-text-main">{rows.length}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Alumnos</span>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-base p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-success">{conFFE.length}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Con FFE</span>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-base p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-warning-strong">{sinFFE.length}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">No cursada</span>
        </div>
      </div>

      {/* Summary cards row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-xl border border-border-base p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-text-muted">{sinEvaluar.length}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Sin evaluar</span>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-base p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-primary">{allOK.length}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Todos los RA superados</span>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-base p-4 flex flex-col items-center text-center">
          <span className="text-2xl font-black text-danger">{conPendientes.length}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Con algún RA pendiente</span>
        </div>
      </div>

      {/* Table */}
      {error && <p className="text-sm text-danger font-medium">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-card rounded-xl border border-border-base p-12 text-center">
          <FileBadge className="h-10 w-10 mx-auto text-text-muted mb-3" />
          <p className="text-sm font-semibold text-text-muted">No hay datos de valoración para el mes seleccionado.</p>
        </div>
      ) : (
        <div className="bg-surface-card rounded-xl border border-border-base shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-200">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-base">
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Alumno</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Nivel</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Horas FFE</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Resultado FFE</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Nota final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {rows.map(r => (
                <tr key={r.alumnoId} className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="text-sm font-semibold text-text-main">{r.apellidos}, {r.nombre}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="text-xs font-bold text-text-muted">{r.nivel}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {/* Las horas del nivel y, entre paréntesis, las que faltan a
                        la fecha de evaluación. Antes salían solo las realizadas,
                        que no es lo que promete el rótulo: un alumno con 500h
                        asignadas y 380 cumplidas ponía "380h" y parecía que
                        tenía 380 horas que hacer. */}
                    <span className="font-mono text-sm font-bold text-text-main">
                      {r.totalHorasFFE}h
                    </span>
                    <span className="font-mono text-xs font-semibold text-text-muted">
                      {' '}({r.horasPendientes}h)
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold leading-relaxed ${r.relacionId === null ? 'text-warning-strong' : r.resultadoFFE === 'Todos los RA superados' ? 'text-success' : 'text-danger'}`}>
                      {r.resultadoFFE.split('\n').map((line, i) => (
                        <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
                      ))}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-bold text-text-main">{r.notaFinal}</span>
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
