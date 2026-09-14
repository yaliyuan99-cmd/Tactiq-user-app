import { formatTime } from '@/lib/time';
import { makeGestureEvent as ev } from '@/services/history/testing';
import {
  NO_MATCHING_ACTIVITY,
  contactLabel,
  countEmergencyHolds,
  describeOutcome,
  eventTimeParts,
  intendedCommandLabel,
  joinWithAnd,
  plural,
  recordLabel,
  resultCountMessage,
} from './wording';

describe('describeOutcome', () => {
  it('words every outcome', () => {
    expect(describeOutcome(ev({ outcome: 'recognised' }))).toBe('Recognised');
    expect(describeOutcome(ev({ outcome: 'rejected_duration', token: null }))).toBe('Too long — ignored');
    expect(describeOutcome(ev({ outcome: 'window_closed' }))).toBe('Window closed');
    expect(describeOutcome(ev({ outcome: 'emergency', token: 'emergency' }))).toBe('Emergency hold completed (simulated)');
    expect(describeOutcome(ev({ outcome: 'emergency_cancelled', token: null }))).toBe('Emergency hold cancelled');
  });

  it('names the command a mismatch was detected as, or the contact when no command was recognised', () => {
    expect(describeOutcome(ev({ outcome: 'mismatch', token: 'previous', detectedContact: 'ring_base' }))).toBe(
      'Detected as Previous',
    );
    expect(describeOutcome(ev({ outcome: 'mismatch', token: null, detectedContact: 'ring_base' }))).toBe(
      'Detected as Ring finger base',
    );
    expect(describeOutcome(ev({ outcome: 'mismatch', token: null, detectedContact: null }))).toBe('Not the command asked for');
  });
});

describe('recordLabel', () => {
  it('marks seeded records as Sample before anything else', () => {
    expect(recordLabel({ seeded: true, evidence: 'simulated' })).toBe('Sample');
    expect(recordLabel({ seeded: true, evidence: 'measured' })).toBe('Sample');
  });

  it('otherwise uses the evidence', () => {
    expect(recordLabel({ seeded: false, evidence: 'simulated' })).toBe('Simulated');
    expect(recordLabel({ seeded: false, evidence: 'measured' })).toBe('Measured');
  });
});

describe('labels', () => {
  it('labels contacts and intended commands, or null', () => {
    expect(contactLabel('index_base')).toBe('Index finger base');
    expect(contactLabel(null)).toBeNull();
    expect(intendedCommandLabel(ev({ targetContact: 'index_base', token: 'confirm', outcome: 'mismatch' }))).toBe('Dismiss / Back');
    expect(intendedCommandLabel(ev({ targetContact: null, detectedContact: null, token: null, outcome: 'window_closed' }))).toBeNull();
  });

  it('pluralises and joins', () => {
    expect(plural(1, 'attempt')).toBe('1 attempt');
    expect(plural(0, 'attempt')).toBe('0 attempts');
    expect(joinWithAnd([])).toBe('');
    expect(joinWithAnd(['Undo'])).toBe('Undo');
    expect(joinWithAnd(['Undo', 'Next'])).toBe('Undo and Next');
    expect(joinWithAnd(['Undo', 'Next', 'Previous'])).toBe('Undo, Next and Previous');
  });
});

describe('resultCountMessage', () => {
  it('says there is nothing when the list is empty', () => {
    expect(resultCountMessage([])).toBe(NO_MATCHING_ACTIVITY);
    expect(NO_MATCHING_ACTIVITY).toBe('No attempts in this range.');
  });

  it('counts attempts, with singular wording', () => {
    expect(resultCountMessage([ev()])).toBe('Showing 1 attempt.');
    expect(resultCountMessage([ev(), ev({ outcome: 'mismatch' }), ev({ outcome: 'window_closed' })])).toBe('Showing 3 attempts.');
  });

  it('counts emergency holds separately', () => {
    const hold = ev({ outcome: 'emergency', token: 'emergency', targetContact: 'pinky_tip' });
    const cancelled = ev({ outcome: 'emergency_cancelled', token: null, targetContact: 'pinky_tip' });
    expect(resultCountMessage([ev(), ev(), hold])).toBe('Showing 2 attempts and 1 emergency hold.');
    expect(resultCountMessage([hold, cancelled])).toBe('Showing 2 emergency holds.');
  });
});

describe('countEmergencyHolds', () => {
  it('counts completed and cancelled holds', () => {
    expect(
      countEmergencyHolds([{ outcome: 'emergency' }, { outcome: 'emergency_cancelled' }, { outcome: 'emergency' }, { outcome: 'recognised' }]),
    ).toEqual({ completed: 2, cancelled: 1 });
    expect(countEmergencyHolds([])).toEqual({ completed: 0, cancelled: 0 });
  });
});

describe('eventTimeParts', () => {
  it('splits a record time into day and time of day', () => {
    const iso = new Date(2026, 8, 15, 14, 5).toISOString();
    const parts = eventTimeParts(iso);
    expect(parts.day).toContain('15');
    expect(parts.day).not.toContain('2026');
    expect(parts.time).toBe(formatTime(iso));
  });
});
