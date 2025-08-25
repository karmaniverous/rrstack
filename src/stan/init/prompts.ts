/* src/stan/init/prompts.ts */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ContextConfig, ScriptMap } from '@/stan/config';

/**
 * Parse a comma-separated string into a list of trimmed, non-empty tokens.
 *
 * Examples:
 *   'a, b , ,c' -> ['a','b','c']
 *   ''          -> []
 */
const parseCsv = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

/**
 * Read package.json and return its "scripts" record (or {} when absent).
 *
 * @param cwd - Directory that contains (or is within) a package.json.
 * @returns Record of script keys to commands, or {} if package.json cannot be read.
 */
export const readPackageJsonScripts = async (
  cwd: string,
): Promise<Record<string, string>> => {
  try {
    const raw = await readFile(path.join(cwd, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
};

type Picked = Pick<
  ContextConfig,
  'stanPath' | 'includes' | 'excludes' | 'scripts'
> & {
  /** When true, reset/replace the diff snapshot immediately after init. */
  resetDiff: boolean;
};

/**
 * Prompt the user for stan config values, optionally seeding defaults.
 *
 * Behavior:
 * - If defaults include scripts and the user chooses to preserve them,
 *   the defaults.scripts are returned unchanged.
 * - Otherwise, any selected package.json script keys are mapped to
 *   "npm run <key>" for convenience.
 *
 * @param cwd - Repo root being initialized.
 * @param pkgScripts - Scripts discovered from package.json.
 * @param defaults - Optional default config values (from an existing config).
 * @param preserveScriptsFromDefaults - Suggested default for the "preserve" question.
 * @returns Picked config values to persist to stan.config.yml.
 */
export const promptForConfig = async (
  cwd: string,
  pkgScripts: Record<string, string>,
  defaults?: Partial<ContextConfig>,
  preserveScriptsFromDefaults?: boolean,
): Promise<Picked> => {
  const { default: inquirer } = (await import('inquirer')) as {
    default: { prompt: (qs: unknown[]) => Promise<unknown> };
  };

  const scriptKeys = Object.keys(pkgScripts);
  const defaultSelected = defaults?.scripts
    ? Object.keys(defaults.scripts).filter((k) => scriptKeys.includes(k))
    : [];

  const hasDefaults =
    !!defaults &&
    !!defaults.scripts &&
    Object.keys(defaults.scripts).length > 0;

  const answers = (await inquirer.prompt([
    {
      type: 'input',
      name: 'stanPath',
      message: 'STAN path:',
      default: defaults?.stanPath ?? '.stan',
    },
    {
      type: 'input',
      name: 'includes',
      message:
        'Paths to include (CSV; optional; overrides excludes when provided):',
      default: (defaults?.includes ?? []).join(','),
    },
    {
      type: 'input',
      name: 'excludes',
      message: 'Paths to exclude (CSV; optional):',
      default: (defaults?.excludes ?? []).join(','),
    },
    ...(hasDefaults
      ? [
          {
            type: 'confirm',
            name: 'preserveScripts',
            message: 'Preserve existing scripts from current config?',
            default: preserveScriptsFromDefaults ?? true,
          },
        ]
      : []),
    ...(scriptKeys.length
      ? [
          {
            type: 'checkbox',
            name: 'selectedScripts',
            message: 'Select scripts to include from package.json:',
            choices: scriptKeys.map((k) => ({
              name: `${k}: ${pkgScripts[k]}`,
              value: k,
            })),
            default: defaultSelected,
            loop: false,
          },
        ]
      : []),
    {
      type: 'confirm',
      name: 'resetDiff',
      message: 'Reset diff snapshot now?',
      default: true,
    },
  ])) as {
    stanPath: string;
    includes: string;
    excludes: string;
    preserveScripts?: boolean;
    selectedScripts?: string[];
    resetDiff: boolean;
  };

  const outStan =
    typeof answers.stanPath === 'string' && answers.stanPath
      ? answers.stanPath.trim()
      : (defaults?.stanPath ?? '.stan');

  const includesCsv = answers.includes ?? '';
  const excludesCsv = answers.excludes ?? '';

  let scripts: ScriptMap = {};

  if ((answers.preserveScripts ?? preserveScriptsFromDefaults) && hasDefaults) {
    scripts = { ...(defaults.scripts as ScriptMap) };
  } else {
    const selected =
      Array.isArray(answers.selectedScripts) && answers.selectedScripts.length
        ? answers.selectedScripts.filter(
            (x): x is string => typeof x === 'string',
          )
        : [];
    for (const key of selected) scripts[key] = 'npm run ' + key;
  }

  return {
    stanPath: outStan,
    includes: includesCsv ? parseCsv(includesCsv) : [],
    excludes: excludesCsv ? parseCsv(excludesCsv) : [],
    scripts,
    resetDiff: Boolean(answers.resetDiff),
  };
};
