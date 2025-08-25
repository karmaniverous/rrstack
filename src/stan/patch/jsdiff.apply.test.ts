import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyWithJsDiff } from './jsdiff';

describe('applyWithJsDiff — happy paths and edge cases', () => {
  let dir: string;
  const read = (p: string) => readFile(p, 'utf8');

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'stan-jsdiff-apply-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('applies a simple one-line replacement (LF)', async () => {
    const rel = 'a.txt';
    await writeFile(path.join(dir, rel), 'old\n', 'utf8');

    const diff = [
      `diff --git a/${rel} b/${rel}`,
      `--- a/${rel}`,
      `+++ b/${rel}`,
      '@@ -1,1 +1,1 @@',
      '-old',
      '+new',
      '',
    ].join('\n');

    const out = await applyWithJsDiff({ cwd: dir, cleaned: diff, check: false });
    expect(out.okFiles).toEqual([rel]);
    const body = await read(path.join(dir, rel));
    expect(body).toBe('new\n');
  });

  it('preserves CRLF when original file uses CRLF', async () => {
    const rel = 'crlf.txt';
    // Original file with CRLF
    await writeFile(path.join(dir, rel), 'Hello\r\nWorld\r\n', 'utf8');

    const diff = [
      `diff --git a/${rel} b/${rel}`,
      `--- a/${rel}`,
      `+++ b/${rel}`,
      '@@ -1,2 +1,2 @@',
      ' Hello',
      '-World',
      '+World!',
      '',
    ].join('\n');

    const out = await applyWithJsDiff({ cwd: dir, cleaned: diff, check: false });
    expect(out.okFiles).toEqual([rel]);
    const body = await read(path.join(dir, rel));
    expect(/\r\n/.test(body)).toBe(true);
    expect(body.includes('World!')).toBe(true);
  });

  it('--check mode writes to sandbox and does not change working file', async () => {
    const rel = 'check.txt';
    await writeFile(path.join(dir, rel), 'A\n', 'utf8');

    const diff = [
      `diff --git a/${rel} b/${rel}`,
      `--- a/${rel}`,
      `+++ b/${rel}`,
      '@@ -1,1 +1,1 @@',
      '-A',
      '+B',
      '',
    ].join('\n');

    const out = await applyWithJsDiff({ cwd: dir, cleaned: diff, check: true });
    expect(out.okFiles).toEqual([rel]);
    // Original unchanged
    const orig = await read(path.join(dir, rel));
    expect(orig).toBe('A\n');
    // Sandbox written
    const sandbox = path.join(dir, '.stan', 'patch', '.sandbox', rel);
    const body = await read(sandbox);
    expect(body).toBe('B\n');
  });

  it('reports a failure when target file does not exist', async () => {
    const rel = 'missing.txt';
    const diff = [
      `diff --git a/${rel} b/${rel}`,
      `--- a/${rel}`,
      `+++ b/${rel}`,
      '@@ -1,1 +1,1 @@',
      '-x',
      '+y',
      '',
    ].join('\n');

    const out = await applyWithJsDiff({ cwd: dir, cleaned: diff, check: false });
    expect(out.okFiles).toEqual([]);
    expect(out.failed.length).toBeGreaterThan(0);
    expect(out.failed[0].path).toBe(rel);
    expect(out.failed[0].reason.toLowerCase()).toContain('not found');
  });
});
