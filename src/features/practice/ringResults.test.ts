import { DEFAULT_SHORTCUT_MAPPING, getCommand, type CommandToken, type ShortcutMapping } from '@/domain/commands';
import type { ContactKey } from '@/domain/contacts';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { DeviceEvent, RejectReason } from '@/services/device/types';
import {
  EMERGENCY_ARMING_MESSAGE,
  describeGate,
  describeRingResult,
  formatSeconds,
  ringResultFromEvent,
  type RingResult,
} from './ringResults';

const AT = Date.UTC(2026, 8, 15, 11, 0);
const mapping = DEFAULT_SHORTCUT_MAPPING;

describe('ringResultFromEvent', () => {
  it('maps a command token to a command result', () => {
    const event: DeviceEvent = { type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 160, at: AT };
    expect(ringResultFromEvent(event, 'r1')).toEqual({
      id: 'r1',
      at: AT,
      kind: 'command',
      token: 'confirm',
      contact: 'index_tip',
      durationMs: 160,
    });
  });

  it('maps the emergency token to an emergency result on the pinky fingertip', () => {
    const event: DeviceEvent = { type: 'token', token: 'emergency', contact: 'pinky_tip', durationMs: 5000, at: AT };
    expect(ringResultFromEvent(event, 'r2')).toEqual({ id: 'r2', at: AT, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 });
  });

  it('maps hold_released_early to a cancelled emergency hold with the elapsed time', () => {
    const event: DeviceEvent = { type: 'reject', reason: 'hold_released_early', contact: 'pinky_tip', durationMs: 1340, at: AT };
    expect(ringResultFromEvent(event, 'r3')).toEqual({
      id: 'r3',
      at: AT,
      kind: 'emergency_cancelled',
      contact: 'pinky_tip',
      elapsedMs: 1340,
    });
  });

  it('uses zero elapsed time when a cancelled hold has no duration', () => {
    const event: DeviceEvent = { type: 'reject', reason: 'hold_released_early', contact: 'pinky_tip', durationMs: null, at: AT };
    expect(ringResultFromEvent(event)).toMatchObject({ kind: 'emergency_cancelled', elapsedMs: 0 });
  });

  it.each(['not_armed', 'indeterminate_duration', 'window_closed'] as const)('maps a %s reject to a rejected result', (reason) => {
    const event: DeviceEvent = { type: 'reject', reason, contact: 'middle_base', durationMs: null, at: AT };
    expect(ringResultFromEvent(event, 'r4')).toEqual({
      id: 'r4',
      at: AT,
      kind: 'rejected',
      reason,
      contact: 'middle_base',
      durationMs: null,
    });
  });

  it('creates an id when none is given', () => {
    const event: DeviceEvent = { type: 'token', token: 'next', contact: 'middle_base', durationMs: 100, at: AT };
    expect(ringResultFromEvent(event)?.id).toMatch(/^ring_/);
  });

  it.each<DeviceEvent>([
    { type: 'gate', armed: true, closesAt: AT + 3000, at: AT },
    { type: 'press', contact: 'index_tip', at: AT },
    { type: 'hold_progress', contact: 'pinky_tip', elapsedMs: 100, totalMs: 5000, armingCueReached: false, at: AT },
    { type: 'line', raw: 'STA,pong', at: AT },
    { type: 'hello', firmwareVersion: 'fw0.2', at: AT },
  ])('returns null for a $type event', (event) => {
    expect(ringResultFromEvent(event)).toBeNull();
  });
});

