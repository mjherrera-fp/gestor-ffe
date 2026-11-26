import { describe, it, expect } from 'vitest';
import { errorEnlace, normalizarUrl } from '../src/lib/enlaces.ts';

describe('normalizarUrl', () => {
  it('acepta http y https tal cual', () => {
    expect(normalizarUrl('https://raices.madrid.org/')).toBe('https://raices.madrid.org/');
    expect(normalizarUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
  });

  it('sin esquema le pone https', () => {
    expect(normalizarUrl('  www.educa2.madrid.org/web/centro ')).toBe('https://www.educa2.madrid.org/web/centro');
  });

  it('rechaza esquemas que no son web', () => {
    expect(normalizarUrl('javascript:alert(1)')).toBeNull();
    expect(normalizarUrl('file:///C:/Windows/system32')).toBeNull();
    expect(normalizarUrl('mailto:alguien@test.local')).toBeNull();
  });

  it('rechaza lo que no es una direccion', () => {
    expect(normalizarUrl('')).toBeNull();
    expect(normalizarUrl('hola que tal')).toBeNull();
    expect(normalizarUrl('solopalabra')).toBeNull();
  });
});

describe('errorEnlace', () => {
  it('pide nombre y URL validos', () => {
    expect(errorEnlace('', 'https://a.es')).toMatch(/nombre/);
    expect(errorEnlace('Raíces', '')).toMatch(/URL es obligatoria/);
    expect(errorEnlace('Raíces', 'javascript:x')).toMatch(/no es válida/);
    expect(errorEnlace('Raíces', 'raices.madrid.org')).toBeNull();
  });
});
