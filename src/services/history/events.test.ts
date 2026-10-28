import { HISTORY_CAP, capHistory, isGestureEvent, sortChronologically } from './events';
import { makeActivationEvent, makeGestureEvent, makeLegacyActivationEvent } from './testing';

describe('isGestureEvent', () => {
  it('accepts a record without targetToken (records saved before the field existed)', () => {
    const legacy = makeGestureEvent();
    expect('targetToken' in legacy).toBe(false);
    expect(isGestureEvent(legacy)).toBe(true);
    expect(isGestureEvent(JSON.parse(JSON.stringify(legacy)))).toBe(true);
  });

  it('accepts and round-trips a valid targetToken', () => {
    const event = makeGestureEvent({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', outcome: 'mismatch' });
    const stored: unknown = JSON.parse(JSON.stringify(event));
    expect(isGestureEvent(stored)).toBe(true);
    expect(stored).toEqual(event);
  });

  it.each([
    ['an unknown command', 'call_mum'],
    ['null', null],
    ['a number', 7],
    ['an empty string', ''],
  ])('rejects a targetToken that is %s', (_label, targetToken) => {
    expect(isGestureEvent({ ...makeGestureEvent(), targetToken })).toBe(false);
  });

  it('accepts a record without kind, and a stored activation kind', () => {
    const legacy = makeLegacyActivationEvent();
    expect('kind' in legacy).toBe(false);
    expect(isGestureEvent(legacy)).toBe(true);
    const activation = makeActivationEvent();
    const stored: unknown = JSON.parse(JSON.stringify(activation));
    expect(isGestureEvent(stored)).toBe(true);
    expect(stored).toEqual(activation);
    expect(isGestureEvent({ ...makeGestureEvent(), kind: 'command' })).toBe(true);
  });

  it.each([
    ['an unknown kind', 'squeeze'],
    ['null', null],
    ['a number', 1],
    ['an empty string', ''],
  ])('rejects a kind that is %s', (_label, kind) => {
    expect(isGestureEvent({ ...makeGestureEvent(), kind })).toBe(false);
  });

  it('rejects non-objects and records missing required fields', () => {
    expect(isGestureEvent(null)).toBe(false);
    expect(isGestureEvent([])).toBe(false);
    expect(isGestureEvent({ ...makeGestureEvent(), id: '' })).toBe(false);
    expect(isGestureEvent({ ...makeGestureEvent(), lessonId: 'lesson_six' })).toBe(false);
  });
});

describe('ordering helpers', () => {
  it('sorts oldest first and caps to the newest events', () => {
    const a = makeGestureEvent({ id: 'a', at: '2026-09-15T01:00:00.000Z' });
    const b = makeGestureEvent({ id: 'b', at: '2026-09-15T02:00:00.000Z' });
    const c = makeGestureEvent({ id: 'c', at: '2026-09-15T03:00:00.000Z' });
    expect(sortChronologically([c, a, b]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(capHistory([a, b, c], 2).map((e) => e.id)).toEqual(['b', 'c']);
    expect(HISTORY_CAP).toBe(5000);
  });
});
