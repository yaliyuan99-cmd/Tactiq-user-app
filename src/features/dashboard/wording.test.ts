import { COMMANDS, DEFAULT_SHORTCUT_MAPPING } from '@/domain/commands';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { CalibrationSummary } from '@/domain/models';
import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';
import { calibrationCoverage, summariseCalibration } from '@/services/calibration/calibrationRules';
import type { DeviceInfo } from '@/services/device/types';
import { makeGestureEvent } from '@/services/history/testing';
import { activityLabel, activitySourceText, describeActivity } from './activityWording';
import {
  calibratedPointCount,
  calibrationLastPerformedText,
  calibrationLinkText,
  calibrationStatusText,
} from './calibrationWording';
import { commandRows } from './commandRows';
import {
  deviceModeText,
  lastConnectionText,
  needsTroubleshooting,
  reportedBatteryPercentage,
  troubleshootingTips,
} from './deviceWording';
import { joinWithAnd } from './text';

const NOW = new Date('2026-09-15T10:00:00.000Z');

function summary(patch: Partial<CalibrationSummary>): CalibrationSummary {
  return { ...summariseCalibration(null), ...patch };
}

describe('calibration wording', () => {
  it('names each status in words', () => {
    expect(calibrationStatusText(summary({ status: 'not_started' }))).toBe('Not calibrated');
    expect(calibrationStatusText(summary({ status: 'complete' }))).toBe('Complete');
  });

  it('counts points with enough taps while in progress', () => {
    const coverage = calibrationCoverage(null).map((c, i) => (i < 3 ? { ...c, accepted: c.required, needsRepeat: false } : c));
    const inProgress = summary({ status: 'in_progress', coverage });
    expect(calibratedPointCount(inProgress)).toBe(3);
    expect(calibrationStatusText(inProgress)).toBe('In progress — 3 of 8 points done');
  });

  it('lists the points needing a repeat', () => {
    expect(calibrationStatusText(summary({ status: 'incomplete', pointsNeedingRepeat: ['index_tip'] }))).toBe(
      'Needs repeating: Index fingertip',
    );
    expect(
      calibrationStatusText(summary({ status: 'incomplete', pointsNeedingRepeat: ['index_tip', 'ring_base', 'pinky_tip'] })),
    ).toBe('Needs repeating: Index fingertip, Ring finger base and Pinky fingertip');
    expect(calibrationStatusText(summary({ status: 'incomplete' }))).toBe('Needs repeating: all 8 points');
    expect(calibrationStatusText(summary({ status: 'incomplete', pointsNeedingRepeat: [] }))).toBe('Not finished');
  });

  it('describes when calibration was last performed', () => {
    expect(calibrationLastPerformedText(summary({}), NOW)).toBe('Never');
    expect(calibrationLastPerformedText(summary({ lastPerformedAt: '2026-09-15T09:55:00.000Z' }), NOW)).toBe('5 minutes ago');
  });

  it('offers Recalibrate only once complete', () => {
    expect(calibrationLinkText({ status: 'complete' })).toBe('Recalibrate');
    expect(calibrationLinkText({ status: 'incomplete' })).toBe('Calibrate');
    expect(calibrationLinkText({ status: 'not_started' })).toBe('Calibrate');
  });
});

describe('device wording', () => {
  const device: DeviceInfo = {
    id: 'ring',
    name: 'Tactiq Ring',
    firmwareVersion: null,
    battery: { reported: false, note: BATTERY_UNAVAILABLE_NOTE },
    lastConnectedAt: '2026-09-15T08:00:00.000Z',
    evidence: 'measured',
  };

  it('names the mode', () => {
    expect(deviceModeText({ mode: 'demo' })).toBe('Demo Mode (simulated ring)');
    expect(deviceModeText({ mode: 'hardware' })).toBe('Bluetooth ring (bench prototype)');
  });

  it('uses the device, then the remembered ring, for the last connection', () => {
    expect(lastConnectionText({ mode: 'hardware', device, remembered: null }, NOW)).toBe('2 hours ago');
    expect(
      lastConnectionText(
        { mode: 'hardware', device: null, remembered: { id: 'ring', name: 'Tactiq Ring', lastConnectedAt: '2026-09-15T09:30:00.000Z' } },
        NOW,
      ),
    ).toBe('30 minutes ago');
    expect(lastConnectionText({ mode: 'hardware', device: null, remembered: null }, NOW)).toBe('Never in this browser');
    expect(lastConnectionText({ mode: 'demo', device, remembered: null }, NOW)).toBe('Not needed. The simulated ring is always ready.');
  });

  it('only returns a battery percentage the ring reported', () => {
    expect(reportedBatteryPercentage({ device })).toBeNull();
    expect(reportedBatteryPercentage({ device: null })).toBeNull();
    expect(reportedBatteryPercentage({ device: { ...device, battery: { reported: true, percentage: 64 } } })).toBe(64);
  });

  it('troubleshoots only an unreachable hardware ring, with three tips', () => {
    for (const kind of ['disconnected', 'unsupported', 'permission_denied', 'error'] as const) {
      expect(needsTroubleshooting('hardware', kind)).toBe(true);
      expect(troubleshootingTips(kind)).toHaveLength(3);
    }
    expect(needsTroubleshooting('demo', 'demo')).toBe(false);
    expect(needsTroubleshooting('hardware', 'connected')).toBe(false);
    expect(needsTroubleshooting('hardware', 'connecting')).toBe(false);
    expect(troubleshootingTips('connected')).toEqual([]);
  });
});

