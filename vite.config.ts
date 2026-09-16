import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // En desarrollo el servidor de la app escucha en el puerto 3100 por defecto
  // (el mismo criterio que server.ts); se puede sobrescribir con PORT.
  const apiTarget = `http://127.0.0.1:${process.env.PORT || 3100}`;
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
