import React from 'react';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ConvenioEstado, ConvenioEstadoLabels } from '../../../types/index.ts';
import { ConvenioExtendido } from '../hooks/useConvenios.ts';
import { getStatusButton } from '../utils/conveniosUtils.ts';

interface ConvenioDetalleProps {
  selectedConvenio: ConvenioExtendido | null;
  onAdvanceStatus:  (c: ConvenioExtendido) => void;
  onMoveBackStatus: (c: ConvenioExtendido) => void;
}

export function ConvenioDetalle({
  selectedConvenio, onAdvanceStatus, onMoveBackStatus,
}: ConvenioDetalleProps) {

  if (!selectedConvenio) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="bg-slate-50 p-6 rounded-full mb-4">
          <FileText className="h-12 w-12 text-slate-200" />
        </div>
        <h3 className="text-base font-bold text-text-main mb-2">Selecciona un convenio</h3>
        <p className="text-xs text-text-muted">
          Elige uno de la lista para ver el flujo de trabajo y gestionar las firmas.
        </p>
      </div>
    );
  }

  const statusBtn = getStatusButton(selectedConvenio.estado);

  return (
    <div className="flex-1 flex flex-col">
      {/* Cabecera */}
      <div className="p-6 border-b border-border-base">
        <h2 className="text-lg font-bold text-text-main leading-tight">Detalle del Convenio</h2>
        <p className="text-sm text-text-muted mt-1">Ref: {selectedConvenio.empresaNombre}</p>
      </div>

      {/* Cuerpo */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6">

        <div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Estado Actual</div>
          <div className="text-sm font-bold text-warning">
            {ConvenioEstadoLabels[selectedConvenio.estado]}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Centro Educativo</div>
          <div className="text-sm font-bold text-text-main">{selectedConvenio.centroNombre}</div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Empresa Colaboradora</div>
          <div className="text-sm font-bold text-text-main">{selectedConvenio.empresaNombre}</div>
        </div>

        {/* Acciones de estado */}
        <div className="pt-6 border-t border-border-base">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">
            Acciones de Estado
          </div>
          <div className="space-y-3">
            {statusBtn ? (
              <button
                onClick={() => onAdvanceStatus(selectedConvenio)}
                className={`w-full text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:brightness-90 transition-all shadow-md ${statusBtn.color}`}
              >
                {React.createElement(statusBtn.icon, { className: 'h-4 w-4' })}
                {statusBtn.label}
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> TRÁMITE COMPLETADO
              </div>
            )}

            {selectedConvenio.estado !== ConvenioEstado.PENDIENTE_ENVIAR && (
              <button
                onClick={() => onMoveBackStatus(selectedConvenio)}
                className="w-full py-3 border border-border-base text-text-muted rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Regresar Estado Anterior
              </button>
            )}
          </div>

          {statusBtn && (
            <p className="text-[10px] text-text-muted text-center mt-4">
              Al pulsar '{statusBtn.label}', se actualizará el estado de la tramitación.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
