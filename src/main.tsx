console.log("¡REACT FUNCIONA!");
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ThemeProvider} from './hooks/useTheme.tsx';
import {esRutaProtegida} from './lib/seguridadRutas.ts';
import './index.css';

// ─────────────────────────────────────────────────────────────────────
// SEGURIDAD: token de sesión en las llamadas a la API local
// ─────────────────────────────────────────────────────────────────────
// El servidor exige la cabecera X-FFE-Token en /api y /uploads. Sin ella,
// cualquier página web que el profesor tenga abierta en el navegador
// podría pedir http://127.0.0.1:3000/api/... y leer o modificar todos sus
// datos de FFP. El token llega desde el preload y se añade aquí, antes de
// montar la aplicación, para que TODO fetch que haga la app lo lleve.
//
// Solo se añade a peticiones del MISMO origen. Si se añadiera a una
// externa, el navegador exigiría un preflight CORS que el servidor no
// contesta, así que se romperían en lugar de protegerlas.
// ─────────────────────────────────────────────────────────────────────

const tokenSesion = window.ffeSession?.token ?? '';

const fetchOriginal = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input
    : input instanceof URL ? input.href
    : input.url;

  if (!esRutaProtegida(url, window.location.href, tokenSesion)) {
    return fetchOriginal(input, init);
  }

  // Si quien llama ya pasó cabeceras, se respetan; solo se añade la nuestra.
  const cabeceras = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  cabeceras.set('X-FFE-Token', tokenSesion);
  return fetchOriginal(input, {...init, headers: cabeceras});
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
