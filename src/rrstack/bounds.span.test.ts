import { describe, expect, it } from 'vitest';

import { getEffectiveBounds } from './bounds';
import { compileRule } from './compile';
import type { TimeZoneId } from './types';

describe('bounds: span rules', () => {
  it('closed active span yields exact earliest and latest', () => {
    const start = Date.UTC(2024, 0, 10, 5, 0, 0);
    const end = Date.UTC(2024, 0, 10, 7, 0, 0);
    const cr = compileRule(
      { effect: 'active', options: { starts: start, ends: end } },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([cr]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(start);
    expect(b.end).toBe(end);
  });

  it('open-start active span produces undefined start and finite end', () => {
    const end = Date.UTC(1970, 0, 2, 0, 0, 0);
    const cr = compileRule(
      { effect: 'active', options: { ends: end } },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([cr]);
    expect(b.empty).toBe(false);
    expect(b.start).toBeUndefined();
    expect(b.end).toBe(end);
  });

  it('open-end active span produces undefined latest bound', () => {
    const start = Date.UTC(2024, 0, 10, 0, 0, 0);
    const cr = compileRule(
      { effect: 'active', options: { starts: start } },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([cr]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(start);
    expect(b.end).toBeUndefined();
  });
});
