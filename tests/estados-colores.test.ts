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
//  Botones de accion.
//
//  El boton se tine por el tipo de accion y por si la cierra. El flujo de cada
//  tramite alterna enviar (saca el documento) y recibir (lo recoge firmado),
//  y hay recepciones que no son la ultima, asi que hay tres niveles:
//
//   ENVIAR    -> azul    saca el documento hacia fuera
//   RECEPCION -> naranja confirma una firma que no es la ultima
//   FINAL     -> verde   deja el tramite en su estado terminal
//
// El verde esta reservado a la ultima recepcion de cada tramite. Badge y boton
// miden cosas distintas, asi que un boton verde bajo un badge amarillo es lo
//  esperado.
// ─────────────────────────────────────────

const ENVIAR = 'bg-primary';
const RECEPCION = 'bg-warning';
const FINAL = 'bg-success';

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

/** Recepciones que aun dejan pasos por delante. */
const BOTONES_INTERMEDIOS: Array<[string, Btn, string]> = [
  ['anexo/recibido empresa', getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_EMPRESA), RECEPCION],
  ['plan/recibir firma estudiante', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE), RECEPCION],
  ['plan/recibir firma empresa', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA), RECEPCION],
];

/** La ultima recepcion de cada tramite. */
const BOTONES_FINALES: Array<[string, Btn, string]> = [
  ['anexo/recibido director', getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_DIRECTOR), FINAL],
  ['plan/recibir firma tutor', getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR), FINAL],
  ['seguimiento/recibido', getSeguimientoStatusButton(SeguimientoEstado.ENVIADO_A_EMPRESA), FINAL],
  ['valoracion/recibido', getValoracionStatusButton(ValoracionEstado.ENVIADO_A_EMPRESA), FINAL],
];

const TODOS: Array<[string, Btn, string]> = [
  ...BOTONES_ENVIO, ...BOTONES_INTERMEDIOS, ...BOTONES_FINALES,
];

/** El estado en el que queda el tramite tras pulsar cada boton de recepcion. */
const ESTADO_TRAS_PULSAR: Array<[Btn, string, string, string]> = [
  [getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_EMPRESA), RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR, 'COMPLETADO', 'anexo'],
  [getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_DIRECTOR), RelacionEstado.COMPLETADO, 'COMPLETADO', 'anexo'],
  [getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE), PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA, 'COMPLETADO', 'plan'],
  [getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA), PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR, 'COMPLETADO', 'plan'],
  [getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR), PlanFormativoEstado.COMPLETADO, 'COMPLETADO', 'plan'],
  [getSeguimientoStatusButton(SeguimientoEstado.ENVIADO_A_EMPRESA), SeguimientoEstado.RECIBIDO, 'RECIBIDO', 'seguimiento'],
  [getValoracionStatusButton(ValoracionEstado.ENVIADO_A_EMPRESA), ValoracionEstado.RECIBIDO, 'RECIBIDO', 'valoracion'],
];

describe('colores de los botones de accion', () => {
  it('las acciones de envio son azules', () => {
    for (const [nombre, btn, color] of BOTONES_ENVIO) {
      expect(btn, nombre).not.toBeNull();
      expect(btn!.color, nombre).toBe(color);
    }
  });

  it('las recepciones intermedias son naranjas', () => {
    for (const [nombre, btn, color] of BOTONES_INTERMEDIOS) {
      expect(btn, nombre).not.toBeNull();
      expect(btn!.color, nombre).toBe(color);
    }
  });

  it('solo la ultima recepcion de cada tramite es verde', () => {
    for (const [nombre, btn, color] of BOTONES_FINALES) {
      expect(btn, nombre).not.toBeNull();
      expect(btn!.color, nombre).toBe(color);
    }
  });

  it('el verde coincide con dejar el tramite en su estado terminal', () => {
    for (const [btn, siguiente, terminal, tramite] of ESTADO_TRAS_PULSAR) {
      const esperado = siguiente === terminal ? FINAL : RECEPCION;
      expect(btn!.color, `${tramite} -> ${siguiente}`).toBe(esperado);
    }
  });

  it('ninguna recepcion intermedia se pinta de verde', () => {
    for (const [nombre, btn] of BOTONES_INTERMEDIOS) {
      expect(btn!.color, nombre).not.toBe(FINAL);
    }
  });

  it('no hay mas de un boton verde por tramite', () => {
    const porTramite: Record<string, number> = {};
    for (const [nombre, btn] of BOTONES_FINALES) {
      const tramite = nombre.split('/')[0];
      porTramite[tramite] = (porTramite[tramite] ?? 0) + 1;
    }
    for (const [tramite, total] of Object.entries(porTramite)) {
      expect(total, tramite).toBe(1);
    }
  });

  it('recibir firma empresa y recibir firma estudiante coinciden', () => {
    const emp = getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA)!;
    const est = getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE)!;
    expect(emp.color).toBe(est.color);
  });

  it('el boton que cierra el plan formativo se distingue del que no', () => {
    const tutor = getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR)!;
    const empresa = getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA)!;
    expect(tutor.color).toBe(FINAL);
    expect(empresa.color).toBe(RECEPCION);
    expect(tutor.color).not.toBe(empresa.color);
  });

  it('el boton que cierra la relacion se distingue del que no', () => {
    const dir = getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_DIRECTOR)!;
    const emp = getAnexoStatusButton(RelacionEstado.PENDIENTE_FIRMA_EMPRESA)!;
    expect(dir.color).toBe(FINAL);
    expect(emp.color).toBe(RECEPCION);
  });

  it('los botones de un tramite alternan envio, recepcion y cierre', () => {
    const orden = [
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA),
      getPlanStatusButton(PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR),
    ].map(b => b!.color);
    expect(orden).toEqual([ENVIAR, RECEPCION, ENVIAR, RECEPCION, FINAL]);
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

  it('todos los botones usan uno de los tres colores de la paleta', () => {
    for (const [nombre, btn] of TODOS) {
      expect([ENVIAR, RECEPCION, FINAL], nombre).toContain(btn!.color);
    }
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
