import { GATE_HOLD_MS } from '@/domain/timing';
import type { GestureEvent } from '@/domain/models';
import { useServices } from '@/services/ServicesProvider';
import type { AppServices } from '@/services/ServicesProvider';
import { act, renderApp } from '@/test/renderApp';
import type { RingResult } from './ringResults';
import { FakeHardwareRing, settleProviders } from './testing/practiceTestUtils';
import { useRecordResult, useRecordSqueeze, type RecordResult, type RecordSqueeze } from './useRecordResult';
import { useRing, type RingController } from './useRing';

const AT = Date.UTC(2026, 8, 15, 11, 0);
const tap: RingResult = { id: 'r1', at: AT, kind: 'command', token: 'back', contact: 'index_base', durationMs: 180 };

interface Captured {
  record: RecordResult;
  recordSqueeze: RecordSqueeze;
  services: AppServices;
  ring: RingController;
}

let captured: Captured | null = null;
const saved: GestureEvent[] = [];

function Probe() {
  const record = useRecordResult();
  const ring = useRing({
    announce: false,
    onResult: (result) => saved.push(record(result, { source: 'simulator', mode: 'guided', targetContact: 'index_tip' })),
  });
  captured = { record, recordSqueeze: useRecordSqueeze(), services: useServices(), ring };
  return null;
}

function get(): Captured {
  if (!captured) throw new Error('Probe did not render');
  return captured;
}

afterEach(() => {
  captured = null;
  saved.length = 0;
  vi.useRealTimers();
});

describe('useRecordResult', () => {
  it('saves a Demo Mode result as simulated and returns the stored event', async () => {
    renderApp(<Probe />);
    await settleProviders();
    let event: GestureEvent | null = null;
    act(() => {
      event = get().record(tap, { source: 'training', mode: 'lesson', targetContact: 'index_base', lessonId: 'confirm_and_back' });
    });
    expect(event).toMatchObject({
      at: new Date(AT).toISOString(),
      source: 'training',
      mode: 'lesson',
      targetContact: 'index_base',
      detectedContact: 'index_base',
      token: 'back',
      outcome: 'recognised',
      evidence: 'simulated',
      seeded: false,
      lessonId: 'confirm_and_back',
    });
    expect(get().services.history.list()).toEqual([event]);
  });

  it('saves results from a connected hardware ring as measured', async () => {
    renderApp(<Probe />, { deviceAdapter: new FakeHardwareRing('connected') });
    await settleProviders();
    let event: GestureEvent | null = null;
    act(() => {
      event = get().record(tap, { source: 'device', mode: 'device' });
    });
    expect(event).toMatchObject({ evidence: 'measured', outcome: 'recognised', targetContact: null });
  });

  it('never labels anything measured while the hardware ring is not connected', async () => {
    renderApp(<Probe />, { deviceAdapter: new FakeHardwareRing('disconnected') });
    await settleProviders();
    let event: GestureEvent | null = null;
    act(() => {
      event = get().record(tap, { source: 'simulator', mode: 'free' });
    });
    expect(event).toMatchObject({ evidence: 'simulated' });
  });

  it('records what the simulated ring produced, including a mismatch against the target', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderApp(<Probe />);
    await settleProviders();
    act(() => get().ring.squeeze());
    act(() => {
      vi.advanceTimersByTime(GATE_HOLD_MS);
    });
    act(() => {
      get().ring.pressStart('index_base');
      get().ring.pressEnd('index_base');
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      source: 'simulator',
      mode: 'guided',
      targetContact: 'index_tip',
      detectedContact: 'index_base',
      token: 'back',
      outcome: 'mismatch',
      evidence: 'simulated',
    });
    expect(get().services.history.count()).toBe(1);
  });
});

describe('useRecordSqueeze', () => {
  it('saves a squeeze for a lesson', async () => {
    renderApp(<Probe />);
    await settleProviders();
    let event: GestureEvent | null = null;
    act(() => {
      event = get().recordSqueeze({ source: 'training', mode: 'lesson', lessonId: 'squeeze_to_activate' }, AT);
    });
    expect(event).toMatchObject({
      at: new Date(AT).toISOString(),
      outcome: 'recognised',
      token: null,
      detectedContact: null,
      evidence: 'simulated',
      lessonId: 'squeeze_to_activate',
    });
    expect(get().services.history.count()).toBe(1);
  });
});
