import { describe, it, expect } from 'vitest';
import {
  getStatusBadgeColor,
  getStatusLabel,
  getAnexoStatusButton,
  getPlanStatusButton,
  getSeguimientoStatusButton,
  getValoracionStatusButton,
  getNextPlanEstado,
  getPrevPlanEstado,
} from '../src/views/relaciones/utils/relacionesUtils.ts';
import {
  PlanFormativoEstado,
  RelacionEstado,
  SeguimientoEstado,
  ValoracionEstado,
  PlanFormativoEstadoLabels,
  RelacionEstadoLabels,
  SeguimientoEstadoLabels,
  ValoracionEstadoLabels,
} from '../src/types/index.ts';

// ─────────────────────────────────────────
//  Colores y etiquetas de estado.
//
//  El color de un badge tiene que comunicar en que punto esta el tramite sin
//  necesidad de leer el texto. Estos tests fijan ese criterio, porque el mapa
//  ya se habia desincronizado una vez: "pendiente firma empresa" del plan
//  formativo salia en verde igual que "completado".
// ─────────────────────────────────────────

const NEUTRAL   = 'bg-surface-subtle text-text-muted border-border-base';
const EN_CURSO  = 'bg-primary-light text-primary border-primary-light';
const FIRMA     = 'bg-warning-soft text-warning-strong border-warning/20';
const TERMINADO = 'bg-success-soft text-success-strong border-success/20';

type Tipo = 'relacion' | 'plan' | 'seguimiento' | 'valoracion';

/** Estados que son una espera de firma, sea cual sea el tipo de tramite. */
const ESPERANDO_FIRMA: Array<[Tipo, string]> = [
  ['relacion', RelacionEstado.PENDIENTE_FIRMA_EMPRESA],
  ['relacion', RelacionEstado.PENDIENTE_FIRMA_DIRECTOR],
  ['plan', PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE],
  ['plan', PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA],
  ['plan', PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR],
];

/** Estados enviados que aun no estan completados. */
const ENVIADOS: Array<[Tipo, string]> = [
  ['relacion', RelacionEstado.PENDIENTE_ENVIAR_EMPRESA],
  ['relacion', RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR],
  ['plan', PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE],
  ['plan', PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA],
  ['seguimiento', SeguimientoEstado.ENVIADO_A_EMPRESA],
  ['valoracion', ValoracionEstado.ENVIADO_A_EMPRESA],
];

const TERMINALES: Array<[Tipo, string]> = [
  ['relacion', RelacionEstado.COMPLETADO],
  ['plan', PlanFormativoEstado.COMPLETADO],
  ['seguimiento', SeguimientoEstado.RECIBIDO],
  ['valoracion', ValoracionEstado.RECIBIDO],
];

const SIN_EMPEZAR: Array<[Tipo, string]> = [
  ['seguimiento', SeguimientoEstado.PENDIENTE],
  ['valoracion', ValoracionEstado.PENDIENTE],
];

describe('getStatusBadgeColor', () => {
  it('amarillo para todo estado que espera una firma', () => {
    for (const [tipo, estado] of ESPERANDO_FIRMA) {
      expect(getStatusBadgeColor(estado, tipo), `${tipo}/${estado}`).toBe(FIRMA);
    }
  });

  it('azul para lo que esta enviado y en curso', () => {
    for (const [tipo, estado] of ENVIADOS) {
      expect(getStatusBadgeColor(estado, tipo), `${tipo}/${estado}`).toBe(EN_CURSO);
    }
  });

  it('verde solo para lo completado o recibido', () => {
    for (const [tipo, estado] of TERMINALES) {
      expect(getStatusBadgeColor(estado, tipo), `${tipo}/${estado}`).toBe(TERMINADO);
    }
  });

  it('gris para lo que aun no se ha enviado', () => {
    for (const [tipo, estado] of SIN_EMPEZAR) {
      expect(getStatusBadgeColor(estado, tipo), `${tipo}/${estado}`).toBe(NEUTRAL);
    }
  });

  it('verde es exclusivo: ningun estado pendiente lo usa', () => {
    const todos = [...ESPERANDO_FIRMA, ...ENVIADOS, ...SIN_EMPEZAR];
    for (const [tipo, estado] of todos) {
      expect(getStatusBadgeColor(estado, tipo), `${tipo}/${estado}`).not.toBe(TERMINADO);
    }
  });

  it('el color depende solo del tipo de estado, no de como se escriba', () => {
    for (const [tipo, estado] of TERMINALES) {
      expect(getStatusBadgeColor(estado, tipo)).toBe(getStatusBadgeColor(String(estado), tipo));
    }
  });

  it('cae en gris ante un estado o un tipo desconocidos', () => {
    expect(getStatusBadgeColor('NO_EXISTE', 'relacion')).toBe(NEUTRAL);
    expect(getStatusBadgeColor(RelacionEstado.COMPLETADO, 'tipo_inventado')).toBe(NEUTRAL);
    expect(getStatusBadgeColor('', '')).toBe(NEUTRAL);
  });

  it('nunca devuelve una cadena vacia', () => {
    for (const [tipo, estado] of [...ESPERANDO_FIRMA, ...ENVIADOS, ...TERMINALES, ...SIN_EMPEZAR]) {
      expect(getStatusBadgeColor(estado, tipo).length).toBeGreaterThan(0);
    }
  });
});

