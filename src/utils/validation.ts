export type ValidationRule = (value: any, formData?: any) => string | null;

export function required(label: string): ValidationRule {
  return (v: any) => {
    if (v === undefined || v === null) return `${label} es obligatorio`;
    if (typeof v === 'string' && !v.trim()) return `${label} es obligatorio`;
    if (typeof v === 'number' && isNaN(v)) return `${label} es obligatorio`;
    return null;
  };
}

export function email(label: string): ValidationRule {
  return (v: any) => {
    if (!v || !v.trim()) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : `${label} no es válido`;
  };
}

export function minLength(n: number, label: string): ValidationRule {
  return (v: any) => {
    if (!v || !v.trim()) return null;
    return v.length >= n ? null : `${label} debe tener al menos ${n} caracteres`;
  };
}

export function maxLength(n: number, label: string): ValidationRule {
  return (v: any) => {
    if (!v || !v.trim()) return null;
    return v.length <= n ? null : `${label} debe tener máximo ${n} caracteres`;
  };
}

export function isNumber(label: string): ValidationRule {
  return (v: any) => {
    if (v === '' || v === undefined || v === null) return null;
    return isNaN(Number(v)) ? `${label} debe ser un número` : null;
  };
}

export function phone(label: string): ValidationRule {
  return (v: any) => {
    if (!v || !v.trim()) return null;
    const digits = v.replace(/[^\d+]/g, '');
    const cleaned = digits.startsWith('+34') ? digits.slice(3) : digits;
    if (!/^\d{9}$/.test(cleaned)) return `${label} no es válido`;
    return null;
  };
}

export function compose(...rules: ValidationRule[]): ValidationRule {
  return (value: any, formData?: any) => {
    for (const rule of rules) {
      const error = rule(value, formData);
      if (error) return error;
    }
    return null;
  };
}
