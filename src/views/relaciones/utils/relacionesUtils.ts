import {
  HorarioSemanal,
  HorarioDia,
  RelacionEstado,
  PlanFormativoEstado,
  RelacionEstadoLabels,
  PlanFormativoEstadoLabels,
  SeguimientoEstado,
  SeguimientoEstadoLabels,
  Curso,
  ValoracionEstado,
  ValoracionEstadoLabels,
} from '../../../types/index.ts';
import { Send, Clock, ShieldCheck, Check } from 'lucide-react';

//agrupa las funciones puras: calculateEndDateForHours, getNextRelacionEstado, los colores de badges, etc. Son fácilmente testeables de forma aislada.

// ─────────────────────────────────────────
//  CONSTANTES DE HORARIO POR DEFECTO
// ─────────────────────────────────────────

export const DEFAULT_HORARIO_DIA: HorarioDia = { inicio: '08:00', fin: '17:00', horas: 8 };

export const DEFAULT_HORARIO: HorarioSemanal = {
  lunes:     { ...DEFAULT_HORARIO_DIA },
  martes:    { ...DEFAULT_HORARIO_DIA },
  miercoles: { ...DEFAULT_HORARIO_DIA },
  jueves:    { ...DEFAULT_HORARIO_DIA },
  viernes:   { ...DEFAULT_HORARIO_DIA },
  sabado:    { inicio: '00:00', fin: '00:00', horas: 0 },
  domingo:   { inicio: '00:00', fin: '00:00', horas: 0 },
};

// ─────────────────────────────────────────
//  FORMATEO DE FECHAS
// ─────────────────────────────────────────

export const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getDayName = (day: string): string => {
  const names: Record<string, string> = {
    lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
  };
  return names[day] ?? day;
};

// ─────────────────────────────────────────
//  CÁLCULO DE FECHAS POR HORAS
// ─────────────────────────────────────────

export const calculateEndDateForHours = (
  startDate: string,
  totalHours: number,
  horario: HorarioSemanal | undefined,
  curso: Curso | null
): string | null => {
  if (!startDate || !totalHours || !horario || !curso) return null;

  const startParts = startDate.split('-').map(Number);
  const festivos = curso.festivos || [];
  let remainingHoras = totalHours;
  let current = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  let iterations = 0;

  while (remainingHoras > 0 && iterations < 365) {
    const dateStr = formatDateLocal(current);
    const dayOfWeek = current.getDay();
    const isFestivo = festivos.includes(dateStr);

    if (!isFestivo) {
      let dailyHoras = 0;
      switch (dayOfWeek) {
        case 1: dailyHoras = horario.lunes.horas; break;
        case 2: dailyHoras = horario.martes.horas; break;
        case 3: dailyHoras = horario.miercoles.horas; break;
        case 4: dailyHoras = horario.jueves.horas; break;
        case 5: dailyHoras = horario.viernes.horas; break;
        case 6: dailyHoras = horario.sabado.horas; break;
        case 0: dailyHoras = horario.domingo.horas; break;
      }
      remainingHoras -= dailyHoras;
    }

    if (remainingHoras > 0) current.setDate(current.getDate() + 1);
    iterations++;
  }

  return formatDateLocal(current);
};

export const calculateStartDateFromEnd = (
  targetEndDate: string,
  totalHours: number,
  horario: HorarioSemanal | undefined,
  curso: Curso | null
): string | null => {
  if (!targetEndDate || !totalHours || !horario || !curso) return null;

  const [year, month, day] = targetEndDate.split('-').map(Number);
  const festivos = curso.festivos || [];
  let remainingHoras = totalHours;
  let current = new Date(year, month - 1, day);
  let iterations = 0;

  while (remainingHoras > 0 && iterations < 365) {
    const dateStr = formatDateLocal(current);
    const dayOfWeek = current.getDay();
    const isFestivo = festivos.includes(dateStr);

    if (!isFestivo) {
      let dailyHoras = 0;
      switch (dayOfWeek) {
        case 1: dailyHoras = horario.lunes.horas; break;
        case 2: dailyHoras = horario.martes.horas; break;
        case 3: dailyHoras = horario.miercoles.horas; break;
        case 4: dailyHoras = horario.jueves.horas; break;
        case 5: dailyHoras = horario.viernes.horas; break;
        case 6: dailyHoras = horario.sabado.horas; break;
        case 0: dailyHoras = horario.domingo.horas; break;
      }
      if (dailyHoras > 0) remainingHoras -= dailyHoras;
    }

    if (remainingHoras > 0) current.setDate(current.getDate() - 1);
    iterations++;
  }

  return formatDateLocal(current);
};

// ─────────────────────────────────────────
//  LÓGICA DE ESTADOS (colores y textos)
// ─────────────────────────────────────────

