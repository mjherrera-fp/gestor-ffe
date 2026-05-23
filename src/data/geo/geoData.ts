/// <reference types="vite/client" />
import comunidadesData from './comunidades.json';

const provinciaModules = import.meta.glob('./provincias-*.json', { eager: true }) as Record<string, any>;
const localidadModules = import.meta.glob('./localidades-*.json', { eager: true }) as Record<string, any>;

export interface ComunidadEntry {
  code: string;
  slug: string;
  name: string;
}

export interface ProvinciaEntry {
  code: string;
  slug: string;
  name: string;
  ccaaSlug: string;
  ccaaName: string;
}

export interface LocalidadEntry {
  ine: string;
  slug: string;
  name: string;
  provinciaSlug: string;
  provinciaName: string;
  ccaaSlug: string;
  ccaaName: string;
}

export const comunidades: ComunidadEntry[] = comunidadesData.communities;

export const allProvincias: ProvinciaEntry[] = [];
for (const mod of Object.values(provinciaModules)) {
  const data = (mod as any).default || mod;
  const ccaaSlug = data.region.slug;
  const ccaaName = data.region.name;
  for (const p of data.provinces) {
    allProvincias.push({ code: p.code, slug: p.slug, name: p.name, ccaaSlug, ccaaName });
  }
}

export const allLocalidades: LocalidadEntry[] = [];
for (const mod of Object.values(localidadModules)) {
  const data = (mod as any).default || mod;
  const ccaaSlug = data.region.slug;
  const ccaaName = data.region.name;
  const provSlug = data.province.slug;
  const provName = data.province.name;
  for (const m of data.municipalities) {
    allLocalidades.push({
      ine: m.ine, slug: m.slug, name: m.name,
      provinciaSlug: provSlug, provinciaName: provName,
      ccaaSlug, ccaaName,
    });
  }
}

export function searchProvincias(query: string, ccaaSlug?: string): ProvinciaEntry[] {
  let list = ccaaSlug ? allProvincias.filter(p => p.ccaaSlug === ccaaSlug) : allProvincias;
  if (!query) return [];
  const q = query.toLowerCase();
  return list.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
}

export function searchLocalidades(query: string, provinciaSlug?: string, ccaaSlug?: string): LocalidadEntry[] {
  let list = allLocalidades;
  if (provinciaSlug) {
    list = list.filter(l => l.provinciaSlug === provinciaSlug);
  } else if (ccaaSlug) {
    list = list.filter(l => l.ccaaSlug === ccaaSlug);
  }
  if (!query) return [];
  const q = query.toLowerCase();
  return list.filter(l => l.name.toLowerCase().includes(q)).slice(0, 20);
}

export function getComunidadBySlug(slug: string): ComunidadEntry | undefined {
  return comunidades.find(c => c.slug === slug);
}
