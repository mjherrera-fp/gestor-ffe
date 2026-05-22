import { formatDateTime } from '../../../lib/dateUtils.ts';
import { useHistoricoEstados } from '../hooks/useHistorico.ts';
import Pagination from '../../../components/Pagination.tsx';

const TIPOS_PROCESO = ['', 'convenio', 'relacion', 'plan_formativo', 'seguimiento', 'valoracion'];

const LABELS: Record<string, string> = {
  convenio: 'Convenio',
  relacion: 'Relación',
  plan_formativo: 'Plan Formativo',
  seguimiento: 'Seguimiento',
  valoracion: 'Valoración',
};

export default function TabCambiosEstado() {
  const { filtros, actualizarFiltro, limpiarFiltros, page, setPage, limit, setLimit, resultado } = useHistoricoEstados();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Tipo de proceso</label>
            <select
              value={filtros.tipoProceso}
              onChange={e => actualizarFiltro('tipoProceso', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary bg-white"
            >
              <option value="">Todos</option>
              {TIPOS_PROCESO.filter(Boolean).map(t => (
                <option key={t} value={t}>{LABELS[t] || t}</option>
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
                <th className="text-left px-4 py-3">Proceso</th>
                <th className="text-left px-4 py-3">Estado origen</th>
                <th className="text-left px-4 py-3">Estado destino</th>
                <th className="text-left px-4 py-3">Referencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {resultado?.data.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateTime(r.fecha_hora)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-600 uppercase">
                      {LABELS[r.tipo_proceso] || r.tipo_proceso}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.estado_origen}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary">{r.estado_destino}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.referencia || r.entidad_id || '—'}</td>
                </tr>
              ))}
              {(!resultado?.data || resultado.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No hay cambios de estado registrados
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
