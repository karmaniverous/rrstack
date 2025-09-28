/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config';

// Coverage policy:
// - Only measure source files under src/**/*.ts.
// - Exclude build outputs and docs to avoid duplicate/irrelevant entries
//   in coverage reports (e.g., dist/**, .stan/**, docs/**).
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['test/setup.ts'],
    exclude: [...configDefaults.exclude, '**/.rollup.cache/**', '.stan/**'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/dist/**',
        '**/.stan/**',
        '**/docs/**',
        '**/.rollup.cache/**',
        '**/rollup.config.*',
        '**/stan.rollup.config.*',
        '**/*.config.*',
        '**/rollup.config-*.mjs',
      ],
    },
  },
  // Discover and run micro-benchmarks with `vitest bench`
  benchmark: {
    include: ['src/**/*.bench.ts'],
  },
});