describe('getStatusLabel', () => {
  it('devuelve la etiqueta humanizada de cada estado', () => {
    expect(getStatusLabel(RelacionEstado.COMPLETADO, 'relacion')).toBe('Completado');
    expect(getStatusLabel(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR, 'plan')).toBe('Pendiente firma tutor');
    expect(getStatusLabel(SeguimientoEstado.RECIBIDO, 'seguimiento')).toBe('Recibido de empresa');
    expect(getStatusLabel(ValoracionEstado.PENDIENTE, 'valoracion')).toBe('Pendiente');
  });

  it('cubre todos los estados de cada tipo', () => {
    for (const estado of Object.values(RelacionEstado)) {
      expect(getStatusLabel(estado, 'relacion')).toBe(RelacionEstadoLabels[estado]);
    }
    for (const estado of Object.values(PlanFormativoEstado)) {
      expect(getStatusLabel(estado, 'plan')).toBe(PlanFormativoEstadoLabels[estado]);
    }
    for (const estado of Object.values(SeguimientoEstado)) {
      expect(getStatusLabel(estado, 'seguimiento')).toBe(SeguimientoEstadoLabels[estado]);
    }
    for (const estado of Object.values(ValoracionEstado)) {
      expect(getStatusLabel(estado, 'valoracion')).toBe(ValoracionEstadoLabels[estado]);
    }
  });

  it('devuelve el estado en crudo si no hay etiqueta conocida', () => {
    expect(getStatusLabel('ESTADO_NUEVO', 'relacion')).toBe('ESTADO_NUEVO');
    expect(getStatusLabel(RelacionEstado.COMPLETADO, 'tipo_inventado')).toBe('COMPLETADO');
  });
});

// ─────────────────────────────────────────
//  Botones de accion.
//
//  El boton se tine por el tipo de accion, no por el estado que deja. El flujo
//  alterna enviar (saca el documento) y recibir (lo recoge firmado), asi que
//  solo hay dos colores: azul para enviar, verde para confirmar la recepcion.
//  Badge y boton miden cosas distintas, asi que un boton verde bajo un badge
//  amarillo es lo esperado y no una contradiccion.
// ─────────────────────────────────────────

const ENVIAR = 'bg-primary';
const COMPLETAR = 'bg-success';

type Btn = { label: string; icon: unknown; color: string } | null;

/** Acciones que sacan el documento hacia fuera. */
const BOTONES_ENVIO: Array<[string, Btn, string]> = [
  ['anexo/enviar empresa', getAnexoStatusButton(RelacionEstado.PENDIENTE_ENVIAR_EMPRESA), ENVIAR],
  ['anexo/enviar director', getAnexoStatusButton(RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR), ENVIAR],
  ['plan/enviar estudiante', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE), ENVIAR],
  ['plan/enviar empresa', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA), ENVIAR],
  ['seguimiento/enviado', getSeguimientoStatusButton(SeguimientoEstado.PENDIENTE), ENVIAR],
  ['valoracion/enviado', getValoracionStatusButton(ValoracionEstado.PENDIENTE), ENVIAR],
];

/** Acciones que confirman la recepcion de un documento ya enviado. */
const BOTONES_RECEPCION: Array<[string, Btn, string]> = [
  ['anexo/recibido empresa', getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_EMPRESA), COMPLETAR],
  ['anexo/recibido director', getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_DIRECTOR), COMPLETAR],
  ['plan/recibir firma estudiante', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE), COMPLETAR],
  ['plan/recibir firma empresa', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA), COMPLETAR],
  ['plan/recibir firma tutor', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR), COMPLETAR],
  ['seguimiento/recibido', getSeguimientoStatusButton(SeguimientoEstado.ENVIADO_A_EMPRESA), COMPLETAR],
  ['valoracion/recibido', getValoracionStatusButton(ValoracionEstado.ENVIADO_A_EMPRESA), COMPLETAR],
];

