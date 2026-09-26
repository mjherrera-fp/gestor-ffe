// Utilidad de parseo JSON compartido.
//
// Antes vivia al principio de src/lib/dao.ts. Se extrajo aqui porque
// src/lib/seguridadSocial.ts necesita el mismo comportamiento y duplicarlo
// es exactamente la clase de divergencia que acaba causando fallos.
//
// La firma se mantiene deliberadamente laxa (any) para no cambiar el
// tipado de los once puntos de uso que ya existian en dao.ts.
export const safeParse = (str: any, fallback: any): any => {
  if (!str || str === 'undefined' || str === 'null') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};
