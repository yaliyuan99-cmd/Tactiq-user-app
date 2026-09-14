import {
  COMMAND_WINDOW_MS,
  EMERGENCY_ARMING_CUE_MS,
  EMERGENCY_HOLD_MS,
  GATE_HOLD_MS,
} from '@/domain/timing';
import { RingStateMachine, type RingEvent } from './RingStateMachine';

const START = 1_000_000;

function setup(options: { commandWindowMs?: number } = {}) {
  const machine = new RingStateMachine({ now: () => Date.now(), ...options });
  const events: RingEvent[] = [];
  machine.subscribe((event) => events.push(event));
  const ofType = <T extends RingEvent['type']>(type: T) =>
    events.filter((e): e is Extract<RingEvent, { type: T }> => e.type === type);
  const armNow = () => {
    machine.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS);
  };
  return { machine, events, ofType, armNow };
}

beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RingStateMachine gate and window', () => {
  it('arms only after the squeeze has been held for the gate time', () => {
    const { machine, events } = setup();
    machine.squeeze();
    vi.advanceTimersByTime(GATE_HOLD_MS - 1);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    const armedAt = START + GATE_HOLD_MS;
    expect(events).toEqual([{ type: 'gate', armed: true, closesAt: armedAt + COMMAND_WINDOW_MS, at: armedAt }]);
    expect(machine.getSnapshot()).toEqual({
      armed: true,
      closesAt: armedAt + COMMAND_WINDOW_MS,
      pressing: null,
      emergencyFired: false,
    });
  });

  it('closes the window after the command window with a gate event and no reject', () => {
    const { machine, events, armNow } = setup();
    armNow();
    events.length = 0;
    vi.advanceTimersByTime(COMMAND_WINDOW_MS - 1);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual([
      { type: 'gate', armed: false, closesAt: null, at: START + GATE_HOLD_MS + COMMAND_WINDOW_MS },
    ]);
    expect(machine.getSnapshot().armed).toBe(false);
  });

  it('closeWindow closes an open window at once', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.closeWindow();
    expect(ofType('gate').at(-1)).toMatchObject({ armed: false, closesAt: null });
    expect(machine.getSnapshot().armed).toBe(false);
  });

  it('configure changes the window from the next squeeze', () => {
    const { machine, ofType, armNow } = setup();
    machine.configure({ commandWindowMs: 6000 });
    armNow();
    expect(ofType('gate')[0]?.closesAt).toBe(Date.now() + 6000);
    vi.advanceTimersByTime(5999);
    expect(machine.getSnapshot().armed).toBe(true);
    vi.advanceTimersByTime(1);
    expect(machine.getSnapshot().armed).toBe(false);
  });

  it('ignores invalid window lengths', () => {
    const { machine } = setup();
    machine.configure({ commandWindowMs: -5 });
    machine.configure({ commandWindowMs: Number.NaN });
    expect(machine.getCommandWindowMs()).toBe(COMMAND_WINDOW_MS);
  });
});

describe('RingStateMachine taps', () => {
  it('turns a brief tap in the window into a token and refreshes the window', () => {
    const { machine, events, armNow } = setup();
    armNow();
    vi.advanceTimersByTime(1000);
    events.length = 0;
    machine.tap('index_tip');
    const at = Date.now();
    expect(events).toEqual([
      { type: 'press', contact: 'index_tip', at },
      { type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 160, at },
      { type: 'gate', armed: true, closesAt: at + COMMAND_WINDOW_MS, at },
    ]);
    // The refreshed window outlasts the original one.
    vi.advanceTimersByTime(COMMAND_WINDOW_MS - 1);
    expect(machine.getSnapshot().armed).toBe(true);
    vi.advanceTimersByTime(1);
    expect(machine.getSnapshot().armed).toBe(false);
  });

  it('maps a brief pinky fingertip tap to Shortcut 1, never Emergency', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.tap('pinky_tip', 120);
    expect(ofType('token')).toEqual([
      expect.objectContaining({ token: 'quick_action_1', contact: 'pinky_tip', durationMs: 120 }),
    ]);
  });

  it('rejects a press while not armed and ignores it', () => {
    const { machine, events } = setup();
    machine.pressStart('middle_base');
    machine.pressStart('middle_base');
    machine.pressEnd('middle_base');
    expect(events).toEqual([
      { type: 'reject', reason: 'not_armed', contact: 'middle_base', durationMs: null, at: START },
    ]);
    expect(machine.getSnapshot().pressing).toBeNull();
  });

  it('rejects a 700 ms press on the index fingertip as indeterminate', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.pressStart('index_tip');
    vi.advanceTimersByTime(700);
    machine.pressEnd('index_tip');
    expect(ofType('token')).toEqual([]);
    expect(ofType('reject')).toEqual([
      { type: 'reject', reason: 'indeterminate_duration', contact: 'index_tip', durationMs: 700, at: Date.now() },
    ]);
    expect(machine.getSnapshot().armed).toBe(true);
  });

  it('counts a press of exactly the tap limit as a tap', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.tap('ring_tip', 500);
    machine.tap('ring_base', 501);
    expect(ofType('token').map((e) => e.token)).toEqual(['read']);
    expect(ofType('reject')).toEqual([expect.objectContaining({ contact: 'ring_base', durationMs: 501 })]);
  });

  it('resumes the original window after a rejected press', () => {
    const { machine, armNow } = setup();
    armNow();
    const closesAt = machine.getSnapshot().closesAt;
    machine.pressStart('index_base');
    vi.advanceTimersByTime(700);
    machine.pressEnd('index_base');
    expect(machine.getSnapshot().closesAt).toBe(closesAt);
    vi.advanceTimersByTime((closesAt ?? 0) - Date.now());
    expect(machine.getSnapshot().armed).toBe(false);
  });
});

