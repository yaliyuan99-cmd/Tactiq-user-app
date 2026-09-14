import { resolveCommand } from '@/domain/commands';
import { siblingContact } from '@/domain/contacts';
import { TAP_MAX_MS } from '@/domain/timing';
import { isGestureEvent } from '@/services/history/events';
import { DEMO_HISTORY_SEED, generateDemoEvents } from './demoHistory';
import { mulberry32, pick, randomInt } from './prng';

const DAY = 24 * 60 * 60 * 1000;

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed and differs for another', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('draws inclusive integers and picks from a list', () => {
    const random = mulberry32(7);
    const draws = Array.from({ length: 500 }, () => randomInt(random, 2, 4));
    expect(new Set(draws)).toEqual(new Set([2, 3, 4]));
    expect(['a', 'b']).toContain(pick(random, ['a', 'b']));
    expect(() => pick(random, [])).toThrow();
  });
});

describe('generateDemoEvents', () => {
  const nows = [
    new Date(2026, 8, 15, 14, 30, 0),
    new Date(2026, 8, 15, 0, 1, 0),
    new Date(2026, 8, 15, 8, 3, 0),
    new Date(2026, 8, 15, 23, 59, 59),
  ];

  it('is deterministic for the same seed and time', () => {
    const now = nows[0]!;
    expect(generateDemoEvents(now)).toEqual(generateDemoEvents(now));
    expect(generateDemoEvents(now, DEMO_HISTORY_SEED)).toEqual(generateDemoEvents(now));
    expect(generateDemoEvents(now, 1)).not.toEqual(generateDemoEvents(now));
  });

  it('keeps the same records apart from timestamps at any time of day', () => {
    const strip = (now: Date) => generateDemoEvents(now).map(({ at: _at, ...rest }) => rest);
    expect(strip(nows[1]!)).toEqual(strip(nows[0]!));
  });

  it.each(nows)('stays within the last seven days and never in the future (now = %s)', (now) => {
    const events = generateDemoEvents(now);
    const times = events.map((e) => Date.parse(e.at));
    expect(times.every((t) => t <= now.getTime())).toBe(true);
    expect(times.every((t) => t >= now.getTime() - 7 * DAY)).toBe(true);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    expect(times.some((t) => t >= startOfToday.getTime())).toBe(true);
    const days = new Set(events.map((e) => new Date(e.at).toDateString()));
    expect(days.size).toBe(7);
  });

  it('produces 48–60 valid, labelled, simulated records with no emergencies', () => {
    const events = generateDemoEvents(nows[0]!);
    expect(events.length).toBeGreaterThanOrEqual(48);
    expect(events.length).toBeLessThanOrEqual(60);
    expect(events.every(isGestureEvent)).toBe(true);
    expect(events.every((e) => e.seeded && e.evidence === 'simulated')).toBe(true);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    expect(events.some((e) => e.outcome === 'emergency' || e.outcome === 'emergency_cancelled' || e.token === 'emergency')).toBe(false);
  });

  it('contains only simulator practice, never lesson records', () => {
    const events = generateDemoEvents(nows[0]!);
    expect(new Set(events.map((e) => e.source))).toEqual(new Set(['simulator']));
    expect(new Set(events.map((e) => e.mode))).toEqual(new Set(['guided', 'free']));
    expect(events.every((e) => e.lessonId === undefined)).toBe(true);
  });

  it('is mostly recognised, with sibling mismatches and 2–4 over-long presses', () => {
    const events = generateDemoEvents(nows[0]!);
    const recognised = events.filter((e) => e.outcome === 'recognised');
    const mismatches = events.filter((e) => e.outcome === 'mismatch');
    const rejected = events.filter((e) => e.outcome === 'rejected_duration');
    expect(recognised.length / events.length).toBeGreaterThan(0.75);
    expect(mismatches.length).toBeGreaterThan(0);
    for (const e of mismatches) {
      expect(e.targetContact).not.toBeNull();
      expect(e.detectedContact).toBe(siblingContact(e.targetContact!));
      expect(e.token).toBe(resolveCommand(e.detectedContact!, 'tap')?.token);
    }
    expect(rejected.length).toBeGreaterThanOrEqual(2);
    expect(rejected.length).toBeLessThanOrEqual(4);
    for (const e of rejected) {
      expect(e.durationMs).toBeGreaterThanOrEqual(600);
      expect(e.durationMs).toBeLessThanOrEqual(1400);
      expect(e.token).toBeNull();
    }
    const brief = events.filter((e) => e.outcome !== 'rejected_duration');
    expect(brief.every((e) => e.durationMs !== null && e.durationMs >= 120 && e.durationMs <= 420)).toBe(true);
    expect(brief.every((e) => (e.durationMs ?? 0) <= TAP_MAX_MS)).toBe(true);
  });

  it('records guided and lesson taps against their target, free taps without one', () => {
    const events = generateDemoEvents(nows[0]!);
    for (const e of events.filter((x) => x.outcome === 'recognised')) {
      if (e.mode === 'free') {
        expect(e.targetContact).toBeNull();
        expect(e.token).toBe(resolveCommand(e.detectedContact!, 'tap')?.token);
      } else if (e.lessonId === 'squeeze_to_activate') {
        expect(e.targetContact).toBeNull();
        expect(e.token).toBeNull();
      } else {
        expect(e.detectedContact).toBe(e.targetContact);
        expect(e.token).toBe(resolveCommand(e.targetContact!, 'tap')?.token);
      }
    }
  });
});
