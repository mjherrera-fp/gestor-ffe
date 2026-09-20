// components/StatusBadge.tsx
import React from 'react';
import { ConvenioEstado, ConvenioEstadoLabels } from '../../../types/index.ts';
import { Title } from '../../../components/Title.tsx';

const STATUS_STYLES: Record<ConvenioEstado, string> = {
  [ConvenioEstado.PENDIENTE_ENVIAR]:          'bg-warning-soft text-warning-strong',
  [ConvenioEstado.PENDIENTE_FIRMA_EMPRESA]:   'bg-warning-soft text-warning-strong',
  [ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'bg-primary-light text-primary',
  [ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR]:  'bg-primary-light text-primary',
  [ConvenioEstado.COMPLETADO]:                'bg-success-soft text-success-strong',
};

export const StatusBadge = ({ estado }: { estado: ConvenioEstado }) => (
  <Title text={ConvenioEstadoLabels[estado]}>
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[estado]}`}>
      {ConvenioEstadoLabels[estado]}
    </span>
  </Title>
);