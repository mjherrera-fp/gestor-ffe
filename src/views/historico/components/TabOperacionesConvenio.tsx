import { formatDateTime } from '../../../lib/dateUtils.ts';
import { useHistoricoConvenios } from '../hooks/useHistorico.ts';
import Pagination from '../../../components/Pagination.tsx';

const TIPOS_OPERACION = ['', 'CREATE', 'UPDATE', 'DELETE'];

export default function TabOperacionesConvenio() {
  const { filtros, actualizarFiltro, limpiarFiltros, page, setPage, limit, setLimit, resultado } = useHistoricoConvenios();

  return (
    <div className="space-y-4">
      <div className="bg-surface-card rounded-2xl border border-border-base p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Tipo operación</label>
            <select
              value={filtros.tipoOperacion}
              onChange={e => actualizarFiltro('tipoOperacion', e.target.value)}
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary bg-surface-card"
            >
              <option value="">Todos</option>
              {TIPOS_OPERACION.filter(Boolean).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-subtle text-text-muted font-bold text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Operación</th>
                <th className="text-left px-4 py-3">Referencia</th>
                <th className="text-left px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {resultado?.data.map((r: any) => (
                <tr key={r.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTime(r.fecha_hora)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      r.tipo_operacion === 'CREATE' ? 'bg-success-soft text-success-strong'
                      : r.tipo_operacion === 'UPDATE' ? 'bg-warning-soft text-warning-strong'
                      : r.tipo_operacion === 'DELETE' ? 'bg-danger-soft text-danger'
                      : 'bg-surface-hover text-text-muted'
                    }`}>
                      {r.tipo_operacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-main font-medium">{r.referencia || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{r.convenio_id || '—'}</td>
                </tr>
              ))}
              {(!resultado?.data || resultado.data.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-muted text-xs">
                    No hay operaciones de convenio registradas
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
