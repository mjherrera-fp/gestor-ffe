import { describe, it, expect } from 'vitest';
import { conservarClavesAparte, estadoEnvioEmail } from '../src/lib/envioEmail.ts';

describe('estadoEnvioEmail', () => {
  it('por defecto está desactivado', () => {
    expect(estadoEnvioEmail({})).toEqual({ activo: false, configurado: false, habilitado: false });
    expect(estadoEnvioEmail({ smtp_user: 'profe', smtp_pass: 'x' }).habilitado).toBe(false);
  });

  it('activado solo se habilita con usuario y contraseña', () => {
    expect(estadoEnvioEmail({ envio_activo: '1' })).toEqual({ activo: true, configurado: false, habilitado: false });
    expect(estadoEnvioEmail({ envio_activo: '1', smtp_user: 'profe' }).habilitado).toBe(false);
    expect(estadoEnvioEmail({ envio_activo: '1', smtp_user: 'profe', smtp_pass: 'x' }).habilitado).toBe(true);
    expect(estadoEnvioEmail({ envio_activo: '0', smtp_user: 'profe', smtp_pass: 'x' }).habilitado).toBe(false);
  });

  it('acepta las credenciales antiguas guardadas en el profesor', () => {
    expect(estadoEnvioEmail({ envio_activo: '1' }, { smtp_user: 'profe', smtp_pass: 'x' }).habilitado).toBe(true);
  });
});

describe('conservarClavesAparte', () => {
  it('mantiene la firma y el interruptor si el formulario no los trae', () => {
    const anterior = { smtp_user: 'viejo', firma_correo: '<p>Firma</p>', envio_activo: '1' };
    expect(conservarClavesAparte(anterior, { smtp_user: 'nuevo' })).toEqual({
      smtp_user: 'nuevo', firma_correo: '<p>Firma</p>', envio_activo: '1',
    });
  });

  it('no recupera las claves del formulario que se han vaciado', () => {
    expect(conservarClavesAparte({ smtp_user: 'viejo', smtp_pass: 'x' }, { smtp_host: 'h' })).toEqual({ smtp_host: 'h' });
  });
});