describe('colores de los botones de accion', () => {
  it('las acciones de envio son azules', () => {
    for (const [nombre, btn, color] of BOTONES_ENVIO) {
      expect(btn, nombre).not.toBeNull();
      expect(btn!.color, nombre).toBe(color);
    }
  });

  it('las acciones de recepcion son verdes', () => {
    for (const [nombre, btn, color] of BOTONES_RECEPCION) {
      expect(btn, nombre).not.toBeNull();
      expect(btn!.color, nombre).toBe(color);
    }
  });

  it('recibir firma empresa y recibir firma estudiante coinciden', () => {
    const emp = getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA)!;
    const est = getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE)!;
    expect(emp.color).toBe(est.color);
  });

  it('recibido de empresa y recibido de direccion coinciden', () => {
    const emp = getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_EMPRESA)!;
    const dir = getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_DIRECTOR)!;
    expect(emp.color).toBe(dir.color);
  });

  it('ningun boton de recepcion usa el color de espera de firma', () => {
    const esperaFirma = getStatusBadgeColor(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA, 'plan');
    for (const [nombre, btn] of BOTONES_RECEPCION) {
      expect(btn!.color, nombre).not.toBe(esperaFirma);
    }
  });

  it('los botones de un tramite alternan envio y recepcion', () => {
    const orden = [
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR),
    ].map(b => b!.color);
    expect(orden).toEqual([ENVIAR, COMPLETAR, ENVIAR, COMPLETAR, COMPLETAR]);
  });

  it('seguimiento y valoracion ofrecen el mismo boton para el mismo estado', () => {
    for (const estado of Object.values(SeguimientoEstado)) {
      const s = getSeguimientoStatusButton(estado);
      const v = getValoracionStatusButton(estado);
      expect(v?.label, estado).toBe(s?.label);
      expect(v?.color, estado).toBe(s?.color);
    }
  });

  it('no hay boton en los estados terminales', () => {
    expect(getPlanStatusButton(PlanFormativoEstado.COMPLETADO)).toBeNull();
    expect(getSeguimientoStatusButton(SeguimientoEstado.RECIBIDO)).toBeNull();
    expect(getValoracionStatusButton(ValoracionEstado.RECIBIDO)).toBeNull();
    expect(getAnexoStatusButton(RelacionEstado.COMPLETADO)).toBeNull();
  });

  it('devuelve null ante estados o tramites desconocidos', () => {
    expect(getAnexoStatusButton('NO_EXISTE')).toBeNull();
    expect(getPlanStatusButton('NO_EXISTE')).toBeNull();
    expect(getSeguimientoStatusButton('NO_EXISTE')).toBeNull();
    expect(getValoracionStatusButton('NO_EXISTE')).toBeNull();
  });
});

describe('transiciones del plan formativo', () => {
  it('avanza por la secuencia completa y se detiene en completado', () => {
    let estado: string = PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE;
    const visto: string[] = [estado];
    for (let i = 0; i < 5; i++) {
      estado = getNextPlanEstado(estado);
      visto.push(estado);
    }
    expect(visto).toEqual([
      'PENDIENTE_ENVIAR_ESTUDIANTE',
      'PENDIENTE_FIRMAR_ESTUDIANTE',
      'PENDIENTE_ENVIAR_EMPRESA',
      'PENDIENTE_FIRMA_EMPRESA',
      'PENDIENTE_FIRMA_TUTOR',
      'COMPLETADO',
    ]);
    expect(getNextPlanEstado(PlanFormativoEstado.COMPLETADO)).toBe(PlanFormativoEstado.COMPLETADO);
  });

  it('el estado anterior deshace exactamente el siguiente', () => {
    // COMPLETADO queda aparte porque es terminal: se puede retroceder desde
    // el, pero getNextPlanEstado devuelve el mismo estado en lugar de avanzar.
    for (const estado of Object.values(PlanFormativoEstado)) {
      if (estado === PlanFormativoEstado.COMPLETADO) continue;
      expect(getPrevPlanEstado(getNextPlanEstado(estado)), estado).toBe(estado);
    }
    expect(getPrevPlanEstado(PlanFormativoEstado.COMPLETADO)).toBe(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR);
    expect(getNextPlanEstado(PlanFormativoEstado.COMPLETADO)).toBe(PlanFormativoEstado.COMPLETADO);
  });

  it('devuelve el estado sin cambios si no lo conoce', () => {
    expect(getNextPlanEstado('NO_EXISTE')).toBe('NO_EXISTE');
    expect(getPrevPlanEstado('NO_EXISTE')).toBe('NO_EXISTE');
  });
});
