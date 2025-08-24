/** See <stanPath>/system/stan.project.md for global requirements.
 * Requirements addressed:
 * - Inject __RRSTACK_VERSION__ at build time (browser‑safe) using @rollup/plugin-replace.
 */
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import aliasPlugin, { type Alias } from '@rollup/plugin-alias';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';
import terserPlugin from '@rollup/plugin-terser';
import typescriptPlugin from '@rollup/plugin-typescript';
import type {
  InputOptions,
  OutputOptions,
  Plugin,
  RollupOptions,
} from 'rollup';
import dtsPlugin from 'rollup-plugin-dts';

const outputPath = 'dist';

// Path alias @ -> <abs>/src (absolute to avoid module duplication warnings in Rollup)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve package version once for define replacement
let pkgVersion = '0.0.0';
try {
  const pkgJson = readFileSync(path.resolve(__dirname, 'package.json'), 'utf8');
  pkgVersion = JSON.parse(pkgJson).version ?? pkgVersion;
} catch {
  // noop — fallback remains '0.0.0'
}
const srcAbs = path.resolve(__dirname, 'src');
const aliases: Alias[] = [{ find: '@', replacement: srcAbs }];
const alias = aliasPlugin({ entries: aliases });

// Treat Node built-ins and node: specifiers as external.
const nodeExternals = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

// Runtime deps that must not be bundled (rely on package assets / fallbacks)
const externalPkgs = new Set<string>([
  'clipboardy', // requires platform fallback binaries at runtime; bundling breaks resolution
]);

const makePlugins = (minify: boolean, extras: Plugin[] = []): Plugin[] => {
  const base: Plugin[] = [
    alias,
    nodeResolve({ exportConditions: ['node', 'module', 'default'] }),
    commonjsPlugin(),
    jsonPlugin(),
    replacePlugin({
      preventAssignment: true,
      values: {
        __RRSTACK_VERSION__: JSON.stringify(pkgVersion),
      },
    }),
    typescriptPlugin(),
    ...extras,
  ];
  return minify
    ? [...base, terserPlugin({ format: { comments: false } })]
    : base;
};

const commonInputOptions = (
  minify: boolean,
  extras: Plugin[] = [],
): InputOptions => ({
  plugins: makePlugins(minify, extras),
  onwarn(warning, defaultHandler) {
    defaultHandler(warning);
  },
  external: (id) =>
    nodeExternals.has(id) ||
    externalPkgs.has(id) ||
    // also treat deep subpath imports as external (e.g., clipboardy/fallbacks/...)
    Array.from(externalPkgs).some((p) => id === p || id.startsWith(`${p}/`)),
});

const outCommon = (dest: string): OutputOptions[] => [
  { dir: `${dest}/mjs`, format: 'esm', sourcemap: false },
  { dir: `${dest}/cjs`, format: 'cjs', sourcemap: false },
];

export const buildLibrary = (dest: string): RollupOptions => ({
  input: 'src/index.ts',
  output: outCommon(dest),
  ...commonInputOptions(true),
});

export const buildTypes = (dest: string): RollupOptions => ({
  input: 'src/index.ts',
  output: [{ dir: `${dest}/types`, format: 'esm' }],
  plugins: [dtsPlugin()],
});

export default [
  buildLibrary(outputPath),
  buildTypes(outputPath),
];
