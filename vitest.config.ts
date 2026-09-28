import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No se usa `globals: true` a proposito: los tests importan
    // explicitamente de 'vitest' para no tener que tocar tsconfig.json.
    //
    // tests/integration/ queda EXCLUIDO a proposito: esos tests levantan un
    // servidor real y tardan mas. Se ejecutan con `npm run test:integration`.
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**', 'node_modules/**'],
    environment: 'node',
  },
});