export const getStatusBadgeColor = (estado: string, type: string): string => {
  if (type === 'relacion') {
    if (estado === RelacionEstado.PENDIENTE_ENVIAR_EMPRESA)  return 'bg-blue-50 text-blue-700 border-blue-100';
    if (estado === RelacionEstado.PENDIENTE_FIRMA_EMPRESA)   return 'bg-amber-50 text-amber-700 border-amber-100';
    if (estado === RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (estado === RelacionEstado.PENDIENTE_FIRMA_DIRECTOR)  return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    if (estado === RelacionEstado.COMPLETADO)                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  } else if (type === 'plan') {
    if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE)  return 'bg-blue-50 text-blue-700 border-blue-100';
    if (estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE)  return 'bg-amber-50 text-amber-700 border-amber-100';
    if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA)     return 'bg-blue-50 text-blue-700 border-blue-100';
    if (estado === PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA)      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (estado === PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR)        return 'bg-teal-50 text-teal-700 border-teal-100';
    if (estado === PlanFormativoEstado.COMPLETADO)                   return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  } else if (type === 'seguimiento') {
    if (estado === SeguimientoEstado.PENDIENTE) return 'bg-slate-50 text-slate-500 border-slate-200';
    if (estado === SeguimientoEstado.ENVIADO_A_EMPRESA)   return 'bg-amber-50 text-amber-700 border-amber-100';
    if (estado === SeguimientoEstado.RECIBIDO)  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  } else if (type === 'valoracion') {
    if (estado === ValoracionEstado.PENDIENTE) return 'bg-slate-50 text-slate-500 border-slate-200';
    if (estado === ValoracionEstado.ENVIADO_A_EMPRESA)   return 'bg-amber-50 text-amber-700 border-amber-100';
    if (estado === ValoracionEstado.RECIBIDO)  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  return 'bg-slate-50 text-slate-500 border-slate-200';
};

export const getStatusLabel = (estado: string, type: string): string => {
  if (type === 'relacion') {
    return RelacionEstadoLabels[estado as RelacionEstado] || estado;
  } else if (type === 'plan') {
    return PlanFormativoEstadoLabels[estado as PlanFormativoEstado] || estado;
  } else if (type === 'seguimiento') {
    return SeguimientoEstadoLabels[estado as SeguimientoEstado] || estado;
  } else if (type === 'valoracion') {
    return ValoracionEstadoLabels[estado as ValoracionEstado] || estado;
  }
  return estado;
};

export const getAnexoStatusButton = (estado: string) => {
  switch (estado) {
    case RelacionEstado.PENDIENTE_ENVIAR_EMPRESA:   return { label: 'Enviar Doc. a Empresa',  icon: Send,       color: 'bg-blue-600' };
    case RelacionEstado.PENDIENTE_FIRMA_EMPRESA:    return { label: 'Recibido de Empresa',     icon: Clock,      color: 'bg-amber-500' };
    case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR:  return { label: 'Enviar a Dirección',      icon: Send,       color: 'bg-indigo-600' };
    case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR:   return { label: 'Recibido de Dirección',   icon: ShieldCheck,color: 'bg-emerald-600' };
    default: return null;
  }
};

export const getPlanStatusButton = (estado: string) => {
  switch (estado) {
    case PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE:
    case 'PENDIENTE_ENVIAR_ESTUDIANTE':  return { label: 'Enviar Doc. a Estudiante', icon: Send,        color: 'bg-blue-600' };
    case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE:
    case 'PENDIENTE_FIRMAR_ESTUDIANTE': return { label: 'Recibir Firma Estudiante',  icon: Clock,       color: 'bg-amber-600' };
    case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:
    case 'PENDIENTE_ENVIAR_EMPRESA':    return { label: 'Enviar a Empresa',           icon: Send,        color: 'bg-indigo-600' };
    case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:
    case 'PENDIENTE_FIRMA_EMPRESA':     return { label: 'Recibir Firma Empresa',      icon: Clock,       color: 'bg-emerald-600' };
    case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:
    case 'PENDIENTE_FIRMA_TUTOR':       return { label: 'Recibir Firma Tutor',        icon: ShieldCheck, color: 'bg-teal-600' };
    default: return null;
  }
};

export const getSeguimientoStatusButton = (estado: string) => {
  switch (estado) {
    case SeguimientoEstado.PENDIENTE: return { label: 'Marcar como Enviado', icon: Send,        color: 'bg-blue-600' };
    case SeguimientoEstado.ENVIADO_A_EMPRESA: return { label: 'Marcar como Recibido', icon: Check,       color: 'bg-emerald-600' };
    default: return null;
  }
};

