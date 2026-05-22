import { formatDateTime } from '../../../lib/dateUtils.ts';
import { useHistoricoConvenios } from '../hooks/useHistorico.ts';
import Pagination from '../../../components/Pagination.tsx';

const TIPOS_OPERACION = ['', 'CREATE', 'UPDATE', 'DELETE'];

export default function TabOperacionesConvenio() {
  const { filtros, actualizarFiltro, limpiarFiltros, page, setPage, limit, setLimit, resultado } = useHistoricoConvenios();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Tipo operación</label>
            <select
              value={filtros.tipoOperacion}
              onChange={e => actualizarFiltro('tipoOperacion', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary bg-white"
            >
              <option value="">Todos</option>
              {TIPOS_OPERACION.filter(Boolean).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Fecha desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={e => actualizarFiltro('fechaDesde', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Fecha hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={e => actualizarFiltro('fechaHasta', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
        <button onClick={limpiarFiltros} className="mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase transition-colors">
          Limpiar filtros
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Operación</th>
                <th className="text-left px-4 py-3">Referencia</th>
                <th className="text-left px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {resultado?.data.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateTime(r.fecha_hora)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      r.tipo_operacion === 'CREATE' ? 'bg-emerald-50 text-emerald-600'
                      : r.tipo_operacion === 'UPDATE' ? 'bg-amber-50 text-amber-600'
                      : r.tipo_operacion === 'DELETE' ? 'bg-red-50 text-red-600'
                      : 'bg-slate-50 text-slate-500'
                    }`}>
                      {r.tipo_operacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{r.referencia || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.convenio_id || '—'}</td>
                </tr>
              ))}
              {(!resultado?.data || resultado.data.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
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