describe('RingStateMachine suspended timeout', () => {
  it('keeps the window open while a contact is held past the timeout, and accepts the tap', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    vi.advanceTimersByTime(2900);
    machine.pressStart('middle_base');
    vi.advanceTimersByTime(400); // the window would have closed 100 ms ago
    expect(ofType('gate').filter((e) => !e.armed)).toEqual([]);
    machine.pressEnd('middle_base');
    expect(ofType('token')).toEqual([expect.objectContaining({ token: 'next', durationMs: 400 })]);
    expect(machine.getSnapshot()).toMatchObject({ armed: true, closesAt: Date.now() + COMMAND_WINDOW_MS });
  });

  it('holds the window for a 2 s press, then rejects it and closes the expired window', () => {
    const { machine, events, ofType, armNow } = setup();
    armNow();
    vi.advanceTimersByTime(2900);
    machine.pressStart('index_tip');
    vi.advanceTimersByTime(2000);
    expect(ofType('gate').filter((e) => !e.armed)).toEqual([]);
    events.length = 0;
    machine.pressEnd('index_tip');
    expect(events.map((e) => e.type)).toEqual(['reject', 'gate']);
    expect(ofType('reject')[0]).toMatchObject({ reason: 'indeterminate_duration', durationMs: 2000 });
    expect(ofType('gate')[0]).toMatchObject({ armed: false });
  });
});

describe('RingStateMachine emergency hold', () => {
  it('reports progress, fires once at five seconds while held, then closes the window', () => {
    const { machine, events, ofType, armNow } = setup();
    armNow();
    events.length = 0;
    machine.pressStart('pinky_tip');
    vi.advanceTimersByTime(EMERGENCY_HOLD_MS - 100);

    const progress = ofType('hold_progress');
    expect(progress).toHaveLength(EMERGENCY_HOLD_MS / 100 - 1);
    expect(progress[0]).toMatchObject({ contact: 'pinky_tip', elapsedMs: 100, totalMs: EMERGENCY_HOLD_MS });
    expect(progress.filter((e) => e.armingCueReached).map((e) => e.elapsedMs)[0]).toBe(EMERGENCY_ARMING_CUE_MS);
    expect(progress.find((e) => e.elapsedMs === EMERGENCY_ARMING_CUE_MS - 100)?.armingCueReached).toBe(false);
    expect(ofType('token')).toEqual([]);
    // Held past the original window: still open.
    expect(ofType('gate')).toEqual([]);

    vi.advanceTimersByTime(100);
    expect(ofType('token')).toEqual([
      { type: 'token', token: 'emergency', contact: 'pinky_tip', durationMs: EMERGENCY_HOLD_MS, at: Date.now() },
    ]);
    expect(ofType('gate')).toEqual([{ type: 'gate', armed: false, closesAt: null, at: Date.now() }]);
    expect(machine.getSnapshot()).toMatchObject({ armed: false, emergencyFired: true });

    const count = events.length;
    vi.advanceTimersByTime(3000);
    machine.pressEnd('pinky_tip');
    expect(events).toHaveLength(count);
    expect(machine.getSnapshot()).toMatchObject({ armed: false, pressing: null, emergencyFired: true });
  });

  it('rejects a pinky fingertip hold released at three seconds', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.pressStart('pinky_tip');
    vi.advanceTimersByTime(3000);
    machine.pressEnd('pinky_tip');
    expect(ofType('token')).toEqual([]);
    expect(ofType('reject')).toEqual([
      { type: 'reject', reason: 'hold_released_early', contact: 'pinky_tip', durationMs: 3000, at: Date.now() },
    ]);
    const progressCount = ofType('hold_progress').length;
    vi.advanceTimersByTime(5000);
    expect(ofType('hold_progress')).toHaveLength(progressCount);
    expect(ofType('token')).toEqual([]);
  });

  it('does not treat a long hold on another contact as a command', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.pressStart('pinky_base');
    vi.advanceTimersByTime(6000);
    machine.pressEnd('pinky_base');
    expect(ofType('hold_progress')).toEqual([]);
    expect(ofType('token')).toEqual([]);
    expect(ofType('reject')[0]).toMatchObject({ reason: 'indeterminate_duration', durationMs: 6000 });
  });

  it('still counts a full hold reported only at release (throttled timers)', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.tap('pinky_tip', 5200);
    expect(ofType('token')).toEqual([expect.objectContaining({ token: 'emergency', durationMs: EMERGENCY_HOLD_MS })]);
    expect(machine.getSnapshot().armed).toBe(false);
  });
});

describe('RingStateMachine cancel and destroy', () => {
  it('cancel abandons a press without a token', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.pressStart('index_tip');
    vi.advanceTimersByTime(200);
    machine.cancel();
    machine.pressEnd('index_tip');
    expect(ofType('token')).toEqual([]);
    expect(ofType('reject')).toEqual([]);
    expect(machine.getSnapshot()).toMatchObject({ armed: true, pressing: null });
  });

  it('cancel during an emergency hold rejects it as released early', () => {
    const { machine, ofType, armNow } = setup();
    armNow();
    machine.pressStart('pinky_tip');
    vi.advanceTimersByTime(2500);
    machine.cancel();
    expect(ofType('reject')).toEqual([expect.objectContaining({ reason: 'hold_released_early', durationMs: 2500 })]);
    vi.advanceTimersByTime(5000);
    expect(ofType('token')).toEqual([]);
  });

  it('destroy clears every timer', () => {
    const { machine, events } = setup();
    machine.squeeze();
    machine.destroy();
    vi.advanceTimersByTime(10_000);
    expect(events).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
