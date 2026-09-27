import {
  HorarioSemanal,
  HorarioDia,
  RelacionEstado,
  PlanFormativoEstado,
  RelacionEstadoLabels,
  PlanFormativoEstadoLabels,
  SeguimientoEstado,
  SeguimientoEstadoLabels,
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

const festivosSet = (festivos: string[], empresaFestivos: string[], usarFestivos: boolean, usarFestivosEmpresa: boolean): Set<string> => {
  const set = new Set<string>();
  if (usarFestivos) festivos.forEach(f => set.add(f));
  if (usarFestivosEmpresa) empresaFestivos.forEach(f => set.add(f));
  return set;
};

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

/**
 * Indica si el horario tiene al menos un dia con horas. Si no tiene ninguno,
 * no existe fecha fin calculable por horas: las horas nunca se consumen.
 */
export const horarioTieneHoras = (horario: HorarioSemanal | undefined): boolean => {
  if (!horario) return false;
  return DIAS_SEMANA.some(dia => (horario[dia]?.horas ?? 0) > 0);
};

export const calculateEndDateForHours = (
  startDate: string,
  totalHours: number,
  horario: HorarioSemanal | undefined,
  festivos: string[],
  usarFestivos: boolean = true,
  empresaFestivos: string[] = [],
  usarFestivosEmpresa: boolean = false
): string | null => {
  if (!startDate || !totalHours || !horario) return null;

  const startParts = startDate.split('-').map(Number);
  let remainingHoras = totalHours;
  let current = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const saltar = festivosSet(festivos, empresaFestivos, usarFestivos, usarFestivosEmpresa);
  let iterations = 0;

  while (remainingHoras > 0 && iterations < 365) {
    const dateStr = formatDateLocal(current);
    const dayOfWeek = current.getDay();

    if (!saltar.has(dateStr)) {
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

  // Si el bucle se agota, el horario no aporta horas suficientes para
  // consumir las pedidas y no existe un ultimo dia al que llegar. Antes se
  // devolvia la fecha en la que se agotaron las 365 vueltas (inicio + 365
  // dias), que no significa nada y ademas sobrescribia la fecha fin real.
  if (remainingHoras > 0) return null;

  return formatDateLocal(current);
};

export const calculateStartDateFromEnd = (
  targetEndDate: string,
  totalHours: number,
  horario: HorarioSemanal | undefined,
  festivos: string[],
  usarFestivos: boolean = true,
  empresaFestivos: string[] = [],
  usarFestivosEmpresa: boolean = false
): string | null => {
  if (!targetEndDate || !totalHours || !horario) return null;

  const [year, month, day] = targetEndDate.split('-').map(Number);
  let remainingHoras = totalHours;
  let current = new Date(year, month - 1, day);
  const saltar = festivosSet(festivos, empresaFestivos, usarFestivos, usarFestivosEmpresa);
  let iterations = 0;

  while (remainingHoras > 0 && iterations < 365) {
    const dateStr = formatDateLocal(current);
    const dayOfWeek = current.getDay();

    if (!saltar.has(dateStr)) {
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

  // Mismo criterio que en calculateEndDateForHours: si no converge, null.
  if (remainingHoras > 0) return null;

  return formatDateLocal(current);
};

// ─────────────────────────────────────────
//  LÓGICA DE ESTADOS (colores y textos)
// ─────────────────────────────────────────

// Los cuatro niveles de un tramite. El color dice en que punto esta, de modo
// que se pueda leer de un vistazo sin mirar el texto:
//
//   PENDIENTE    nada enviado todavia
//   EN_CURSO     enviado, esperando respuesta
//   ESPERA_FIRMA bloqueado a la espera de una firma
//   TERMINADO    completado o recibido
//
// Antes cada estado repetia su propia cadena de clases y el mapa se habia
// desincronizado: en el plan formativo, "pendiente firma empresa" y
// "pendiente firma tutor" salian en verde igual que "completado", y en la
// relacion "pendiente firma director" salia en azul mientras "pendiente firma
// empresa" salia en amarillo.
const COLOR_PENDIENTE     = 'bg-surface-subtle text-text-muted border-border-base';
const COLOR_EN_CURSO      = 'bg-primary-light text-primary border-primary-light';
const COLOR_ESPERA_FIRMA  = 'bg-warning-soft text-warning-strong border-warning/20';
const COLOR_TERMINADO     = 'bg-success-soft text-success-strong border-success/20';

export const getStatusBadgeColor = (estado: string, type: string): string => {
  if (type === 'relacion') {
    if (estado === RelacionEstado.PENDIENTE_ENVIAR_EMPRESA)  return COLOR_EN_CURSO;
    if (estado === RelacionEstado.PENDIENTE_FIRMA_EMPRESA)   return COLOR_ESPERA_FIRMA;
    if (estado === RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR) return COLOR_EN_CURSO;
    if (estado === RelacionEstado.PENDIENTE_FIRMA_DIRECTOR)  return COLOR_ESPERA_FIRMA;
    if (estado === RelacionEstado.COMPLETADO)                return COLOR_TERMINADO;
  } else if (type === 'plan') {
    if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE)  return COLOR_EN_CURSO;
    if (estado === PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE)  return COLOR_ESPERA_FIRMA;
    if (estado === PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA)     return COLOR_EN_CURSO;
    if (estado === PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA)      return COLOR_ESPERA_FIRMA;
    if (estado === PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR)        return COLOR_ESPERA_FIRMA;
    if (estado === PlanFormativoEstado.COMPLETADO)                   return COLOR_TERMINADO;
  } else if (type === 'seguimiento') {
    if (estado === SeguimientoEstado.PENDIENTE)          return COLOR_PENDIENTE;
    if (estado === SeguimientoEstado.ENVIADO_A_EMPRESA) return COLOR_EN_CURSO;
    if (estado === SeguimientoEstado.RECIBIDO)           return COLOR_TERMINADO;
  } else if (type === 'valoracion') {
    if (estado === ValoracionEstado.PENDIENTE)          return COLOR_PENDIENTE;
    if (estado === ValoracionEstado.ENVIADO_A_EMPRESA) return COLOR_EN_CURSO;
    if (estado === ValoracionEstado.RECIBIDO)           return COLOR_TERMINADO;
  }
  return COLOR_PENDIENTE;
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

// Los botones de accion se tinen por el tipo de accion y por si la accion
// cierra el tramite. El flujo de cada tramite alterna enviar (saca el
// documento hacia fuera) y recibir (lo recoge firmado), y hay pasos de
// recepcion que no son los ultimos, de modo que la paleta tiene tres niveles:
//
//   ENVIAR    saca el documento hacia fuera        -> azul
//   RECEPCION confirma una firma que no es la ultima -> naranja
//   FINAL     deja el tramite en su estado terminal -> verde
//
// El verde esta reservado a la ultima recepcion de cada tramite: "Recibido de
// Direccion" en la relacion, "Recibir Firma Tutor" en el plan formativo y
// "Marcar como Recibido" en seguimiento y valoracion. Cualquier otra
// recepcion va en naranja, para que se distinga de un vistazo de la que cierra
// el proceso.
//
// El badge y el boton miden cosas distintas a proposito: el badge dice donde
// estas y el boton que va a pasar al pulsarlo. Por eso un boton verde puede
// aparecer bajo un badge amarillo, y no es una contradiccion.
const COLOR_BOTON_ENVIAR    = 'bg-primary';
const COLOR_BOTON_RECEPCION = 'bg-warning';
const COLOR_BOTON_FINAL     = 'bg-success';

export const getAnexoStatusButton = (estado: string) => {
  switch (estado) {
    case RelacionEstado.PENDIENTE_ENVIAR_EMPRESA:   return { label: 'Enviar Doc. a Empresa',  icon: Send,       color: COLOR_BOTON_ENVIAR };
    case RelacionEstado.PENDIENTE_FIRMA_EMPRESA:    return { label: 'Recibido de Empresa',     icon: Clock,      color: COLOR_BOTON_RECEPCION };
    case RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR:  return { label: 'Enviar a Dirección',      icon: Send,       color: COLOR_BOTON_ENVIAR };
    case RelacionEstado.PENDIENTE_FIRMA_DIRECTOR:   return { label: 'Recibido de Dirección',   icon: ShieldCheck,color: COLOR_BOTON_FINAL };
    default: return null;
  }
};

export const getPlanStatusButton = (estado: string) => {
  switch (estado) {
    // Los enums de estado son strings cuyo valor es su propia clave, asi que
    // antes cada caso tenia delante un duplicado con el mismo literal, que
    // nunca se evaluaba.
    case PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE: return { label: 'Enviar Doc. a Estudiante', icon: Send,        color: COLOR_BOTON_ENVIAR };
    case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE: return { label: 'Recibir Firma Estudiante',  icon: Clock,       color: COLOR_BOTON_RECEPCION };
    case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:    return { label: 'Enviar a Empresa',           icon: Send,        color: COLOR_BOTON_ENVIAR };
    case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:     return { label: 'Recibir Firma Empresa',      icon: Clock,       color: COLOR_BOTON_RECEPCION };
    case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:       return { label: 'Recibir Firma Tutor',        icon: ShieldCheck, color: COLOR_BOTON_FINAL };
    default: return null;
  }
};

export const getSeguimientoStatusButton = (estado: string) => {
  switch (estado) {
    case SeguimientoEstado.PENDIENTE: return { label: 'Marcar como Enviado', icon: Send,        color: COLOR_BOTON_ENVIAR };
    case SeguimientoEstado.ENVIADO_A_EMPRESA: return { label: 'Marcar como Recibido', icon: Check,       color: COLOR_BOTON_FINAL };
    default: return null;
  }
};

export const getValoracionStatusButton = (estado: string) => {
  switch (estado) {
    case ValoracionEstado.PENDIENTE: return { label: 'Marcar como Enviado', icon: Send,        color: COLOR_BOTON_ENVIAR };
    case ValoracionEstado.ENVIADO_A_EMPRESA: return { label: 'Marcar como Recibido', icon: Check,       color: COLOR_BOTON_FINAL };
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
    case PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE: return PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
    case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE: return PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA;
    case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:    return PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA;
    case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:     return PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR;
    case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:       return PlanFormativoEstado.COMPLETADO;
    default: return estado;
  }
};

export const getPrevPlanEstado = (estado: PlanFormativoEstado | string): PlanFormativoEstado | string => {
  switch (estado) {
    case PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE: return PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
    case PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA:    return PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE;
    case PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA:     return PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA;
    case PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR:       return PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA;
    case PlanFormativoEstado.COMPLETADO:                  return PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR;
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
