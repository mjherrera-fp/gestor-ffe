import { defineConfig } from 'vitest/config';

// Config aparte para los tests de integración: arrancan un servidor real en un
// puerto y con una BBDD temporal, así que van en un pool propio, con tiempo de
// espera holgado y sin ejecutarse junto a los unitarios.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    // Arranque de tsx + servidor + BBDD: el primer test paga ese coste.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // No paralelizar: cada fichero levanta su propio servidor en su puerto.
    fileParallelism: false,
  },
});
