import {
  HISTORY_CSV_COLUMNS,
  HISTORY_EXPORT_NOTE_SIMULATED,
  HISTORY_EXPORT_NOTE_WITH_MEASURED,
  csvField,
  eventsToCsv,
  eventsToJson,
  historyExportNote,
} from './export';
import { makeGestureEvent } from './testing';

describe('csvField', () => {
  it('leaves plain values alone and blanks null or undefined', () => {
    expect(csvField('confirm')).toBe('confirm');
    expect(csvField(240)).toBe('240');
    expect(csvField(true)).toBe('true');
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });

  it('quotes commas, quotes and line breaks, doubling inner quotes', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line\nbreak')).toBe('"line\nbreak"');
    expect(csvField('cr\rhere')).toBe('"cr\rhere"');
  });
});

const CSV_HEADER =
  'id,at,source,mode,targetContact,detectedContact,token,durationMs,outcome,evidence,seeded,lessonId,targetToken';

describe('HISTORY_CSV_COLUMNS', () => {
  it('keeps the original column order and appends targetToken at the end', () => {
    expect([...HISTORY_CSV_COLUMNS]).toEqual([
      'id',
      'at',
      'source',
      'mode',
      'targetContact',
      'detectedContact',
      'token',
      'durationMs',
      'outcome',
      'evidence',
      'seeded',
      'lessonId',
      'targetToken',
    ]);
  });
});

describe('eventsToCsv', () => {
  it('writes the header and one CRLF-separated row per event', () => {
    const csv = eventsToCsv([
      makeGestureEvent({ id: 'evt,1', at: '2026-09-15T01:00:00.000Z', lessonId: 'confirm_and_back', source: 'training', mode: 'lesson' }),
      makeGestureEvent({ id: 'evt "2"', at: '2026-09-15T01:01:00.000Z', targetContact: null, token: null, durationMs: null, outcome: 'window_closed', seeded: true }),
      makeGestureEvent({
        id: 'evt3',
        at: '2026-09-15T01:02:00.000Z',
        source: 'training',
        mode: 'lesson',
        lessonId: 'emergency_hold',
        targetContact: 'pinky_tip',
        targetToken: 'emergency',
        detectedContact: 'pinky_tip',
        token: 'quick_action_1',
        durationMs: 180,
        outcome: 'mismatch',
      }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines[1]).toBe(
      '"evt,1",2026-09-15T01:00:00.000Z,training,lesson,index_tip,index_tip,confirm,200,recognised,simulated,false,confirm_and_back,',
    );
    expect(lines[2]).toBe('"evt ""2""",2026-09-15T01:01:00.000Z,simulator,guided,,index_tip,,,window_closed,simulated,true,,');
    expect(lines[3]).toBe(
      'evt3,2026-09-15T01:02:00.000Z,training,lesson,pinky_tip,pinky_tip,quick_action_1,180,mismatch,simulated,false,emergency_hold,emergency',
    );
    expect(lines).toHaveLength(4);
  });

  it('writes only the header when there are no events', () => {
    expect(eventsToCsv([])).toBe(CSV_HEADER);
  });
});

describe('historyExportNote', () => {
  it('calls the records simulated only when none of them was measured', () => {
    expect(historyExportNote([])).toBe(HISTORY_EXPORT_NOTE_SIMULATED);
    expect(historyExportNote([makeGestureEvent(), makeGestureEvent({ id: 'b' })])).toBe(HISTORY_EXPORT_NOTE_SIMULATED);
    expect(HISTORY_EXPORT_NOTE_SIMULATED).toBe('Simulated practice records from the Tactiq user app. Not hardware measurements.');
  });

  it('drops the "not hardware measurements" claim as soon as one record was measured', () => {
    const mixed = [makeGestureEvent(), makeGestureEvent({ id: 'bench', evidence: 'measured' })];
    expect(historyExportNote(mixed)).toBe(HISTORY_EXPORT_NOTE_WITH_MEASURED);
    expect(historyExportNote([makeGestureEvent({ id: 'bench', evidence: 'measured' })])).toBe(HISTORY_EXPORT_NOTE_WITH_MEASURED);
    expect(HISTORY_EXPORT_NOTE_WITH_MEASURED).not.toMatch(/Not hardware measurements/);
    expect(HISTORY_EXPORT_NOTE_WITH_MEASURED).toMatch(/has not been validated/);
  });
});

describe('eventsToJson', () => {
  it('wraps events with the format, version, time and a plain note', () => {
    const event = makeGestureEvent();
    const json = eventsToJson([event], '2026-09-15T04:30:00.000Z');
    expect(JSON.parse(json)).toEqual({
      format: 'tactiq.history',
      version: 1,
      exportedAt: '2026-09-15T04:30:00.000Z',
      note: HISTORY_EXPORT_NOTE_SIMULATED,
      events: [event],
    });
    expect(json).toContain('\n  "format": "tactiq.history"');
  });

  it('notes the bench prototype when the file contains a measured record', () => {
    const measured = makeGestureEvent({ id: 'bench', evidence: 'measured' });
    const parsed = JSON.parse(eventsToJson([makeGestureEvent(), measured], '2026-09-15T04:30:00.000Z')) as { note: string };
    expect(parsed.note).toBe(HISTORY_EXPORT_NOTE_WITH_MEASURED);
  });

  it('includes targetToken when a record has one', () => {
    const withTarget = makeGestureEvent({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', outcome: 'mismatch' });
    const without = makeGestureEvent();
    const parsed = JSON.parse(eventsToJson([withTarget, without], '2026-09-15T04:30:00.000Z')) as {
      events: Record<string, unknown>[];
    };
    expect(parsed.events[0]?.targetToken).toBe('emergency');
    expect(parsed.events[0]).toEqual(withTarget);
    expect('targetToken' in (parsed.events[1] ?? {})).toBe(false);
  });
});
