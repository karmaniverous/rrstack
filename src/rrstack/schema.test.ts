import { describe, expect, it } from 'vitest';

import { RRSTACK_JSON_SCHEMA } from '../index';

describe('RRSTACK_JSON_SCHEMA export', () => {
  it('exists and includes DurationParts positivity (anyOf)', () => {
    expect(RRSTACK_JSON_SCHEMA).toBeTruthy();

    const root: any = RRSTACK_JSON_SCHEMA as any;

    // Try definitions first
    const defs = root.definitions ?? {};
    let duration: any =
      defs.DurationParts ??
      // heuristic scan for a definition with DurationParts-like properties
      Object.values(defs).find((d: any) => {
        const p = d?.properties;
        return (
          p &&
          ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'].every(
            (k) => k in p,
          )
        );
      });

    // Fallback to inline under rules.items.properties.duration
    if (!duration) duration = root?.properties?.rules?.items?.properties?.duration ?? undefined;
    expect(duration).toBeTruthy();
    expect(Array.isArray(duration.anyOf)).toBe(true);
    expect((duration.anyOf as unknown[]).length).toBeGreaterThanOrEqual(7);
  });
});
