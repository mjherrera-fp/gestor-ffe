import React from 'react';
import { Send, Clock, ShieldCheck } from 'lucide-react';
import { ConvenioEstado, ConvenioEstadoLabels } from '../../../types/index.ts';

// ─────────────────────────────────────────
//  BOTÓN DE ACCIÓN SEGÚN ESTADO
// ─────────────────────────────────────────

export const getStatusButton = (estado: ConvenioEstado) => {
  switch (estado) {
    case ConvenioEstado.PENDIENTE_ENVIAR:
      return { label: 'Enviar a Empresa', icon: Send, color: 'bg-primary' };
    case ConvenioEstado.PENDIENTE_FIRMA_EMPRESA:
      return { label: 'Recibido de Empresa', icon: Clock, color: 'bg-warning' };
    case ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR:
      return { label: 'Enviar a Dirección', icon: Send, color: 'bg-primary' };
    case ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR:
      return { label: 'Recibido de Dirección', icon: ShieldCheck, color: 'bg-success' };
    default:
      return null;
  }
};

// ─────────────────────────────────────────
//  TRANSICIONES DE ESTADO
// ─────────────────────────────────────────

export const getNextConvenioEstado = (estado: ConvenioEstado): ConvenioEstado => {
  switch (estado) {
    case ConvenioEstado.PENDIENTE_ENVIAR: return ConvenioEstado.PENDIENTE_FIRMA_EMPRESA;
    case ConvenioEstado.PENDIENTE_FIRMA_EMPRESA: return ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR;
    case ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR: return ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR;
    case ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR: return ConvenioEstado.COMPLETADO;
    default: return estado;
  }
};

export const getPrevConvenioEstado = (estado: ConvenioEstado): ConvenioEstado => {
  switch (estado) {
    case ConvenioEstado.PENDIENTE_FIRMA_EMPRESA: return ConvenioEstado.PENDIENTE_ENVIAR;
    case ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR: return ConvenioEstado.PENDIENTE_FIRMA_EMPRESA;
    case ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR: return ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR;
    case ConvenioEstado.COMPLETADO: return ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR;
    default: return estado;
  }
};
