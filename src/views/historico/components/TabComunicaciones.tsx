import { formatDateTime } from '../../../lib/dateUtils.ts';
import { useHistoricoComunicaciones } from '../hooks/useHistorico.ts';
import Pagination from '../../../components/Pagination.tsx';

export default function TabComunicaciones() {
  const { filtros, actualizarFiltro, limpiarFiltros, page, setPage, limit, setLimit, resultado } = useHistoricoComunicaciones();

  return (
    <div className="space-y-4">
      <div className="bg-surface-card rounded-2xl border border-border-base p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Destinatario</label>
            <input
              type="text" placeholder="Para, CC o CCO..."
              value={filtros.destinatario}
              onChange={e => actualizarFiltro('destinatario', e.target.value)}
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
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
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Correo</label>
            <input
              type="text" placeholder="Asunto, cuerpo o adjunto..."
              value={filtros.correo}
              onChange={e => actualizarFiltro('correo', e.target.value)}
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Adjuntos</label>
            <select
              value={filtros.tieneAdjuntos}
              onChange={e => actualizarFiltro('tieneAdjuntos', e.target.value)}
              className="w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary bg-surface-card"
            >
              <option value="">Todos</option>
              <option value="true">Con adjuntos</option>
              <option value="false">Sin adjuntos</option>
            </select>
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
                <th className="text-left px-4 py-3">Para</th>
                <th className="text-left px-4 py-3">CC</th>
                <th className="text-left px-4 py-3">CCO</th>
                <th className="text-left px-4 py-3">Asunto</th>
                <th className="text-left px-4 py-3">Adjuntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {resultado?.data.map((r: any) => (
                <tr key={r.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTime(r.fecha_hora)}</td>
                  <td className="px-4 py-3 text-text-main max-w-[150px] truncate">{r.para}</td>
                  <td className="px-4 py-3 text-text-muted max-w-[120px] truncate">{r.cc || '—'}</td>
                  <td className="px-4 py-3 text-text-muted max-w-[120px] truncate">{r.cco || '—'}</td>
                  <td className="px-4 py-3 text-text-main font-medium max-w-[200px] truncate">{r.asunto}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {(() => {
                      const fics = r.ficheros_adjuntos ? JSON.parse(r.ficheros_adjuntos) : [];
                      return fics.length > 0
                        ? <span className="inline-flex gap-1 flex-wrap">{fics.map((f: string, i: number) => (
                            <span key={i} className="bg-surface-hover px-1.5 py-0.5 rounded text-[9px] font-medium text-text-muted">{f}</span>
                          ))}</span>
                        : '—';
                    })()}
                  </td>
                </tr>
              ))}
              {(!resultado?.data || resultado.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-xs">
                    No hay comunicaciones registradas
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
