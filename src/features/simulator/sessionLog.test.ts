import { DEFAULT_SHORTCUT_MAPPING } from '@/domain/commands';
import type { RingResult } from '@/features/practice/ringResults';
import { makeGestureEvent } from '@/services/history/testing';
import {
  SESSION_LOG_LIMIT,
  addLogEntry,
  detectedCellText,
  evidenceCellText,
  formatLogTime,
  freeResultWords,
  logEntryFor,
  targetCellText,
  type SessionLogEntry,
} from './sessionLog';

function entry(id: string): SessionLogEntry {
  return {
    id,
    at: '2026-09-15T10:00:00.000Z',
    target: null,
    detectedContact: 'index_tip',
    resultWords: 'Recognised: Confirm',
    evidence: 'simulated',
  };
}

describe('session log', () => {
  it('keeps the newest eight, newest first', () => {
    let log: readonly SessionLogEntry[] = [];
    for (let i = 1; i <= 10; i += 1) log = addLogEntry(log, entry(`e${i}`));
    expect(SESSION_LOG_LIMIT).toBe(8);
    expect(log.map((e) => e.id)).toEqual(['e10', 'e9', 'e8', 'e7', 'e6', 'e5', 'e4', 'e3']);
  });

  it('builds an entry from the saved history event', () => {
    const saved = makeGestureEvent({ id: 'evt_1', detectedContact: 'ring_base', evidence: 'measured' });
    expect(logEntryFor(saved, 'next', 'Not the target: Previous')).toEqual({
      id: 'evt_1',
      at: saved.at,
      target: 'next',
      detectedContact: 'ring_base',
      resultWords: 'Not the target: Previous',
      evidence: 'measured',
    });
  });

  it('describes free-practice results', () => {
    const tap: RingResult = { id: 'a', at: 0, kind: 'command', token: 'quick_action_1', contact: 'pinky_tip', durationMs: 120 };
    expect(freeResultWords(tap, DEFAULT_SHORTCUT_MAPPING)).toBe('Recognised: Shortcut 1: Play or pause media');
    const asleep: RingResult = { id: 'b', at: 0, kind: 'rejected', reason: 'not_armed', contact: 'index_tip', durationMs: null };
    expect(freeResultWords(asleep, DEFAULT_SHORTCUT_MAPPING)).toBe('Not recognised: ring asleep');
  });

  it('words the table cells', () => {
    expect(targetCellText('next')).toBe('Next');
    expect(targetCellText(null)).toBe('None (free practice)');
    expect(detectedCellText('pinky_base')).toBe('Pinky finger base');
    expect(detectedCellText(null)).toBe('None');
    expect(evidenceCellText('simulated')).toBe('Simulated');
    expect(evidenceCellText('measured')).toBe('Measured');
    expect(formatLogTime('2026-09-15T10:04:05.000Z')).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});
