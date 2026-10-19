import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { bytesDeCV, entradasCV } from '../src/utils/descargarCVs.ts';
import type { Alumno } from '../src/types/index.ts';

const pdf = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\nfin', 'latin1');
const cv = `data:application/pdf;base64,${pdf.toString('base64')}`;
const alumno = (id: number, nombre: string, apellidos: string, cvPath?: string, dni = `0000000${id}X`) =>
  ({ id, nombre, apellidos, dni, cvPath } as Alumno);

describe('bytesDeCV', () => {
  it('saca el PDF del data URI sin la cabecera', () => {
    expect(Buffer.from(bytesDeCV(cv)).equals(pdf)).toBe(true);
  });

  it('acepta base64 sin cabecera', () => {
    expect(Buffer.from(bytesDeCV(pdf.toString('base64'))).equals(pdf)).toBe(true);
  });
});

describe('entradasCV', () => {
  it('un fichero por alumno con CV, con el mismo nombre que la descarga suelta', () => {
    const { entradas, sinCV } = entradasCV([
      alumno(1, 'Ana María', 'López Gil', cv),
      alumno(2, 'Luis', 'Pérez'),
    ]);
    expect(entradas.map(e => e.nombre)).toEqual(['Ana_María_López_Gil_cv.pdf']);
    expect(sinCV.map(a => a.id)).toEqual([2]);
  });

  it('dos alumnos que se llaman igual no se pisan dentro del zip', () => {
    const { entradas } = entradasCV([
      alumno(1, 'Luis', 'Pérez', cv, '11111111A'),
      alumno(2, 'Luis', 'Pérez', cv, '22222222B'),
    ]);
    expect(entradas.map(e => e.nombre)).toEqual(['Luis_Pérez_cv.pdf', 'Luis_Pérez_22222222B_cv.pdf']);
  });

  it('el zip que sale lleva los PDF intactos', async () => {
    const { entradas } = entradasCV([alumno(1, 'Ana', 'López', cv)]);
    const zip = new JSZip();
    for (const e of entradas) zip.file(e.nombre, e.bytes);
    const leido = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
    const contenido = await leido.file('Ana_López_cv.pdf')!.async('nodebuffer');
    expect(contenido.equals(pdf)).toBe(true);
  });
});