describe('activity wording', () => {
  it('describes each outcome in words', () => {
    expect(describeActivity(makeGestureEvent())).toBe('Confirm recognised');
    expect(
      describeActivity(makeGestureEvent({ outcome: 'mismatch', targetContact: 'middle_base', detectedContact: 'ring_base', token: 'previous' })),
    ).toBe('Aimed for Next, detected Previous');
    expect(describeActivity(makeGestureEvent({ outcome: 'rejected_duration', token: null, targetContact: 'index_base' }))).toBe(
      'Dismiss / Back: press too long, ignored',
    );
    expect(describeActivity(makeGestureEvent({ outcome: 'rejected_duration', token: null, targetContact: null }))).toBe(
      'Press too long, ignored',
    );
    expect(describeActivity(makeGestureEvent({ outcome: 'window_closed', token: null, targetContact: 'ring_tip' }))).toBe(
      'Read / Repeat: the command window had closed',
    );
    expect(describeActivity(makeGestureEvent({ outcome: 'recognised', token: null, targetContact: null, detectedContact: null }))).toBe(
      'Squeeze recognised',
    );
    expect(describeActivity(makeGestureEvent({ outcome: 'emergency_cancelled', token: null, targetContact: 'pinky_tip' }))).toBe(
      'Emergency hold cancelled before five seconds',
    );
  });

  it('describes a calibration tap by its point, never as a command that fired', () => {
    const tap = (patch: Parameters<typeof makeGestureEvent>[0]) =>
      describeActivity(makeGestureEvent({ source: 'calibration', mode: 'calibration', ...patch }));

    // Calibration prompts a contact point, so "Shortcut 2 recognised" would
    // imply a shortcut ran.
    expect(tap({ targetContact: 'pinky_base', detectedContact: 'pinky_base', token: 'quick_action_2' })).toBe(
      'Pinky finger base tap accepted',
    );
    expect(
      tap({ outcome: 'mismatch', targetContact: 'ring_base', detectedContact: 'ring_tip', token: 'read' }),
    ).toBe('Asked for ring finger base, detected ring fingertip');
    expect(tap({ outcome: 'window_closed', token: null, targetContact: 'index_tip', detectedContact: null })).toBe(
      'Index fingertip: the command window had closed',
    );
  });

  it('always carries the simulation notice for a completed emergency hold', () => {
    const text = describeActivity(makeGestureEvent({ outcome: 'emergency', token: 'emergency', targetContact: 'pinky_tip' }));
    expect(text).toContain(EMERGENCY_SIMULATION_NOTICE);
  });

  it('names the source', () => {
    expect(activitySourceText({ source: 'simulator', mode: 'guided' })).toBe('Simulator, guided practice');
    expect(activitySourceText({ source: 'simulator', mode: 'free' })).toBe('Simulator, free practice');
    expect(activitySourceText({ source: 'training', mode: 'lesson', lessonId: 'confirm_and_back' })).toBe('Lesson 2');
    expect(activitySourceText({ source: 'training', mode: 'lesson' })).toBe('Training');
    expect(activitySourceText({ source: 'calibration', mode: 'calibration' })).toBe('Calibration');
    expect(activitySourceText({ source: 'device', mode: 'device' })).toBe('Bluetooth ring');
  });

  it('labels sample records before their evidence', () => {
    expect(activityLabel({ seeded: true, evidence: 'simulated' })).toBe('Sample');
    expect(activityLabel({ seeded: false, evidence: 'simulated' })).toBe('Simulated');
    expect(activityLabel({ seeded: false, evidence: 'measured' })).toBe('Measured');
  });
});

describe('commandRows', () => {
  it('lists all nine interactions in command-map order with the saved shortcuts', () => {
    const rows = commandRows({ quick_action_1: 'toggle_flashlight', quick_action_2: 'unassigned' });
    expect(rows.map((r) => r.token)).toEqual(COMMANDS.map((c) => c.token));
    expect(rows.map((r) => `${r.point} → ${r.command}`)).toEqual([
      'Index fingertip → Confirm',
      'Index finger base → Dismiss / Back',
      'Middle fingertip → Undo',
      'Middle finger base → Next',
      'Ring fingertip → Read / Repeat',
      'Ring finger base → Previous',
      'Pinky fingertip, brief tap → Shortcut 1: Turn the torch on or off',
      'Pinky finger base → Shortcut 2 (nothing assigned)',
      'Pinky fingertip, held 5 seconds → Emergency',
    ]);
  });

  it('carries the map abbreviation and command kind', () => {
    const rows = commandRows(DEFAULT_SHORTCUT_MAPPING);
    expect(rows[0]).toMatchObject({ abbreviation: 'IT', kind: 'fixed' });
    expect(rows[6]).toMatchObject({ abbreviation: 'PT', kind: 'shortcut', command: 'Shortcut 1: Play or pause media' });
    expect(rows[8]).toMatchObject({ abbreviation: 'PT', kind: 'emergency' });
  });
});

describe('joinWithAnd', () => {
  it('joins zero, one, two and more names', () => {
    expect(joinWithAnd([])).toBe('');
    expect(joinWithAnd(['A'])).toBe('A');
    expect(joinWithAnd(['A', 'B'])).toBe('A and B');
    expect(joinWithAnd(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
