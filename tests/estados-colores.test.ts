import { describe, it, expect } from 'vitest';
import { getStatusBadgeColor, getStatusLabel } from '../src/views/relaciones/utils/relacionesUtils.ts';
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
