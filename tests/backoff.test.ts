import { describe, it, expect } from 'vitest';
import {
  ESPERA_INICIAL_MS,
  ESPERA_MAXIMA_MS,
  ESTADO_INICIAL,
  calcularEsperaMs,
  esperaRestanteMs,
  registrarExito,
  registrarFallo,
  type EstadoBackoff,
} from '../src/lib/backoff.ts';

describe('calcularEsperaMs', () => {
  it('no espera sin fallos: el uso legítimo no se penaliza', () => {
    expect(calcularEsperaMs(0)).toBe(0);
    expect(calcularEsperaMs(-1)).toBe(0);
  });

  it('crece al doble en cada fallo', () => {
    expect(calcularEsperaMs(1)).toBe(ESPERA_INICIAL_MS);
    expect(calcularEsperaMs(2)).toBe(ESPERA_INICIAL_MS * 2);
    expect(calcularEsperaMs(3)).toBe(ESPERA_INICIAL_MS * 4);
    expect(calcularEsperaMs(4)).toBe(ESPERA_INICIAL_MS * 8);
  });

  it('respeta el tope aunque los fallos se disparen', () => {
    expect(calcularEsperaMs(50)).toBe(ESPERA_MAXIMA_MS);
    expect(calcularEsperaMs(500)).toBe(ESPERA_MAXIMA_MS);
  });

  it('nunca crece sin límite, para que siempre se pueda reintentar', () => {
    // La BBDD es local y no hay recuperación de contraseña: una espera sin
    // tope dejaría a quien olvidase la clave sin acceso permanente.
    for (let fallos = 1; fallos <= 100; fallos++) {
      expect(calcularEsperaMs(fallos)).toBeLessThanOrEqual(ESPERA_MAXIMA_MS);
    }
  });
});

describe('esperaRestanteMs', () => {
  it('no espera si nunca ha habido fallos', () => {
    expect(esperaRestanteMs(ESTADO_INICIAL, 1_000_000)).toBe(0);
  });

  it('devuelve la espera completa justo tras el fallo', () => {
    const estado = registrarFallo(ESTADO_INICIAL, 10_000);
    expect(esperaRestanteMs(estado, 10_000)).toBe(ESPERA_INICIAL_MS);
  });

  it('descuenta el tiempo ya transcurrido', () => {
    const estado = registrarFallo(ESTADO_INICIAL, 10_000);
    expect(esperaRestanteMs(estado, 10_000 + 200)).toBe(ESPERA_INICIAL_MS - 200);
  });

  it('llega a cero justo cuando se cumple la espera', () => {
    const estado = registrarFallo(ESTADO_INICIAL, 10_000);
    expect(esperaRestanteMs(estado, 10_000 + ESPERA_INICIAL_MS)).toBe(0);
  });

  it('nunca devuelve un valor negativo al pasar la espera', () => {
    const estado = registrarFallo(ESTADO_INICIAL, 10_000);
    expect(esperaRestanteMs(estado, 10_000 + 10 * ESPERA_INICIAL_MS)).toBe(0);
    expect(esperaRestanteMs(estado, 99_999_999)).toBe(0);
  });

  it('tolera un estado con fallos pero sin marca de tiempo', () => {
    const estado: EstadoBackoff = { fallos: 3, ultimoFallo: null };
    expect(esperaRestanteMs(estado, 10_000)).toBe(0);
  });
});

describe('registrarFallo y registrarExito', () => {
  it('acumula fallos y recuerda cuándo', () => {
    let estado = registrarFallo(ESTADO_INICIAL, 1000);
    expect(estado.fallos).toBe(1);
    estado = registrarFallo(estado, 2000);
    expect(estado.fallos).toBe(2);
    expect(estado.ultimoFallo).toBe(2000);
  });

  it('el acierto borra el historial', () => {
    const fallado = registrarFallo(registrarFallo(ESTADO_INICIAL, 1000), 2000);
    const recuperado = registrarExito();
    expect(recuperado).toEqual(ESTADO_INICIAL);
    expect(esperaRestanteMs(recuperado, 2000)).toBe(0);
  });

  it('registrarExito devuelve una copia, no el constante compartido', () => {
    // Si devolviera el mismo objeto, mutarlo en el servidor afectaría a
    // ESTADO_INICIAL y contaminaría el resto de pruebas.
    const limpio = registrarExito();
    limpio.fallos = 99;
    expect(ESTADO_INICIAL.fallos).toBe(0);
  });

  it('no muta el estado que recibe', () => {
    const original: EstadoBackoff = { fallos: 3, ultimoFallo: 500 };
    registrarFallo(original, 999);
    expect(original).toEqual({ fallos: 3, ultimoFallo: 500 });
  });
});

describe('la secuencia completa de intentos', () => {
  it('va frenando a un atacante que insiste', () => {
    // Recorre el caso real: 12 intentos seguidos, todos fallidos. El intervalo
    // que se concede entre uno y otro define el coste de la fuerza bruta, y
    // tiene que crecer hasta un tope.
    let estado = ESTADO_INICIAL;
    const t0 = 10_000_000;
    let instante = t0;
    const esperas: number[] = [];

    for (let intento = 1; intento <= 12; intento++) {
      // Tiempo que le cuesta al atacante llegar al siguiente intento.
      const espera = esperaRestanteMs(estado, instante);
      esperas.push(espera);
      instante += espera; // espera lo que le queda y reintenta
      estado = registrarFallo(estado, instante);
    }

    // Los primeros intentos son los que importan: si el crecimiento fuera
    // plano, la tabla entera valdría lo mismo y el backoff no existiría.
    expect(esperas[0]).toBe(0);
    expect(esperas[1]).toBe(ESPERA_INICIAL_MS);
    expect(esperas[2]).toBe(ESPERA_INICIAL_MS * 2);
    expect(esperas[3]).toBe(ESPERA_INICIAL_MS * 4);
    // Una vez en el tope, el atacante queda limitado a un intento cada 30 s.
    expect(esperas[esperas.length - 1]).toBe(ESPERA_MAXIMA_MS);

    const gastado = instante - t0;
    // Doce intentos seguidos no pueden costar menos que unos 3 minutos: sin
    // el backoff serían instantáneos.
    expect(gastado).toBeGreaterThan(180_000);
  });

  it('un acierto en medio de la racha borra el historial', () => {
    let estado = ESTADO_INICIAL;
    for (let i = 0; i < 5; i++) estado = registrarFallo(estado, 1000 * i);
    expect(estado.fallos).toBe(5);

    estado = registrarExito();
    estado = registrarFallo(estado, 10_000);
    // Tras el acierto se vuelve a empezar de cero: el primer fallo del nuevo
    // intento cuesta solo 500 ms.
    expect(esperaRestanteMs(estado, 10_000)).toBe(ESPERA_INICIAL_MS);
  });
});
