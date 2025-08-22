/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: [...configDefaults.exclude, '**/.rollup.cache/**'],
    watchExclude: [...configDefaults.watchExclude, '**/.rollup.cache/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