export const getValoracionStatusButton = (estado: string) => {
  switch (estado) {
    case ValoracionEstado.PENDIENTE: return { label: 'Marcar como Enviado', icon: Send,        color: 'bg-blue-600' };
    case ValoracionEstado.ENVIADO_A_EMPRESA: return { label: 'Marcar como Recibido', icon: Check,       color: 'bg-emerald-600' };
    default: return null;
  }
};

// ─────────────────────────────────────────
//  TRANSICIONES DE ESTADO (RELACIÓN)
// ─────────────────────────────────────────

export const getNextRelacionEstado = (estado: RelacionEstado): RelacionEstado => {
  switch (estado) {
    case RelacionEstado.PENDIENTE_ENVIAR_EMPRESA:   return RelacionEstado.PENDIENTE_FIRMA_EMPRESA;
    case RelacionEstado.PENDIENTE_FIRMA_EMPRESA:    return RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR;
    case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR:  return RelacionEstado.PENDIENTE_FIRMA_DIRECTOR;
    case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR:   return RelacionEstado.COMPLETADO;
    default: return estado;
  }
};

export const getPrevRelacionEstado = (estado: RelacionEstado): RelacionEstado => {
  switch (estado) {
    case RelacionEstado.PENDIENTE_FIRMA_EMPRESA:    return RelacionEstado.PENDIENTE_ENVIAR_EMPRESA;
    case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR:  return RelacionEstado.PENDIENTE_FIRMA_EMPRESA;
    case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR:   return RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR;
    case RelacionEstado.COMPLETADO:                 return RelacionEstado.PENDIENTE_FIRMA_DIRECTOR;
    default: return estado;
  }
};

// ─────────────────────────────────────────
//  TRANSICIONES DE ESTADO (PLAN FORMATIVO)
// ─────────────────────────────────────────

export const getNextPlanEstado = (estado: PlanFormativoEstado | string): PlanFormativoEstado | string => {
  switch (estado) {
    case PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE:
    case 'PENDIENTE_ENVIAR_ESTUDIANTE':  return PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
    case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE:
    case 'PENDIENTE_FIRMAR_ESTUDIANTE': return PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA;
    case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:
    case 'PENDIENTE_ENVIAR_EMPRESA':    return PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA;
    case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:
    case 'PENDIENTE_FIRMA_EMPRESA':     return PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR;
    case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:
    case 'PENDIENTE_FIRMA_TUTOR':       return PlanFormativoEstado.COMPLETADO;
    default: return estado;
  }
};

export const getPrevPlanEstado = (estado: PlanFormativoEstado | string): PlanFormativoEstado | string => {
  switch (estado) {
    case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE:
    case 'PENDIENTE_FIRMAR_ESTUDIANTE': return PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
    case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:
    case 'PENDIENTE_ENVIAR_EMPRESA':    return PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
    case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:
    case 'PENDIENTE_FIRMA_EMPRESA':     return PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA;
    case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:
    case 'PENDIENTE_FIRMA_TUTOR':       return PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA;
    case PlanFormativoEstado.COMPLETADO:
    case 'COMPLETADO':                  return PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR;
    default: return estado;
  }
};

export const getNextSeguimientoEstado = (estado: SeguimientoEstado | string): SeguimientoEstado | string => {
  switch (estado) {
    case SeguimientoEstado.PENDIENTE: return SeguimientoEstado.ENVIADO_A_EMPRESA;
    case SeguimientoEstado.ENVIADO_A_EMPRESA:   return SeguimientoEstado.RECIBIDO;
    default: return estado;
  }
};

export const getPrevSeguimientoEstado = (estado: SeguimientoEstado | string): SeguimientoEstado | string => {
  switch (estado) {
    case SeguimientoEstado.ENVIADO_A_EMPRESA:   return SeguimientoEstado.PENDIENTE;
    case SeguimientoEstado.RECIBIDO:  return SeguimientoEstado.ENVIADO_A_EMPRESA;
    default: return estado;
  }
};

export const getNextValoracionEstado = (estado: ValoracionEstado | string): ValoracionEstado | string => {
  switch (estado) {
    case ValoracionEstado.PENDIENTE: return ValoracionEstado.ENVIADO_A_EMPRESA;
    case ValoracionEstado.ENVIADO_A_EMPRESA:   return ValoracionEstado.RECIBIDO;
    default: return estado;
  }
};

export const getPrevValoracionEstado = (estado: ValoracionEstado | string): ValoracionEstado | string => {
  switch (estado) {
    case ValoracionEstado.ENVIADO_A_EMPRESA:   return ValoracionEstado.PENDIENTE;
    case ValoracionEstado.RECIBIDO:  return ValoracionEstado.ENVIADO_A_EMPRESA;
    default: return estado;
  }
};
