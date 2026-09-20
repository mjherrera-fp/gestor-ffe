export type PasswordStrength = {
  score: number; // 0-4
  label: string;
  color: string;
  percent: number;
};

export function getPasswordStrength(password: string): PasswordStrength {
  const levels: Array<{ label: string; color: string }> = [
    { label: 'Muy débil', color: 'bg-red-500' },
    { label: 'Débil', color: 'bg-orange-400' },
    { label: 'Aceptable', color: 'bg-yellow-400' },
    { label: 'Fuerte', color: 'bg-lime-500' },
    { label: 'Muy fuerte', color: 'bg-green-500' },
  ];

  if (!password) {
    return { score: 0, label: '', color: '', percent: 0 };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const clamped = Math.min(4, score);
  return {
    score: clamped,
    label: levels[clamped].label,
    color: levels[clamped].color,
    percent: ((clamped + 1) / 5) * 100,
  };
}