//  ESCALA SEMANTICA DE ESTADOS
//
//  Un mismo tramite aparece en varias vistas (convenio, relacion, plan
//  formativo, seguimiento, valoracion, comunicaciones DAT) y cada una se tinea
//  con su propia cadena de clases. El resultado es que el mismo estado sale
//  azul en un sitio y amarillo en otro, y el usuario tiene que leer el texto
//  para saber si son la misma cosa.
//
//  Aqui se fija una sola escala y se expone por nivel, de modo que cada tramite
//  solo tenga que declarar en que punto esta:
//
//    PENDIENTE     nada enviado todavia
//    EN_CURSO      enviado, esperando respuesta
//    ESPERA_FIRMA  bloqueado a la espera de una firma
//    TERMINADO     completado o recibido
//
//  El texto lo aporta cada tramite porque las palabras no coinciden entre
//  ellos: el plan formativo espera firma del tutor y el convenio de la
//  direccion. Lo que si es comun, y lo que se unifica aqui, es el color.

export type NivelEstado = 'PENDIENTE' | 'EN_CURSO' | 'ESPERA_FIRMA' | 'TERMINADO';

export const COLOR_PENDIENTE    = 'bg-surface-subtle text-text-muted border-border-base';
export const COLOR_EN_CURSO     = 'bg-primary-light text-primary border-primary-light';
export const COLOR_ESPERA_FIRMA = 'bg-warning-soft text-warning-strong border-warning/20';
export const COLOR_TERMINADO    = 'bg-success-soft text-success-strong border-success/20';

const COLORES: Record<NivelEstado, string> = {
  PENDIENTE: COLOR_PENDIENTE,
  EN_CURSO: COLOR_EN_CURSO,
  ESPERA_FIRMA: COLOR_ESPERA_FIRMA,
  TERMINADO: COLOR_TERMINADO,
};

export const colorEstado = (nivel: NivelEstado): string => COLORES[nivel];
