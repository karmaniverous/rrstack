import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import type { Linter } from 'eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tsDocPlugin from 'eslint-plugin-tsdoc';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      '.rollup.cache/**/*',
      'coverage/**/*',
      'dist/**/*',
      'docs/**/*',
      'node_modules/**/*',
      '.stan/**/*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  // Vitest rules for test files
  (() => {
    // Use recommended rules when available from @vitest/eslint-plugin.
    // Fall back to just enabling the plugin if configs aren’t exposed.
    const recommendedRules: Linter.RulesRecord =
      (
        vitest as unknown as {
          configs?: { recommended?: { rules?: Linter.RulesRecord } };
        }
      ).configs?.recommended?.rules ?? {};
    return {
      files: ['**/*.test.ts'],
      plugins: {
        vitest: vitest as unknown as Linter.Plugin,
      },
      rules: { ...recommendedRules },
    };
  })(),
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir,
      },
    },
    plugins: {
      prettier: prettierPlugin as unknown as Linter.Plugin,
      'simple-import-sort': simpleImportSortPlugin as unknown as Linter.Plugin,
      tsdoc: tsDocPlugin as unknown as Linter.Plugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'prettier/prettier': 'error',
      'tsdoc/syntax': 'warn',
    },
  },
);
