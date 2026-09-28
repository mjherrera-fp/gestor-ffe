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
  ConvenioEstado,
  ComunicacionDATEstado,
  PlanFormativoEstadoLabels,
  RelacionEstadoLabels,
  SeguimientoEstadoLabels,
  ValoracionEstadoLabels,
  ConvenioEstadoLabels,
  ComunicacionDATEstadoLabels,
} from '../src/types/index.ts';
import {
  colorEstado,
  COLOR_PENDIENTE,
  COLOR_EN_CURSO,
  COLOR_ESPERA_FIRMA,
  COLOR_TERMINADO,
  type NivelEstado,
} from '../src/utils/escalaEstados.ts';


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


describe('la escala de estados es la misma en todos los modulos', () => {
  // Antes cada modulo traia su propio mapa de clases y el mismo estado salia
  // de un color en una pantalla y de otro en la contigua. Estos tests fijan que
  // un paso con el mismo significado se pinte igual venga de donde venga.

  /** Nivel que le corresponde a cada estado de cada tramite. */
  const NIVELES: Array<[string, string, NivelEstado]> = [
    // Relacion y convenio comparten los mismos cuatro pasos.
    ['relacion/enviar empresa', RelacionEstado.PENDIENTE_ENVIAR_EMPRESA, 'EN_CURSO'],
    ['relacion/firma empresa', RelacionEstado.PENDIENTE_FIRMA_EMPRESA, 'ESPERA_FIRMA'],
    ['relacion/enviar director', RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR, 'EN_CURSO'],
    ['relacion/firma director', RelacionEstado.PENDIENTE_FIRMA_DIRECTOR, 'ESPERA_FIRMA'],
    ['relacion/completado', RelacionEstado.COMPLETADO, 'TERMINADO'],
    ['convenio/enviar empresa', ConvenioEstado.PENDIENTE_ENVIAR, 'PENDIENTE'],
    ['convenio/firma empresa', ConvenioEstado.PENDIENTE_FIRMA_EMPRESA, 'ESPERA_FIRMA'],
    ['convenio/enviar director', ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR, 'EN_CURSO'],
    ['convenio/firma director', ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR, 'ESPERA_FIRMA'],
    ['convenio/completado', ConvenioEstado.COMPLETADO, 'TERMINADO'],
    ['dat/enviar director', ComunicacionDATEstado.PENDIENTE_ENVIAR_DIRECTOR, 'EN_CURSO'],
    ['dat/firma director', ComunicacionDATEstado.PENDIENTE_FIRMA_DIRECTOR, 'ESPERA_FIRMA'],
    ['dat/completado', ComunicacionDATEstado.COMPLETADO, 'TERMINADO'],
  ];

  it('cada estado del convenio cae en el nivel que le corresponde', () => {
    for (const [nombre, estado, nivel] of NIVELES.filter(([n]) => n.startsWith('convenio'))) {
      // Se compara contra el badge real del modulo, no contra la constante.
      expect(getStatusBadgeColor(estado, 'convenio'), nombre).toBe(colorEstado(nivel));
    }
  });

  it('los estados que comparten nombre y paso comparten color', () => {
    // Estos pares son el caso que se estaba viendo mal: el mismo paso de firma
    // del director aparecia en azul en el convenio y en naranja en la relacion.
    const pares: Array<[string, string, string]> = [
      ['enviar a director', RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR, ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR],
      ['firma director', RelacionEstado.PENDIENTE_FIRMA_DIRECTOR, ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR],
      ['firma empresa', RelacionEstado.PENDIENTE_FIRMA_EMPRESA, ConvenioEstado.PENDIENTE_FIRMA_EMPRESA],
    ];
    for (const [nombre, enRelacion, enConvenio] of pares) {
      expect(
        getStatusBadgeColor(enRelacion, 'relacion'),
        nombre,
      ).toBe(getStatusBadgeColor(enConvenio, 'convenio'));
    }
  });

  it('esperar firma nunca sale en el color de pendiente', () => {
    for (const [nombre, , nivel] of NIVELES) {
      if (nivel !== 'ESPERA_FIRMA') continue;
      const color = colorEstado(nivel);
      expect(color, nombre).toBe(COLOR_ESPERA_FIRMA);
      expect(color, nombre).not.toBe(COLOR_PENDIENTE);
    }
  });

  it('solo lo terminal va en verde', () => {
    for (const [nombre, , nivel] of NIVELES) {
      const color = colorEstado(nivel);
      if (nivel === 'TERMINADO') {
        expect(color, nombre).toBe(COLOR_TERMINADO);
      } else {
        expect(color, nombre).not.toBe(COLOR_TERMINADO);
      }
    }
  });

  it('los cuatro niveles son colores distintos', () => {
    const colores = [COLOR_PENDIENTE, COLOR_EN_CURSO, COLOR_ESPERA_FIRMA, COLOR_TERMINADO];
    expect(new Set(colores).size).toBe(4);
  });
});


