import { ROUTES } from '@/app/routes';
import { COMMANDS } from '@/domain/commands';
import { COMMAND_WINDOW_LONG_MS, TIMING_FACTS, formatMs } from '@/domain/timing';
import {
  COMMAND_SUMMARY_ROWS,
  GETTING_STARTED_STEPS,
  NEXT_STEP_LINKS,
  kindText,
  timingRows,
  touchText,
} from './helpContent';

describe('getting started content', () => {
  it('lists the five steps of every command in order', () => {
    expect(GETTING_STARTED_STEPS.map((step) => step.title)).toEqual(['Squeeze', 'Tap', 'Detect', 'Act', 'Confirm']);
  });

  it('describes ring and phone behaviour in the conditional', () => {
    for (const id of ['detect', 'act', 'confirm'] as const) {
      const step = GETTING_STARTED_STEPS.find((s) => s.id === id);
      expect(step?.text).toMatch(/\bwould\b/);
    }
  });

  it('links to Connect, Calibrate, Train and Simulator', () => {
    expect(NEXT_STEP_LINKS.map((link) => link.to)).toEqual([
      ROUTES.connect,
      ROUTES.calibrate,
      ROUTES.train,
      ROUTES.simulator,
    ]);
  });
});

describe('command summary', () => {
  it('has one row per interaction, in command-map order', () => {
    expect(COMMAND_SUMMARY_ROWS).toHaveLength(9);
    expect(COMMAND_SUMMARY_ROWS.map((row) => row.token)).toEqual(COMMANDS.map((command) => command.token));
  });

  it('describes touches and kinds in words', () => {
    expect(touchText('tap')).toBe('Brief tap');
    expect(touchText('hold_5s')).toBe('Hold for 5 s');
    expect(kindText('fixed')).toBe('Fixed');
    expect(kindText('shortcut')).toBe('Customisable');
    expect(kindText('emergency')).toBe('Fixed, never remappable');
  });

  it('puts Emergency and Shortcut 1 on the same point, separated by the touch', () => {
    const emergency = COMMAND_SUMMARY_ROWS.find((row) => row.token === 'emergency');
    const shortcut = COMMAND_SUMMARY_ROWS.find((row) => row.token === 'quick_action_1');
    expect(emergency).toMatchObject({ contact: 'Pinky fingertip', touch: 'Hold for 5 s', command: 'Emergency' });
    expect(shortcut).toMatchObject({ contact: 'Pinky fingertip', touch: 'Brief tap', kind: 'Customisable' });
    expect(COMMAND_SUMMARY_ROWS[0]).toMatchObject({ contact: 'Index fingertip', command: 'Confirm', kind: 'Fixed' });
  });
});

describe('timing rows', () => {
  it('shows every timing fact with its source, plus the longer window straight after the firmware window', () => {
    const rows = timingRows();
    expect(rows).toHaveLength(TIMING_FACTS.length + 1);
    for (const fact of TIMING_FACTS) {
      expect(rows).toContainEqual(
        expect.objectContaining({ id: fact.id, label: fact.label, value: formatMs(fact.valueMs), source: fact.source }),
      );
    }
    const windowIndex = rows.findIndex((row) => row.id === 'command_window');
    expect(rows[windowIndex + 1]).toMatchObject({
      id: 'command_window_long',
      value: formatMs(COMMAND_WINDOW_LONG_MS),
      status: 'App setting',
    });
  });

  it('labels the placeholder gate hold as a placeholder', () => {
    const rows = timingRows();
    expect(rows.find((row) => row.id === 'gate_hold')?.status).toBe('Placeholder');
    expect(rows.find((row) => row.id === 'tap_max')?.status).toBe('Design value');
  });
});
