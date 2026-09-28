// components/StatusBadge.tsx
import React from 'react';
import { ConvenioEstado, ConvenioEstadoLabels } from '../../../types/index.ts';
import { Title } from '../../../components/Title.tsx';
import { colorEstado, type NivelEstado } from '../../../utils/escalaEstados.ts';

// El convenio sigue los mismos cuatro niveles que la relacion: nada enviado,
// enviado, a la espera de una firma y terminado. Antes cada estado traia su
// propia cadena de clases, lo que hacia que "pendiente de enviar a empresa"
// saliese en naranja mientras su equivalente en la relacion salia en azul.
const NIVELES: Record<ConvenioEstado, NivelEstado> = {
  [ConvenioEstado.PENDIENTE_ENVIAR]:          'PENDIENTE',
  [ConvenioEstado.PENDIENTE_FIRMA_EMPRESA]:   'ESPERA_FIRMA',
  [ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'EN_CURSO',
  [ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR]:  'ESPERA_FIRMA',
  [ConvenioEstado.COMPLETADO]:                'TERMINADO',
};

export const StatusBadge = ({ estado }: { estado: ConvenioEstado }) => (
  <Title text={ConvenioEstadoLabels[estado]}>
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colorEstado(NIVELES[estado])}`}>
      {ConvenioEstadoLabels[estado]}
    </span>
  </Title>
);
