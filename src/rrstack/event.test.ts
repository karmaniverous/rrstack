import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('event effect type', () => {
  const day = Date.UTC(2024, 0, 10);

  describe('compilation', () => {
    it('accepts event rule with freq and no duration', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'daily-5am',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      expect(s.rules).toHaveLength(1);
      expect(s.rules[0].effect).toBe('event');
    });

    it('rejects one-time event without starts', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: {},
      };
      expect(() => new RRStack({ timezone: 'UTC', rules: [rule] })).toThrow();
    });

    it('accepts one-time event with starts', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: day },
        label: 'once',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      expect(s.rules).toHaveLength(1);
      expect(s.rules[0].effect).toBe('event');
    });

    it('rejects event rule with duration', () => {
      const rule: RuleJson = {
        effect: 'event',
        duration: { hours: 1 },
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      };
      expect(() => new RRStack({ timezone: 'UTC', rules: [rule] })).toThrow();
    });
  });

  describe('getEvents', () => {
    it('enumerates event instants in a window', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'daily-5am',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      const from = day; // midnight
      const to = day + 24 * 3600 * 1000; // next midnight
      const events = [...s.getEvents(from, to)];
      expect(events).toHaveLength(1);
      expect(events[0].at).toBe(day + 5 * 3600 * 1000);
      expect(events[0].label).toBe('daily-5am');
    });

    it('events respect blackout windows', () => {
      const eventRule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'daily-5am',
      };
      const blackoutRule: RuleJson = {
        effect: 'blackout',
        duration: { hours: 2 },
        options: { freq: 'daily', byhour: [4], byminute: [0], bysecond: [0] },
      };
      // Default effect is 'auto' which becomes 'active' (opposite of first rule's effect).
      // But first rule is event... let's be explicit.
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'active',
        rules: [blackoutRule, eventRule],
      });
      const from = day;
      const to = day + 24 * 3600 * 1000;
      const events = [...s.getEvents(from, to)];
      // 5 AM falls within the 4-6 AM blackout window, so the event is suppressed
      expect(events).toHaveLength(0);
    });

    it('events outside blackout windows survive', () => {
      const eventRule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [8], byminute: [0], bysecond: [0] },
        label: 'daily-8am',
      };
      const blackoutRule: RuleJson = {
        effect: 'blackout',
        duration: { hours: 2 },
        options: { freq: 'daily', byhour: [4], byminute: [0], bysecond: [0] },
      };
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'active',
        rules: [blackoutRule, eventRule],
      });
      const from = day;
      const to = day + 24 * 3600 * 1000;
      const events = [...s.getEvents(from, to)];
      expect(events).toHaveLength(1);
      expect(events[0].at).toBe(day + 8 * 3600 * 1000);
    });

    it('multiple event rules yield sorted instants', () => {
      const rule1: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [10], byminute: [0], bysecond: [0] },
        label: 'ten',
      };
      const rule2: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'five',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule1, rule2] });
      const from = day;
      const to = day + 24 * 3600 * 1000;
      const events = [...s.getEvents(from, to)];
      expect(events).toHaveLength(2);
      expect(events[0].label).toBe('five');
      expect(events[1].label).toBe('ten');
      expect(events[0].at).toBeLessThan(events[1].at);
    });

    it('events do not affect isActiveAt', () => {
      const eventRule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      };
      // Baseline blackout, no coverage rules → everything is blackout
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'blackout',
        rules: [eventRule],
      });
      // At 5 AM (the event instant), isActiveAt should still be false
      expect(s.isActiveAt(day + 5 * 3600 * 1000)).toBe(false);
    });

    it('events do not appear in getSegments', () => {
      const eventRule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      };
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'active',
        rules: [eventRule],
      });
      const from = day;
      const to = day + 24 * 3600 * 1000;
      const segments = [...s.getSegments(from, to)];
      // Should be a single active segment spanning the whole day
      expect(segments).toHaveLength(1);
      expect(segments[0].status).toBe('active');
      expect(segments[0].start).toBe(from);
      expect(segments[0].end).toBe(to);
    });

    it('empty window yields no events', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      const events = [...s.getEvents(day, day)]; // empty window
      expect(events).toHaveLength(0);
    });
  });

  describe('nextEvent', () => {
    it('returns the next event after a given time', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'daily-5am',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      const result = s.nextEvent(day); // midnight
      expect(result).toBeDefined();
      expect(result!.at).toBe(day + 5 * 3600 * 1000);
      expect(result!.label).toBe('daily-5am');
    });

    it('returns undefined when no events in look-ahead window', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts: day + 365 * 24 * 3600 * 1000, // starts a year from now
        },
        label: 'future',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      // Look ahead only 1 hour
      const result = s.nextEvent(day, 3600 * 1000);
      expect(result).toBeUndefined();
    });

    it('skips events suppressed by blackout', () => {
      const eventRule: RuleJson = {
        effect: 'event',
        options: {
          freq: 'daily',
          byhour: [5, 10],
          byminute: [0],
          bysecond: [0],
        },
        label: 'twice-daily',
      };
      const blackoutRule: RuleJson = {
        effect: 'blackout',
        duration: { hours: 2 },
        options: { freq: 'daily', byhour: [4], byminute: [0], bysecond: [0] },
      };
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'active',
        rules: [blackoutRule, eventRule],
      });
      // 5 AM is blacked out (4-6 AM), next surviving event is 10 AM
      const result = s.nextEvent(day);
      expect(result).toBeDefined();
      expect(result!.at).toBe(day + 10 * 3600 * 1000);
    });
  });

  describe('describeRule', () => {
    it('describes an event rule', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'daily-5am',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      const desc = s.describeRule(0);
      expect(desc).toContain('Event');
    });
  });

  describe('toJson round-trip', () => {
    it('serializes and deserializes event rules', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
        label: 'daily-5am',
      };
      const s1 = new RRStack({ timezone: 'UTC', rules: [rule] });
      const json = s1.toJson();
      const s2 = new RRStack(json);
      expect(s2.rules).toHaveLength(1);
      expect(s2.rules[0].effect).toBe('event');
      const events = [...s2.getEvents(day, day + 24 * 3600 * 1000)];
      expect(events).toHaveLength(1);
    });
  });

  describe('one-time events', () => {
    const eventAt = day + 5 * 3600 * 1000; // 5 AM on Jan 10

    it('appears in getEvents window', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: eventAt },
        label: 'once',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      const events = [...s.getEvents(day, day + 24 * 3600 * 1000)];
      expect(events).toHaveLength(1);
      expect(events[0].at).toBe(eventAt);
      expect(events[0].label).toBe('once');
    });

    it('outside window not returned', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: eventAt },
        label: 'once',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      // Window is the day before
      const before = day - 24 * 3600 * 1000;
      const events = [...s.getEvents(before, day)];
      expect(events).toHaveLength(0);
    });

    it('suppressed by blackout', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: eventAt },
        label: 'once',
      };
      const blackoutRule: RuleJson = {
        effect: 'blackout',
        duration: { hours: 2 },
        options: { freq: 'daily', byhour: [4], byminute: [0], bysecond: [0] },
      };
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'active',
        rules: [blackoutRule, rule],
      });
      const events = [...s.getEvents(day, day + 24 * 3600 * 1000)];
      // 5 AM falls within 4-6 AM blackout
      expect(events).toHaveLength(0);
    });

    it('survives outside blackout', () => {
      const laterEvent = day + 8 * 3600 * 1000; // 8 AM
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: laterEvent },
        label: 'once-8am',
      };
      const blackoutRule: RuleJson = {
        effect: 'blackout',
        duration: { hours: 2 },
        options: { freq: 'daily', byhour: [4], byminute: [0], bysecond: [0] },
      };
      const s = new RRStack({
        timezone: 'UTC',
        defaultEffect: 'active',
        rules: [blackoutRule, rule],
      });
      const events = [...s.getEvents(day, day + 24 * 3600 * 1000)];
      expect(events).toHaveLength(1);
      expect(events[0].at).toBe(laterEvent);
    });

    it('nextEvent finds it', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: eventAt },
        label: 'once',
      };
      const s = new RRStack({ timezone: 'UTC', rules: [rule] });
      const result = s.nextEvent(day);
      expect(result).toBeDefined();
      expect(result!.at).toBe(eventAt);
      expect(result!.label).toBe('once');
    });

    it('toJson round-trip', () => {
      const rule: RuleJson = {
        effect: 'event',
        options: { starts: eventAt },
        label: 'once',
      };
      const s1 = new RRStack({ timezone: 'UTC', rules: [rule] });
      const json = s1.toJson();
      const s2 = new RRStack(json);
      expect(s2.rules).toHaveLength(1);
      expect(s2.rules[0].effect).toBe('event');
      const events = [...s2.getEvents(day, day + 24 * 3600 * 1000)];
      expect(events).toHaveLength(1);
      expect(events[0].at).toBe(eventAt);
    });
  });
});
