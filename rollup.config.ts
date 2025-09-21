/* See <stanPath>/system/stan.project.md for global requirements.
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

// Resolve package version once for define replacement (typed and safe)
// Also collect runtime dependency names (dependencies + peerDependencies) to mark as external.
let pkgVersion = '0.0.0';
let runtimeExternalPkgs = new Set<string>();
try {
  const pkgJsonText = readFileSync(
    path.resolve(__dirname, 'package.json'),
    'utf8',
  );
  const parsedUnknown: unknown = JSON.parse(pkgJsonText);
  if (typeof parsedUnknown === 'object' && parsedUnknown !== null) {
    if (
      'version' in parsedUnknown &&
      typeof (parsedUnknown as { version?: unknown }).version === 'string'
    ) {
      pkgVersion = (parsedUnknown as { version: string }).version;
    }
    const deps =
      (parsedUnknown as { dependencies?: Record<string, string> })
        .dependencies ?? {};
    const peers =
      (parsedUnknown as { peerDependencies?: Record<string, string> })
        .peerDependencies ?? {};
    runtimeExternalPkgs = new Set<string>([
      ...Object.keys(deps),
      ...Object.keys(peers),
    ]);
  }
} catch {
  // noop — fallback remains '0.0.0' and external set stays empty
}

const srcAbs = path.resolve(__dirname, 'src');
const aliases: Alias[] = [{ find: '@', replacement: srcAbs }];
const alias = aliasPlugin({ entries: aliases });

// Treat Node built-ins and node: specifiers as external.
const nodeExternals = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
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
    // treat runtime dependencies and peer deps as external (and their deep subpaths)
    Array.from(runtimeExternalPkgs).some(
      (p) => id === p || id.startsWith(`${p}/`),
    ),
});

const outCommon = (dest: string): OutputOptions[] => [
  { dir: `${dest}/mjs`, format: 'esm', sourcemap: false },
  { dir: `${dest}/cjs`, format: 'cjs', sourcemap: false },
];

export const buildLibrary = (dest: string): RollupOptions => ({
  input: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.ts',
  },
  output: outCommon(dest),
  ...commonInputOptions(true),
});

export const buildTypes = (dest: string): RollupOptions => ({
  input: 'src/index.ts',
  // Emit a single declaration file at dist/index.d.ts to match package.json
  output: { file: `${dest}/index.d.ts`, format: 'es' },
  plugins: [dtsPlugin()],
});

export const buildTypesReact = (dest: string): RollupOptions => ({
  input: 'src/react/index.ts',
  output: { file: `${dest}/react/index.d.ts`, format: 'es' },
  plugins: [dtsPlugin()],
});

export default [
  buildLibrary(outputPath),
  buildTypes(outputPath),
  buildTypesReact(outputPath),
];
