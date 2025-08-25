import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock spawn to avoid launching real processes; capture calls.
const spawnCalls: Array<{ cmd: string; optsCwd?: string }> = [];

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    __esModule: true,
    ...actual,
    default: actual as unknown as object,
    spawn: (cmd: string, opts?: { cwd?: string }) => {
      spawnCalls.push({ cmd, optsCwd: opts?.cwd });
      return { unref: () => void 0 } as unknown as import('node:child_process').ChildProcess;
    },
  };
});

import { openFilesInEditor } from './open';

describe('openFilesInEditor', () => {
  let dir: string;
  const envBackup = { ...process.env };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'stan-open-'));
    spawnCalls.length = 0;
  });

  afterEach(async () => {
    process.env = { ...envBackup };
    await rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('in tests without STAN_FORCE_OPEN=1, does nothing', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await writeFile(path.join(dir, 'x.ts'), 'x', 'utf8');

    // NODE_ENV is 'test' by Vitest; no STAN_FORCE_OPEN
    openFilesInEditor({ cwd: dir, files: ['x.ts'], openCommand: 'echo {file}' });

    expect(spawnCalls.length).toBe(0);
    // no “open ->” logs either
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('warns when openCommand is missing {file}', async () => {
    process.env.STAN_FORCE_OPEN = '1';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await writeFile(path.join(dir, 'y.ts'), 'y', 'utf8');

    openFilesInEditor({ cwd: dir, files: ['y.ts'], openCommand: 'code' });

    const logs = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logs.toLowerCase()).toContain('no open command configured');
    logSpy.mockRestore();
  });

  it('spawns a detached editor command when permitted in tests', async () => {
    process.env.STAN_FORCE_OPEN = '1';
    await writeFile(path.join(dir, 'z.ts'), 'z', 'utf8');

    openFilesInEditor({ cwd: dir, files: ['z.ts'], openCommand: 'echo {file}' });

    expect(spawnCalls.length).toBe(1);
    expect(spawnCalls[0].cmd).toBe('echo z.ts');
    expect(spawnCalls[0].optsCwd?.replace(/\\/g, '/')).toBe(dir.replace(/\\/g, '/'));
  });
});
