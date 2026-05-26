export function interpolateBody(body: string, placeholders: Record<string, any>): string {
  return body.replace(/\{\{([\wáéíóúÁÉÍÓÚñÑ.]+)\}\}/g, (_, key: string) => {
    const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], placeholders);
    return value !== undefined && value !== null ? String(value) : `{{${key}}}`;
  });
}

export function applyCustomMarkers(body: string, markers: Array<{ nombre: string; valor: string }>): string {
  for (const m of markers) {
    body = body.replace(new RegExp(`\\{\\{per_${m.nombre}\\}\\}`, 'g'), m.valor);
  }
  return body;
}


