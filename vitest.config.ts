/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';

const defaultExclude = Array.isArray(configDefaults.exclude)
  ? configDefaults.exclude
  : configDefaults.exclude
    ? [configDefaults.exclude]
    : [];

const defaultWatchExclude = Array.isArray(configDefaults.watchExclude)
  ? configDefaults.watchExclude
  : configDefaults.watchExclude
    ? [configDefaults.watchExclude]
    : [];

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: [...defaultExclude, '**/.rollup.cache/**'],
    watchExclude: [...defaultWatchExclude, '**/.rollup.cache/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
