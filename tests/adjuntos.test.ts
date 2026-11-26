import { describe, it, expect } from 'vitest';
import { validateHeaderValue } from 'http';
import { contentDispositionInline, nombresUnicos, normalizarAdjunto, tipoPorContenido } from '../src/lib/adjuntos.ts';

const PDF = Buffer.from('%PDF-1.7\n...');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const zipCon = (entrada: string) =>
  Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), Buffer.from(entrada), Buffer.alloc(20)]);

describe('tipoPorContenido', () => {
  it('reconoce PDF e imagenes por sus primeros bytes', () => {
    expect(tipoPorContenido(PDF)?.extension).toBe('pdf');
    expect(tipoPorContenido(PNG)?.extension).toBe('png');
    expect(tipoPorContenido(JPG)?.extension).toBe('jpg');
  });

  it('distingue los zips de Office y OpenDocument por lo que llevan dentro', () => {
    expect(tipoPorContenido(zipCon('word/document.xml'))?.extension).toBe('docx');
    expect(tipoPorContenido(zipCon('xl/workbook.xml'))?.extension).toBe('xlsx');
    expect(tipoPorContenido(zipCon('ppt/presentation.xml'))?.extension).toBe('pptx');
    expect(tipoPorContenido(zipCon('mimetypeapplication/vnd.oasis.opendocument.text'))?.extension).toBe('odt');
    expect(tipoPorContenido(zipCon('otra/cosa.txt'))?.extension).toBe('zip');
  });

  it('no reconoce lo que no conoce', () => {
    expect(tipoPorContenido(Buffer.from('hola'))).toBeNull();
    expect(tipoPorContenido(Buffer.alloc(0))).toBeNull();
  });
});

describe('normalizarAdjunto', () => {
  it('no toca un nombre cuya extension cuadra, en mayusculas o no', () => {
    expect(normalizarAdjunto('Convenio.pdf', PDF)).toEqual({ filename: 'Convenio.pdf' });
    expect(normalizarAdjunto('Relación firmada.PDF', PDF)).toEqual({ filename: 'Relación firmada.PDF' });
    expect(normalizarAdjunto('foto.jpeg', JPG)).toEqual({ filename: 'foto.jpeg' });
  });

  it('añade la extension a un nombre que no la tiene', () => {
    expect(normalizarAdjunto('Convenio firmado', PDF)).toEqual({ filename: 'Convenio firmado.pdf', contentType: 'application/pdf' });
  });

  it('un punto en el nombre que no es una extension se respeta', () => {
    expect(normalizarAdjunto('Convenio v1.2', PDF).filename).toBe('Convenio v1.2.pdf');
  });

  it('cambia una extension que no cuadra con el contenido', () => {
    expect(normalizarAdjunto('Plan.pdf', zipCon('word/document.xml'))).toEqual({
      filename: 'Plan.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(normalizarAdjunto('cv.bin', PDF).filename).toBe('cv.pdf');
  });

  it('si no reconoce el contenido deja el nombre como esta', () => {
    expect(normalizarAdjunto('notas.txt', Buffer.from('hola'))).toEqual({ filename: 'notas.txt' });
    expect(normalizarAdjunto('sin extension', Buffer.from('hola'))).toEqual({ filename: 'sin extension' });
  });

  it('un nombre vacio no deja el adjunto sin nombre', () => {
    expect(normalizarAdjunto('', PDF).filename).toBe('adjunto.pdf');
  });
});

describe('contentDispositionInline', () => {
  it('es una cabecera valida aunque el nombre tenga caracteres fuera de latin1', () => {
    const cabecera = contentDispositionInline('Presupuesto 100€ “final”.pdf');
    expect(() => validateHeaderValue('Content-Disposition', cabecera)).not.toThrow();
  });

  it('lleva el nombre real codificado y uno ASCII de respaldo', () => {
    const cabecera = contentDispositionInline('Relación "José".pdf');
    expect(cabecera).toContain('filename="Relacion _Jose_.pdf"');
    expect(cabecera).toContain(`filename*=UTF-8''${encodeURIComponent('Relación "José".pdf')}`);
  });
});

describe('nombresUnicos', () => {
  it('no toca nombres distintos', () => {
    expect(nombresUnicos(['a.pdf', 'b.pdf'])).toEqual(['a.pdf', 'b.pdf']);
  });

  it('numera los repetidos antes de la extension, sin distinguir mayusculas', () => {
    expect(nombresUnicos(['cv.pdf', 'CV.pdf', 'cv.pdf', 'notas'])).toEqual(['cv.pdf', 'CV (2).pdf', 'cv (3).pdf', 'notas']);
  });
});
