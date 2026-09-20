import {Send, ShieldCheck} from 'lucide-react';
import {ComunicacionDATEstado} from '@/src/types';

export const COM_DAT_STATUS_LABELS: Record<string, string> = {
    PENDIENTE_ENVIAR_DIRECTOR: 'Pendiente enviar a director',
    PENDIENTE_FIRMA_DIRECTOR: 'Pendiente firma director',
    COMPLETADO: 'Completado',
};

export const getStatusButton = (estado: ComunicacionDATEstado) => {
    switch (estado) {
        case ComunicacionDATEstado.PENDIENTE_ENVIAR_DIRECTOR:
            return {label: 'Enviar a Dirección', icon: Send, color: 'bg-primary'};
        case ComunicacionDATEstado.PENDIENTE_FIRMA_DIRECTOR:
            return {label: 'Recibido de Dirección', icon: ShieldCheck, color: 'bg-success'};
        default:
            return null;
    }
};

export const getNextEstado = (estado: ComunicacionDATEstado): ComunicacionDATEstado => {
    switch (estado) {
        case ComunicacionDATEstado.PENDIENTE_ENVIAR_DIRECTOR:
            return ComunicacionDATEstado.PENDIENTE_FIRMA_DIRECTOR;
        case ComunicacionDATEstado.PENDIENTE_FIRMA_DIRECTOR:
            return ComunicacionDATEstado.COMPLETADO;
        default:
            return estado;
    }
};

export const getPrevEstado = (estado: ComunicacionDATEstado): ComunicacionDATEstado => {
    switch (estado) {
        case ComunicacionDATEstado.PENDIENTE_FIRMA_DIRECTOR:
            return ComunicacionDATEstado.PENDIENTE_ENVIAR_DIRECTOR;
        case ComunicacionDATEstado.COMPLETADO:
            return ComunicacionDATEstado.PENDIENTE_FIRMA_DIRECTOR;
        default:
            return estado;
    }
};