describe('describeRingResult', () => {
  const command = (token: CommandToken, contact: ContactKey): RingResult => ({
    id: 'c',
    at: AT,
    kind: 'command',
    token,
    contact,
    durationMs: 150,
  });
  const rejected = (
    reason: RejectReason,
    contact: ContactKey | null,
    durationMs: number | null,
  ): RingResult => ({ id: 'x', at: AT, kind: 'rejected', reason, contact, durationMs });

  it('names a fixed command in one short sentence', () => {
    expect(describeRingResult(command('confirm', 'index_tip'), mapping)).toEqual({
      message: 'Confirm.',
      visibleMessage: 'Confirm.',
      feedbackKind: 'confirm',
      shortLabel: 'Confirm',
    });
  });

  it('announces a fixed command in its feedback words, never its slashed label, and keeps the label for the screen', () => {
    expect(describeRingResult(command('back', 'index_base'), mapping)).toEqual({
      message: 'Back.',
      visibleMessage: 'Back.',
      feedbackKind: 'confirm',
      shortLabel: 'Dismiss / Back',
    });
    expect(describeRingResult(command('read', 'ring_tip'), mapping)).toMatchObject({ message: 'Read again.', shortLabel: 'Read / Repeat' });
    for (const token of ['confirm', 'back', 'undo', 'next', 'read', 'previous'] as const) {
      const description = describeRingResult(command(token, getCommand(token).contact), mapping);
      expect(description.message).toBe(getCommand(token).feedback.text);
      expect(description.message).not.toContain('/');
    }
  });

  it('names a shortcut with its action and simulated outcome, marking the outcome Simulated only on screen', () => {
    const description = describeRingResult(command('quick_action_1', 'pinky_tip'), mapping);
    expect(description).toEqual({
      message: 'Shortcut 1: Play or pause media. Media paused.',
      visibleMessage: 'Shortcut 1: Play or pause media. Simulated: Media paused.',
      feedbackKind: 'confirm',
      shortLabel: 'Shortcut 1: Play or pause media',
    });
  });

  it('follows the user’s own shortcut mapping', () => {
    const custom: ShortcutMapping = { quick_action_1: 'toggle_flashlight', quick_action_2: 'start_voice_memo' };
    expect(describeRingResult(command('quick_action_2', 'pinky_base'), custom).message).toBe(
      'Shortcut 2: Start a voice memo. Recording started.',
    );
  });

  it('says plainly when a shortcut has nothing assigned', () => {
    const unassigned: ShortcutMapping = { quick_action_1: 'unassigned', quick_action_2: 'announce_time' };
    expect(describeRingResult(command('quick_action_1', 'pinky_tip'), unassigned)).toEqual({
      message: 'Shortcut 1: nothing assigned.',
      visibleMessage: 'Shortcut 1: nothing assigned.',
      feedbackKind: 'confirm',
      shortLabel: 'Shortcut 1 (nothing assigned)',
    });
  });

  it('explains a press on a sleeping ring', () => {
    expect(describeRingResult(rejected('not_armed', 'index_tip', null), mapping)).toMatchObject({
      message: 'The ring is asleep. Squeeze first, then tap.',
      feedbackKind: 'reject',
    });
  });

  it('explains a press that was too long, with its duration to one decimal place', () => {
    expect(describeRingResult(rejected('indeterminate_duration', 'pinky_tip', 1234), mapping)).toMatchObject({
      message:
        'Not recognised. That press lasted 1.2 seconds — longer than a tap and shorter than the emergency hold, so nothing happened.',
      feedbackKind: 'reject',
      shortLabel: 'Not recognised: press too long',
    });
  });

  it('does not mention the emergency hold for a very long press on a fixed point', () => {
    expect(describeRingResult(rejected('indeterminate_duration', 'ring_tip', 6000), mapping).message).toBe(
      'Not recognised. That press lasted 6.0 seconds. Only a brief tap counts on the ring fingertip, so nothing happened.',
    );
    expect(describeRingResult(rejected('indeterminate_duration', null, 6000), mapping).message).toBe(
      'Not recognised. That press lasted 6.0 seconds. Only a brief tap counts, so nothing happened.',
    );
  });

  it('explains a too-long press without a duration', () => {
    expect(describeRingResult(rejected('indeterminate_duration', 'ring_tip', null), mapping).message).toBe(
      'Not recognised. That press was longer than a tap, so nothing happened.',
    );
  });

  it('explains a closed window', () => {
    expect(describeRingResult(rejected('window_closed', null, null), mapping)).toMatchObject({
      message: 'The command window closed. Squeeze again, then tap.',
      feedbackKind: 'reject',
    });
  });

  it('treats a rejected hold_released_early as a cancelled hold', () => {
    expect(describeRingResult(rejected('hold_released_early', 'pinky_tip', 900), mapping)).toMatchObject({
      message: 'Emergency hold cancelled. Nothing was sent.',
      feedbackKind: 'emergency_cancelled',
    });
  });

  it('includes the simulation notice verbatim when an emergency hold completes', () => {
    const description = describeRingResult({ id: 'e', at: AT, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 }, mapping);
    expect(description.message).toBe(`Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`);
    expect(description.visibleMessage).toContain(EMERGENCY_SIMULATION_NOTICE);
    expect(description.feedbackKind).toBe('emergency');
    expect(description.shortLabel).toBe('Emergency hold complete (simulation only)');
  });

  it('reports a cancelled hold with how long it lasted and that nothing was sent', () => {
    const description = describeRingResult(
      { id: 'e', at: AT, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 2460 },
      mapping,
    );
    expect(description).toEqual({
      message: 'Emergency hold cancelled after 2.5 seconds. Nothing was sent.',
      visibleMessage: 'Emergency hold cancelled after 2.5 seconds. Nothing was sent.',
      feedbackKind: 'emergency_cancelled',
      shortLabel: 'Emergency hold cancelled',
    });
  });
});

describe('describeGate', () => {
  it('names the window length when it opens', () => {
    expect(describeGate(true, 3000)).toBe('Command window open for 3 seconds.');
    expect(describeGate(true, 6000)).toBe('Command window open for 6 seconds.');
    expect(describeGate(true, 2500)).toBe('Command window open for 2.5 seconds.');
  });

  it('says when it closes', () => {
    expect(describeGate(false, 3000)).toBe('Command window closed.');
  });
});

describe('formatSeconds and the arming message', () => {
  it('formats to one decimal place and never below zero', () => {
    expect(formatSeconds(1250)).toBe('1.3');
    expect(formatSeconds(0)).toBe('0.0');
    expect(formatSeconds(-40)).toBe('0.0');
  });

  it('keeps the arming cue wording', () => {
    expect(EMERGENCY_ARMING_MESSAGE).toBe(
      'Emergency hold is being counted. Keep holding for five seconds, or let go to cancel.',
    );
  });
});
