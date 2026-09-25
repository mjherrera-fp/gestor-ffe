import { useEffect } from 'react';
import { formatDate, formatDateTime } from '../../../lib/dateUtils.ts';
import { useHistoricoAnulaciones } from '../hooks/useHistorico.ts';
import Pagination from '../../../components/Pagination.tsx';

interface Props {
  initialAlumnoId?: number | null;
}

export default function TabAnulacionesFFE({ initialAlumnoId }: Props) {
  const { filtros, actualizarFiltro, limpiarFiltros, page, setPage, limit, setLimit, resultado } = useHistoricoAnulaciones();

  useEffect(() => {
    if (initialAlumnoId) {
      actualizarFiltro('alumnoId', String(initialAlumnoId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAlumnoId]);

  return (
    <div className="space-y-4">
      <div className="bg-surface-card rounded-2xl border border-border-base p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">ID del alumno</label>
            <input
              type="number"
              value={filtros.alumnoId}
              onChange={e => actualizarFiltro('alumnoId', e.target.value)}
              placeholder="Filtrar por ID"
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary bg-surface-card"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Buscar</label>
            <input
              type="text"
              value={filtros.texto}
              onChange={e => actualizarFiltro('texto', e.target.value)}
              placeholder="Alumno, DNI, empresa, motivo…"
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary bg-surface-card"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Fecha desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={e => actualizarFiltro('fechaDesde', e.target.value)}
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Fecha hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={e => actualizarFiltro('fechaHasta', e.target.value)}
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
        <button onClick={limpiarFiltros} className="mt-3 text-[10px] font-bold text-text-muted hover:text-text-main uppercase transition-colors">
          Limpiar filtros
        </button>
      </div>

      <div className="bg-surface-card rounded-2xl border border-border-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-surface-subtle text-text-muted font-bold text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-3">Alumno</th>
                <th className="text-left px-4 py-3">Horas</th>
                <th className="text-left px-4 py-3">Fecha anulación</th>
                <th className="text-left px-4 py-3">Registrado</th>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {resultado?.data.map((r: any) => (
                <tr key={r.id} className="hover:bg-surface-hover/50 transition-colors align-top">
                  <td className="px-4 py-3">
                    <div className="font-bold text-text-main">
                      {r.apellidosAlumno}, {r.nombreAlumno}
                    </div>
                    <div className="text-text-muted font-mono text-[10px] mt-0.5">
                      {r.dniAlumno} {r.alumnoId ? `· #${r.alumnoId}` : ''}
                    </div>
                    {r.refRelacion && (
                      <div className="text-primary font-mono text-[10px] mt-0.5">Ref: {r.refRelacion}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-text-muted">
                      <span className="font-black text-text-main">{r.totalHorasOriginal}h</span>
                      {' → '}
                      <span className="font-black text-danger">{r.totalHorasNuevo}h</span>
                    </div>
                    <div className="text-[10px] text-warning-strong font-bold mt-0.5">
                      {r.horasRealizadas}h realizadas
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-text-main font-medium">
                    {formatDate(r.fechaAnulacion)}
                    {r.fechaInicio && (
                      <div className="text-[10px] text-text-muted font-semibold mt-0.5">Inicio: {formatDate(r.fechaInicio)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTime(r.fechaHora)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-main">{r.empresa || '—'}</div>
                    {r.tutor && <div className="text-[10px] text-text-muted font-semibold mt-0.5">Tutor: {r.tutor}</div>}
                    {r.cif && <div className="text-[10px] text-text-muted font-mono mt-0.5">{r.cif}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-main max-w-xs">{r.motivo || '—'}</td>
                </tr>
              ))}
              {(!resultado?.data || resultado.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-xs">
                    No hay anulaciones de FFE registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {resultado && (
          <Pagination
            page={resultado.page}
            totalPages={resultado.totalPages}
            limit={resultado.limit}
            total={resultado.total}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}