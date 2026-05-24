// components/StatusBadge.tsx
import React from 'react';
import { ConvenioEstado, ConvenioEstadoLabels } from '../../../types/index.ts';
import { Title } from '../../../components/Title.tsx';

const STATUS_STYLES: Record<ConvenioEstado, string> = {
  [ConvenioEstado.PENDIENTE_ENVIAR]:          'bg-orange-50 text-orange-700',
  [ConvenioEstado.PENDIENTE_FIRMA_EMPRESA]:   'bg-amber-50 text-amber-700',
  [ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'bg-blue-50 text-blue-700',
  [ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR]:  'bg-indigo-50 text-indigo-700',
  [ConvenioEstado.COMPLETADO]:                'bg-emerald-50 text-emerald-700',
};

export const StatusBadge = ({ estado }: { estado: ConvenioEstado }) => (
  <Title text={ConvenioEstadoLabels[estado]}>
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[estado]}`}>
      {ConvenioEstadoLabels[estado]}
    </span>
  </Title>
);