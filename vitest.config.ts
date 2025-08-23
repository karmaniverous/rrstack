/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: [...configDefaults.exclude, '**/.rollup.cache/**', '.stan/**'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/rollup.config.*',
        '**/stan.rollup.config.*',
        '**/*.config.*',
        '**/rollup.config-*.mjs',
      ],
    },
  },
});
