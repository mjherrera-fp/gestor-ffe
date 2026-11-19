import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';
import http from 'http';
import net from 'net';
import { escucharEnPrimerPuertoLibre, puertoNoDisponible } from '../src/lib/escucharPuerto.ts';

/** Un servidor de mentira que falla con el codigo indicado, o escucha. */
const falso = (codigos: Record<number, string>, intentos: number[]) => (puerto: number) => {
  intentos.push(puerto);
  const s = new EventEmitter() as EventEmitter & { address(): unknown };
  const asignado = puerto === 0 ? 54321 : puerto;
  s.address = () => ({ port: asignado });
  setImmediate(() => {
    const codigo = codigos[puerto];
    if (codigo) s.emit('error', Object.assign(new Error(codigo), { code: codigo }));
    else s.emit('listening');
  });
  return s;
};

const escuchar = (codigos: Record<number, string>, candidatos: number[]) =>
  new Promise<{ puerto?: number; error?: unknown; intentos: number[] }>((resolver) => {
    const intentos: number[] = [];
    escucharEnPrimerPuertoLibre({
      candidatos,
      escuchar: falso(codigos, intentos),
      alEscuchar: puerto => resolver({ puerto, intentos }),
      alFallar: error => resolver({ error, intentos }),
      esperaMs: 0,
    });
  });

describe('puertoNoDisponible', () => {
  it('ocupado y reservado por Windows son motivos para probar otro', () => {
    expect(puertoNoDisponible({ code: 'EADDRINUSE' })).toBe(true);
    expect(puertoNoDisponible({ code: 'EACCES' })).toBe(true);
  });

  it('otros errores no', () => {
    expect(puertoNoDisponible({ code: 'ENOTFOUND' })).toBe(false);
    expect(puertoNoDisponible(null)).toBe(false);
  });
});

describe('escucharEnPrimerPuertoLibre', () => {
  it('si el primero esta libre, escucha en el', async () => {
    const r = await escuchar({}, [3000, 3001]);
    expect(r.puerto).toBe(3000);
    expect(r.intentos).toEqual([3000]);
  });

  it('salta un puerto reservado por Windows (EACCES), el caso de GF-72', async () => {
    const r = await escuchar({ 3000: 'EACCES' }, [3000, 3001]);
    expect(r.puerto).toBe(3001);
  });

  it('salta un puerto ocupado (EADDRINUSE), como antes', async () => {
    const r = await escuchar({ 3000: 'EADDRINUSE' }, [3000, 3001]);
    expect(r.puerto).toBe(3001);
  });

  it('si todos los candidatos estan reservados, pide uno al sistema', async () => {
    // Como en el equipo del profesor: 2967-3066 reservado, y se probaban 3000-3019.
    const reservados = Object.fromEntries([3000, 3001, 3002].map(p => [p, 'EACCES']));
    const r = await escuchar(reservados, [3000, 3001, 3002]);
    expect(r.intentos).toEqual([3000, 3001, 3002, 0]);
    expect(r.puerto).toBe(54321);
  });

  it('un puerto reservado se salta sin esperar: no se va a liberar', async () => {
    const inicio = Date.now();
    const puerto = await new Promise<number>((resolver, rechazar) => {
      escucharEnPrimerPuertoLibre({
        candidatos: [3000, 3001, 3002],
        escuchar: falso({ 3000: 'EACCES', 3001: 'EACCES' }, []),
        alEscuchar: resolver,
        alFallar: rechazar,
        esperaMs: 5000,
      });
    });
    expect(puerto).toBe(3002);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });

  it('un error que no es de puerto no se reintenta', async () => {
    const r = await escuchar({ 3000: 'EINVAL' }, [3000, 3001]);
    expect((r.error as { code: string }).code).toBe('EINVAL');
    expect(r.intentos).toEqual([3000]);
  });

  it('si ni el sistema da puerto, falla', async () => {
    const r = await escuchar({ 3000: 'EACCES', 0: 'EACCES' }, [3000]);
    expect((r.error as { code: string }).code).toBe('EACCES');
  });

  it('con un puerto ocupado de verdad, escucha en el siguiente', async () => {
    const ocupante = net.createServer();
    await new Promise<void>(res => ocupante.listen(0, '127.0.0.1', () => res()));
    const ocupado = (ocupante.address() as net.AddressInfo).port;
    let servidor: http.Server | undefined;
    try {
      const puerto = await new Promise<number>((resolver, rechazar) => {
        escucharEnPrimerPuertoLibre({
          candidatos: [ocupado, 0],
          escuchar: p => (servidor = http.createServer().listen(p, '127.0.0.1')),
          alEscuchar: resolver,
          alFallar: rechazar,
          esperaMs: 0,
        });
      });
      expect(puerto).not.toBe(ocupado);
      expect(puerto).toBeGreaterThan(0);
    } finally {
      servidor?.close();
      ocupante.close();
    }
  });
});
