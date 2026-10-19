import { describe, it, expect } from 'vitest';
import { cvABuffer } from '../src/lib/cv.ts';

describe('cvABuffer', () => {
  const pdf = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\nresto', 'latin1');

  it('decodifica solo el contenido de un data URI, sin la cabecera', () => {
    const cv = `data:application/pdf;base64,${pdf.toString('base64')}`;
    expect(cvABuffer(cv).equals(pdf)).toBe(true);
  });

  it('la cabecera decodificada daba bytes de mas delante de %PDF', () => {
    // El fallo de antes, para que se vea que el caso de arriba lo cubre.
    const cv = `data:application/pdf;base64,${pdf.toString('base64')}`;
    expect(Buffer.from(cv, 'base64').subarray(0, 5).toString()).not.toBe('%PDF-');
  });

  it('acepta base64 sin cabecera', () => {
    expect(cvABuffer(pdf.toString('base64')).equals(pdf)).toBe(true);
  });

  it('acepta otros tipos en la cabecera', () => {
    expect(cvABuffer(`data:application/octet-stream;base64,${pdf.toString('base64')}`).equals(pdf)).toBe(true);
  });
});