describe('las etiquetas de estado dicen lo mismo en todos los modulos', () => {
  it('el paso de enviar al director se escribe igual en relacion, convenio y DAT', () => {
    // Convenio y relacion comparten el paso, asi que la frase tiene que ser la
    // misma: antes uno deia "Pendiente de enviar al director" y el otro
    // "Pendiente enviar a director" en pantallas contiguas.
    expect(RelacionEstadoLabels[RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR]).toBe('Pendiente enviar a director');
    expect(ConvenioEstadoLabels[ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR]).toBe('Pendiente enviar a director');
    expect(ComunicacionDATEstadoLabels[ComunicacionDATEstado.PENDIENTE_ENVIAR_DIRECTOR]).toBe('Pendiente enviar a director');
  });

  it('ninguna etiqueta mete una "de" que las demas no llevan', () => {
    const todas = [
      ...Object.values(RelacionEstadoLabels),
      ...Object.values(PlanFormativoEstadoLabels),
      ...Object.values(ConvenioEstadoLabels),
      ...Object.values(ComunicacionDATEstadoLabels),
      ...Object.values(SeguimientoEstadoLabels),
      ...Object.values(ValoracionEstadoLabels),
    ];
    // "Recibido de empresa" y "Pendiente enviar a empresa" son legitimos; lo
    // que no debe aparecer es el "pendiente de <verbo>".
    const sospechosos = todas.filter(t => /^pendiente de /.test(t));
    expect(sospechosos).toEqual([]);
  });

  it('los tramites de la misma direccion comparten la etiqueta de firma', () => {
    expect(RelacionEstadoLabels[RelacionEstado.PENDIENTE_FIRMA_DIRECTOR])
      .toBe(ConvenioEstadoLabels[ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR]);
    expect(RelacionEstadoLabels[RelacionEstado.PENDIENTE_FIRMA_EMPRESA])
      .toBe(ConvenioEstadoLabels[ConvenioEstado.PENDIENTE_FIRMA_EMPRESA]);
  });

  it('cada estado tiene etiqueta y ninguna esta vacia', () => {
    for (const [nombre, etiquetas] of Object.entries({
      relacion: RelacionEstadoLabels,
      plan: PlanFormativoEstadoLabels,
      convenio: ConvenioEstadoLabels,
      dat: ComunicacionDATEstadoLabels,
    })) {
      for (const [estado, etiqueta] of Object.entries(etiquetas)) {
        expect(etiqueta, `${nombre}/${estado}`).toBeTruthy();
      }
    }
  });

  it('ningun estado terminal dice pendiente', () => {
    expect(RelacionEstadoLabels[RelacionEstado.COMPLETADO]).toBe('Completado');
    expect(PlanFormativoEstadoLabels[PlanFormativoEstado.COMPLETADO]).toBe('Completado');
    expect(ConvenioEstadoLabels[ConvenioEstado.COMPLETADO]).toBe('Completado');
    expect(ComunicacionDATEstadoLabels[ComunicacionDATEstado.COMPLETADO]).toBe('Completado');
  });
});
