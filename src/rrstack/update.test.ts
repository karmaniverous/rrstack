import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { Notice, RRStackOptions, RuleJson } from './types';

describe('RRStack.update() — unit conversion and version policies', () => {
  const ms = (y: number, m: number, d: number, hh = 0, mm = 0, ss = 0) =>
    Date.UTC(y, m, d, hh, mm, ss);

  it('converts retained rules clamp timestamps on ms → s', () => {
    const startMs = ms(2024, 0, 10, 5, 0, 0);
    const endMs = ms(2024, 0, 10, 7, 0, 0);
    const s = new RRStack({
      timezone: 'UTC',
      timeUnit: 'ms',
      // span rule (duration omitted)
      rules: [{ effect: 'active', options: { starts: startMs, ends: endMs } }],
    });

    const notices = s.update({ timeUnit: 's' });
    expect(s.timeUnit).toBe('s');
    const r0 = s.options.rules[0];
    expect(typeof r0.options.starts).toBe('number');
    expect(typeof r0.options.ends).toBe('number');
    expect(r0.options.starts).toBe(Math.trunc(startMs / 1000));
    expect(r0.options.ends).toBe(Math.trunc(endMs / 1000));

    // A timeUnitChange notice should be present by default (warn policy)
    const hasUnit = notices.some((n) => n.kind === 'timeUnitChange');
    expect(hasUnit).toBe(true);
  });

  it('accepts incoming rules as-is on unit change (no conversion applied to incoming)', () => {
    const startMs = ms(2024, 0, 10, 5, 0, 0);
    const endMs = ms(2024, 0, 10, 7, 0, 0);
    const s = new RRStack({
      timezone: 'UTC',
      timeUnit: 'ms',
      rules: [{ effect: 'active', options: { starts: startMs, ends: endMs } }],
    });
    const startSec = Math.trunc(startMs / 1000) - 13; // distinct number to detect unintended conversion
    const endSec = Math.trunc(endMs / 1000) + 17;
    const incoming: RuleJson[] = [
      { effect: 'active', options: { starts: startSec, ends: endSec } },
    ];

    const notices = s.update({ timeUnit: 's', rules: incoming });
    expect(s.timeUnit).toBe('s');
    const r0 = s.options.rules[0];
    expect(r0.options.starts).toBe(startSec);
    expect(r0.options.ends).toBe(endSec);

    // Notice should indicate acceptedIncomingRules path
    const unit = notices.find(
      (n): n is Extract<Notice, { kind: 'timeUnitChange' }> =>
        n.kind === 'timeUnitChange',
    );
    expect(unit?.action).toBe('acceptedIncomingRules');
  });

  it('rejects newer incoming version by default (onVersionDown=error)', () => {
    const s = new RRStack({ timezone: 'UTC' });
    // Engine version is '0.0.0' in tests (fallback); any higher semver is "newer"
    expect(() => s.update({ version: '0.0.1' })).toThrow();
  });

  it('accepts newer incoming version when onVersionDown is warn/off (ingest as current)', () => {
    const s = new RRStack({ timezone: 'UTC' });
    const policies: { mode: 'warn' | 'off' }[] = [
      { mode: 'warn' },
      { mode: 'off' },
    ];
    for (const { mode } of policies) {
      const seen: Notice[] = [];
      const notices = s.update(
        { version: '1.2.3' },
        { onVersionDown: mode, onNotice: (n) => seen.push(n) },
      );
      // No throw; we should see a versionDown notice
      const hasDown = notices.some((n) => n.kind === 'versionDown');
      expect(hasDown).toBe(true);
      // Callback received the same
      expect(seen.some((n) => n.kind === 'versionDown')).toBe(true);
    }
  });

  it('rejects invalid semver by default; accepts with warn/off (ingest as current)', () => {
    const s = new RRStack({ timezone: 'UTC' });
    expect(() => s.update({ version: 'not-semver' })).toThrow();

    const seen: Notice[] = [];
    const notices = s.update(
      { version: 'also:bad' as unknown as string },
      { onVersionInvalid: 'warn', onNotice: (n) => seen.push(n) },
    );
    const hasInvalid = notices.some((n) => n.kind === 'versionInvalid');
    expect(hasInvalid).toBe(true);
    expect(seen.some((n) => n.kind === 'versionInvalid')).toBe(true);
  });

  it('respects onTimeUnitChange=error by throwing; default warn emits a notice', () => {
    const s = new RRStack({ timezone: 'UTC', timeUnit: 'ms' });
    // Default warn: emits a notice, does not throw
    const noticesWarn = s.update({ timeUnit: 's' });
    expect(noticesWarn.some((n) => n.kind === 'timeUnitChange')).toBe(true);

    // Revert to ms for clean state
    s.update({ timeUnit: 'ms' });

    // onTimeUnitChange=error
    expect(() =>
      s.update({ timeUnit: 's' }, { onTimeUnitChange: 'error' }),
    ).toThrow();
  });

  it('invokes onNotice callback once per notice in detection order', () => {
    const s = new RRStack({
      timezone: 'UTC',
      timeUnit: 'ms',
      rules: [{ effect: 'active', options: { starts: ms(2024, 0, 1) } }],
    });

    const seen: Notice[] = [];
    const partial: Partial<RRStackOptions> = {
      // Newer than engine (engine is '0.0.0' in tests)
      version: '0.0.1',
      // Also change unit to trigger timeUnitChange notice (policy warn)
      timeUnit: 's',
    };
    // Accept newer config by policy; and get unit notice
    const notices = s.update(partial, {
      onVersionDown: 'warn',
      onNotice: (n) => seen.push(n),
    });

    // We expect two notices in order: versionDown, timeUnitChange
    expect(Array.isArray(notices)).toBe(true);
    const kinds = notices.map((n) => n.kind);
    expect(kinds[0]).toBe('versionDown');
    expect(kinds[1]).toBe('timeUnitChange');

    // Callback received identical ordering
    const seenKinds = seen.map((n) => n.kind);
    expect(seenKinds).toEqual(kinds);
  });
});
