import { summariseEvents } from './summarise';
import {
  HISTORY_CSV_COLUMNS,
  HISTORY_EXPORT_NOTE_SIMULATED,
  HISTORY_EXPORT_NOTE_WITH_MEASURED,
  HISTORY_EXPORT_VERSION,
  csvField,
  describeExportScope,
  eventsToCsv,
  eventsToJson,
  historyExportNote,
  wholeHistoryScope,
} from './export';
import type { ExportScope } from './types';
import { makeActivationEvent, makeGestureEvent, makeLegacyActivationEvent } from './testing';

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
  'id,at,source,mode,targetContact,detectedContact,token,durationMs,outcome,evidence,seeded,lessonId,targetToken,kind';

describe('HISTORY_CSV_COLUMNS', () => {
  it('keeps the original column order and appends the new columns at the end', () => {
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
      'kind',
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
      '"evt,1",2026-09-15T01:00:00.000Z,training,lesson,index_tip,index_tip,confirm,200,recognised,simulated,false,confirm_and_back,,command',
    );
    expect(lines[2]).toBe('"evt ""2""",2026-09-15T01:01:00.000Z,simulator,guided,,index_tip,,,window_closed,simulated,true,,,command');
    expect(lines[3]).toBe(
      'evt3,2026-09-15T01:02:00.000Z,training,lesson,pinky_tip,pinky_tip,quick_action_1,180,mismatch,simulated,false,emergency_hold,emergency,command',
    );
    expect(lines).toHaveLength(4);
  });

  it('writes the kind column for an activation, and never leaves it blank', () => {
    const lines = eventsToCsv([
      makeActivationEvent({ id: 'squeeze', at: '2026-09-15T01:00:00.000Z' }),
      makeLegacyActivationEvent({ id: 'old-squeeze', at: '2026-09-15T01:01:00.000Z' }),
    ]).split('\r\n');
    expect(lines[1]).toBe('squeeze,2026-09-15T01:00:00.000Z,training,lesson,,,,,recognised,simulated,false,squeeze_to_activate,,activation');
    // A record saved before the column existed is still written as what it is.
    expect(lines[2]?.endsWith(',activation')).toBe(true);
    expect(lines.every((line) => !line.endsWith(','))).toBe(true);
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

describe('describeExportScope', () => {
  const events = [makeGestureEvent({ id: 'a' }), makeGestureEvent({ id: 'b', seeded: true })];

  it('says it holds everything, and how many records are samples', () => {
    const text = describeExportScope({ total: 2, filtersApplied: false, summary: summariseEvents(events, 'all') });
    expect(text).toBe('All 2 records in this browser. Includes 1 Demo Mode sample record, marked seeded: true.');
  });

  it('says so when the file is a filtered view', () => {
    const text = describeExportScope({ total: 9, filtersApplied: true, summary: summariseEvents([events[0]!], 'today', true) });
    expect(text).toBe('A filtered view: 1 of 9 records in this browser. No sample records.');
  });

  it('names bench records, because the file then holds more than simulated practice', () => {
    const measured = [makeGestureEvent({ id: 'bench', evidence: 'measured' }), makeGestureEvent({ id: 'sim' })];
    const text = describeExportScope({ total: 2, filtersApplied: false, summary: summariseEvents(measured, 'all') });
    expect(text).toBe(
      'All 2 records in this browser. No sample records. 1 record was measured on a bench prototype, which has not been validated.',
    );
    const both = describeExportScope({
      total: 3,
      filtersApplied: false,
      summary: summariseEvents([...measured, makeGestureEvent({ id: 'bench2', evidence: 'measured' })], 'all'),
    });
    expect(both).toMatch(/2 records were measured on a bench prototype/);
  });

  it('builds the whole-history scope from a summary', () => {
    const scope = wholeHistoryScope(summariseEvents(events, 'all'));
    expect(scope.filtersApplied).toBe(false);
    expect(scope.filter).toBeNull();
    expect(scope.counts.total).toBe(2);
    expect(scope.text).toMatch(/^All 2 records/);
  });
});

describe('eventsToJson', () => {
  it('wraps events with the format, version, time, note and scope', () => {
    const event = makeGestureEvent();
    const json = eventsToJson([event], '2026-09-15T04:30:00.000Z');
    expect(JSON.parse(json)).toEqual({
      format: 'tactiq.history',
      version: HISTORY_EXPORT_VERSION,
      exportedAt: '2026-09-15T04:30:00.000Z',
      note: HISTORY_EXPORT_NOTE_SIMULATED,
      filtersApplied: false,
      filter: null,
      scope: 'All 1 record in this browser.',
      events: [event],
    });
    expect(json).toContain('\n  "format": "tactiq.history"');
  });

  it('carries the filter the file was taken through', () => {
    const scope: ExportScope = {
      filtersApplied: true,
      filter: { range: '7d', token: 'next', samples: 'exclude' },
      text: 'A filtered view: 1 of 4 records in this browser. No sample records.',
      counts: summariseEvents([makeGestureEvent()], '7d', true).counts,
    };
    const parsed = JSON.parse(eventsToJson([makeGestureEvent()], '2026-09-15T04:30:00.000Z', scope)) as {
      filtersApplied: boolean;
      filter: { range: string; token: string; samples: string };
      scope: string;
    };
    expect(parsed.filtersApplied).toBe(true);
    expect(parsed.filter).toEqual({ range: '7d', token: 'next', samples: 'exclude' });
    expect(parsed.scope).toMatch(/^A filtered view/);
  });

  it('notes the bench prototype when the file contains a measured record', () => {
    const measured = makeGestureEvent({ id: 'bench', evidence: 'measured' });
    const parsed = JSON.parse(eventsToJson([makeGestureEvent(), measured], '2026-09-15T04:30:00.000Z')) as { note: string };
    expect(parsed.note).toBe(HISTORY_EXPORT_NOTE_WITH_MEASURED);
  });

  it('round-trips the new fields', () => {
    const withTarget = makeGestureEvent({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', outcome: 'mismatch' });
    const activation = makeActivationEvent();
    const without = makeGestureEvent();
    const parsed = JSON.parse(eventsToJson([withTarget, activation, without], '2026-09-15T04:30:00.000Z')) as {
      events: Record<string, unknown>[];
    };
    expect(parsed.events[0]?.targetToken).toBe('emergency');
    expect(parsed.events[0]).toEqual(withTarget);
    expect(parsed.events[1]?.kind).toBe('activation');
    expect(parsed.events[1]).toEqual(activation);
    expect('targetToken' in (parsed.events[2] ?? {})).toBe(false);
    expect('kind' in (parsed.events[2] ?? {})).toBe(false);
  });
});
