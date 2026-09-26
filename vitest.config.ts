import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No se usa `globals: true` a proposito: los tests importan
    // explicitamente de 'vitest' para no tener que tocar tsconfig.json.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
