import {
  CALIBRATION_SAMPLES_PER_CONTACT,
  CALIBRATION_TAPS_TOTAL,
  GATE_HOLD_MS,
  TIMING_FACTS,
  formatMs,
} from './timing';
import { CONTACT_KEYS } from './contacts';

describe('TIMING_FACTS', () => {
  it('keeps the gate hold as a placeholder and says the 200–350 ms range is only expected', () => {
    const gate = TIMING_FACTS.find((fact) => fact.id === 'gate_hold');
    expect(gate?.status).toBe('placeholder');
    expect(gate?.valueMs).toBe(GATE_HOLD_MS);
    expect(gate?.source).toContain('between 200 and 350 ms');
    expect(gate?.source).toMatch(/expected, not measured/);
  });

  it('names a source for every value', () => {
    for (const fact of TIMING_FACTS) {
      expect(fact.source.length).toBeGreaterThan(0);
      expect(Number.isFinite(fact.valueMs)).toBe(true);
    }
  });
});

describe('calibration length', () => {
  it('counts three taps on each of the eight contact points', () => {
    expect(CALIBRATION_TAPS_TOTAL).toBe(CALIBRATION_SAMPLES_PER_CONTACT * CONTACT_KEYS.length);
    expect(CALIBRATION_TAPS_TOTAL).toBe(24);
  });
});

describe('formatMs', () => {
  it('writes milliseconds below a second and seconds above it', () => {
    expect(formatMs(150)).toBe('150 ms');
    expect(formatMs(500)).toBe('500 ms');
    expect(formatMs(3000)).toBe('3 s');
    expect(formatMs(5000)).toBe('5 s');
    expect(formatMs(1500)).toBe('1.5 s');
  });
});
