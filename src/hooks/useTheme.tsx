import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'claro' | 'oscuro' | 'sistema';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const STORAGE_KEY = 'ffe-tema';

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'claro' || stored === 'oscuro' || stored === 'sistema') return stored;
  } catch { }
  return 'sistema';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = getStoredTheme();
    // Aplicar antes del primer render para evitar un "flash" del tema claro
    const dark = stored === 'oscuro' || (stored === 'sistema' && getSystemDark());
    document.documentElement.classList.toggle('dark', dark);
    return stored;
  });
  const [systemDark, setSystemDark] = useState(getSystemDark);

  // Cargar la preferencia persistida en la base de datos local (si hay profesor)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/profesor/config/tema')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        const dbTheme: string | undefined = data?.tema;
        if (dbTheme === 'claro' || dbTheme === 'oscuro' || dbTheme === 'sistema') {
          setThemeState(dbTheme);
          try { localStorage.setItem(STORAGE_KEY, dbTheme); } catch { }
        }
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  // Seguir la preferencia del sistema operativo
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(getSystemDark());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Aplicar la clase `dark` al <html>
  useEffect(() => {
    const dark = theme === 'oscuro' || (theme === 'sistema' && systemDark);
    document.documentElement.classList.toggle('dark', dark);
  }, [theme, systemDark]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { }
    // Persistir en la base de datos local (ignora fallos: p.ej. sin profesor)
    fetch('/api/profesor/config/tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: mode }),
    }).catch(() => { });
  }, []);

  const isDark = useMemo(
    () => theme === 'oscuro' || (theme === 'sistema' && systemDark),
    [theme, systemDark]
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}