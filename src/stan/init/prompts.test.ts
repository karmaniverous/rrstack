import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { promptForConfig,readPackageJsonScripts } from './prompts';

// Mock inquirer to drive promptForConfig deterministically.
vi.mock('inquirer', () => ({
  __esModule: true,
  default: {
    // We’ll override this return per test by changing the mock implementation
    prompt: vi.fn(async (_qs: unknown[]) => {
      return {
        stanPath: '.stan',
        includes: '',
        excludes: '',
        preserveScripts: false,
        selectedScripts: [],
        resetDiff: true,
      };
    }),
  },
}));

describe('init/prompts helpers', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'stan-prompts-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('readPackageJsonScripts returns scripts map from package.json', async () => {
    const pkg = {
      name: 'x',
      version: '0.0.0',
      scripts: { build: 'rollup -c', test: 'vitest' },
    };
    await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg), 'utf8');

    const scripts = await readPackageJsonScripts(dir);
    expect(scripts).toEqual(pkg.scripts);
  });

  it('promptForConfig: preserves defaults when requested', async () => {
    const inquirer = (await import('inquirer')).default as {
      prompt: (qs: unknown[]) => Promise<unknown>;
    };
    // Preserve defaults, no additional selections
    (inquirer.prompt as any).mockResolvedValueOnce({
      stanPath: '.stan',
      includes: 'docs,assets',
      excludes: 'node_modules',
      preserveScripts: true,
      selectedScripts: [],
      resetDiff: true,
    });

    const defaults = {
      stanPath: '.stan',
      scripts: { test: 'npm run test' },
      includes: [],
      excludes: [],
    };
    const pkgScripts = { build: 'rollup -c', lint: 'eslint .' };

    const picked = await promptForConfig(dir, pkgScripts, defaults, true);

    expect(picked.stanPath).toBe('.stan');
    expect(picked.includes).toEqual(['docs', 'assets']);
    expect(picked.excludes).toEqual(['node_modules']);
    // Preserved defaults.scripts
    expect(Object.keys(picked.scripts)).toEqual(['test']);
    expect(picked.resetDiff).toBe(true);
  });

  it('promptForConfig: builds scripts from selected package.json keys', async () => {
    const inquirer = (await import('inquirer')).default as {
      prompt: (qs: unknown[]) => Promise<unknown>;
    };
    (inquirer.prompt as any).mockResolvedValueOnce({
      stanPath: 'stan',
      includes: '',
      excludes: 'coverage,.rollup.cache',
      preserveScripts: false,
      selectedScripts: ['build', 'test'],
      resetDiff: false,
    });

    const pkgScripts = { build: 'rollup -c', test: 'vitest', lint: 'eslint .' };

    const picked = await promptForConfig(dir, pkgScripts, undefined, false);

    expect(picked.stanPath).toBe('stan');
    expect(picked.includes).toEqual([]);
    expect(picked.excludes).toEqual(['coverage', '.rollup.cache']);
    expect(picked.scripts).toEqual({
      build: 'npm run build',
      test: 'npm run test',
    });
    expect(picked.resetDiff).toBe(false);
  });
});
