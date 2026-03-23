import { describe, expect, it } from 'vitest';

import { RRStack } from './';

describe('O(1) arithmetic resolution for simple sub-daily rules', () => {
  describe('isActiveAt', () => {
    it('minutely freq=5 with timeUnit ms completes quickly', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5 },
          },
        ],
      });

      const t0 = performance.now();
      // Check a time far from epoch — this would hang without the fix.
      const now = Date.now();
      const result = stack.isActiveAt(now);
      const elapsed = performance.now() - t0;

      expect(typeof result).toBe('boolean');
      expect(elapsed).toBeLessThan(50);
    });

    it('secondly freq=1 with timeUnit ms', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { seconds: 1 },
            options: { freq: 'secondly', interval: 1 },
          },
        ],
      });

      // Duration=1s, interval=1s → always active (full coverage)
      expect(stack.isActiveAt(0)).toBe(true);
      expect(stack.isActiveAt(500)).toBe(true);
      expect(stack.isActiveAt(999)).toBe(true);
      expect(stack.isActiveAt(1000)).toBe(true);
    });

    it('hourly freq=2 with timeUnit ms', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { hours: 1 },
            options: { freq: 'hourly', interval: 2 },
          },
        ],
      });

      const hour = 3_600_000;
      // At epoch 0: active
      expect(stack.isActiveAt(0)).toBe(true);
      // At 30 minutes: active (within first hour)
      expect(stack.isActiveAt(hour / 2)).toBe(true);
      // At 1 hour: inactive (gap)
      expect(stack.isActiveAt(hour)).toBe(false);
      // At 2 hours: active (next occurrence)
      expect(stack.isActiveAt(2 * hour)).toBe(true);
    });

    it('minutely with timeUnit s', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 's',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5 },
          },
        ],
      });

      // At 0s: active
      expect(stack.isActiveAt(0)).toBe(true);
      // At 179s (2:59): active
      expect(stack.isActiveAt(179)).toBe(true);
      // At 180s (3:00): inactive (gap)
      expect(stack.isActiveAt(180)).toBe(false);
      // At 300s (5:00): active (next occurrence)
      expect(stack.isActiveAt(300)).toBe(true);
    });

    it('performance: isActiveAt(Date.now()) with minutely takes < 50ms', () => {
      const stack = new RRStack({
        timezone: 'America/New_York',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5 },
          },
        ],
      });

      const t0 = performance.now();
      stack.isActiveAt(Date.now());
      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('with explicit dtstart', () => {
    it('minutely with starts offset', () => {
      const anchor = Date.UTC(2024, 5, 15, 10, 0, 0); // June 15 2024 10:00 UTC

      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5, starts: anchor },
          },
        ],
      });

      // At anchor: active
      expect(stack.isActiveAt(anchor)).toBe(true);
      // 2 min after anchor: active
      expect(stack.isActiveAt(anchor + 2 * 60_000)).toBe(true);
      // 4 min after anchor: inactive (gap)
      expect(stack.isActiveAt(anchor + 4 * 60_000)).toBe(false);
      // 5 min after anchor: active (next occurrence)
      expect(stack.isActiveAt(anchor + 5 * 60_000)).toBe(true);
      // Before anchor: inactive
      expect(stack.isActiveAt(anchor - 1)).toBe(false);
    });
  });

  describe('getEffectiveBounds', () => {
    it('returns bounds for minutely open-start rule', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5 },
          },
        ],
      });

      const t0 = performance.now();
      const bounds = stack.getEffectiveBounds();
      const elapsed = performance.now() - t0;

      // Open-start rule: start is undefined
      expect(bounds.start).toBeUndefined();
      expect(bounds.end).toBeUndefined();
      expect(elapsed).toBeLessThan(100);
    });

    it('returns bounds for minutely rule with explicit start', () => {
      const anchor = Date.UTC(2024, 5, 15, 10, 0, 0);
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5, starts: anchor },
          },
        ],
      });

      const bounds = stack.getEffectiveBounds();
      expect(bounds.start).toBe(anchor);
    });
  });

  describe('getSegments', () => {
    it('enumerates segments over a small window with minutely rule', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5 },
          },
        ],
      });

      // Window: [0, 15min) — should contain 3 active segments (0-3, 5-8, 10-13)
      const segs = [...stack.getSegments(0, 15 * 60_000)];
      const activeSegs = segs.filter((s) => s.status === 'active');
      expect(activeSegs.length).toBe(3);

      expect(activeSegs[0].start).toBe(0);
      expect(activeSegs[0].end).toBe(3 * 60_000);

      expect(activeSegs[1].start).toBe(5 * 60_000);
      expect(activeSegs[1].end).toBe(8 * 60_000);

      expect(activeSegs[2].start).toBe(10 * 60_000);
      expect(activeSegs[2].end).toBe(13 * 60_000);
    });
  });

  describe('nextEvent with minutely event rules', () => {
    it('finds events in range with minutely recurrence', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 'ms',
        rules: [
          {
            effect: 'active',
            duration: { hours: 1 },
            options: { freq: 'hourly', interval: 1 },
          },
          {
            effect: 'event',
            options: { freq: 'minutely', interval: 15 },
            label: 'quarter-hour',
          },
        ],
      });

      // Events at 0, 15min, 30min, 45min within [0, 1h)
      const events = [...stack.getEvents(0, 60 * 60_000)];
      expect(events.length).toBe(4);
      expect(events[0].at).toBe(0);
      expect(events[1].at).toBe(15 * 60_000);
      expect(events[2].at).toBe(30 * 60_000);
      expect(events[3].at).toBe(45 * 60_000);
    });
  });

  describe('timeUnit s', () => {
    it('isActiveAt with secondly rule in seconds mode', () => {
      const stack = new RRStack({
        timezone: 'UTC',
        timeUnit: 's',
        rules: [
          {
            effect: 'active',
            duration: { seconds: 30 },
            options: { freq: 'minutely', interval: 1 },
          },
        ],
      });

      // At 0s: active
      expect(stack.isActiveAt(0)).toBe(true);
      // At 29s: active
      expect(stack.isActiveAt(29)).toBe(true);
      // At 30s: inactive
      expect(stack.isActiveAt(30)).toBe(false);
      // At 60s: active
      expect(stack.isActiveAt(60)).toBe(true);
    });

    it('performance in seconds mode at current time', () => {
      const stack = new RRStack({
        timezone: 'America/Chicago',
        timeUnit: 's',
        rules: [
          {
            effect: 'active',
            duration: { minutes: 3 },
            options: { freq: 'minutely', interval: 5 },
          },
        ],
      });

      const nowSec = Math.floor(Date.now() / 1000);
      const t0 = performance.now();
      stack.isActiveAt(nowSec);
      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
