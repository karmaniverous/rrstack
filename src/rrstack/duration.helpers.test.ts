import { describe, expect,it } from 'vitest';

import { fromIsoDuration,toIsoDuration } from './duration';

describe('duration helpers: toIsoDuration / fromIsoDuration', () => {
  it('serializes weeks-only and normalizes mixed weeks to days', () => {
    expect(toIsoDuration({ weeks: 2 })).toBe('P2W');
    expect(toIsoDuration({ weeks: 1, days: 2 })).toBe('P9D');
    expect(toIsoDuration({ hours: 24 })).toBe('PT24H');
    expect(toIsoDuration({ days: 1 })).toBe('P1D');
    expect(toIsoDuration({ hours: 1, minutes: 30 })).toBe('PT1H30M');
  });

  it('parses valid ISO durations', () => {
    expect(fromIsoDuration('P2W')).toEqual({ weeks: 2 });
    expect(fromIsoDuration('PT1H30M')).toEqual({ hours: 1, minutes: 30 });
    expect(fromIsoDuration('P1D')).toEqual({ days: 1 });
  });

  it('rejects invalid or zero durations', () => {
    expect(() => fromIsoDuration('P1W2D')).toThrow();
    expect(() => fromIsoDuration('PT1.5H')).toThrow();
    expect(() => toIsoDuration({} as any)).toThrow();
    expect(() => fromIsoDuration('P0D')).toThrow();
  });
});
