import { DEFAULT_SHORTCUT_MAPPING } from '@/domain/commands';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import type { RingResult } from '@/features/practice/ringResults';
import {
  EMPTY_SCORE,
  GUIDED_TAP_TARGETS,
  addToScore,
  contactForTarget,
  correctAnnouncement,
  describeTarget,
  evaluateGuided,
  guidedTargetPool,
  newTargetAnnouncement,
  pickGuidedTarget,
  promptAnnouncement,
  scoreLine,
} from './guided';

const AT = Date.UTC(2026, 8, 15, 10, 0);

function command(token: Extract<RingResult, { kind: 'command' }>['token'], contact: Extract<RingResult, { kind: 'command' }>['contact']): RingResult {
  return { id: 'r', at: AT, kind: 'command', token, contact, durationMs: 150 };
}

describe('target selection', () => {
  it('draws from the eight tap commands, adding Emergency only when asked', () => {
    expect(GUIDED_TAP_TARGETS).toEqual([
      'confirm',
      'back',
      'undo',
      'next',
      'read',
      'previous',
      'quick_action_1',
      'quick_action_2',
    ]);
    expect(guidedTargetPool(false)).not.toContain('emergency');
    expect(guidedTargetPool(true)).toEqual([...GUIDED_TAP_TARGETS, 'emergency']);
  });

  it('uses the random source to pick from the pool', () => {
    expect(pickGuidedTarget(null, false, () => 0)).toBe('confirm');
    expect(pickGuidedTarget(null, false, () => 0.999)).toBe('quick_action_2');
    expect(pickGuidedTarget(null, true, () => 0.999)).toBe('emergency');
  });

  it('never repeats the previous target', () => {
    expect(pickGuidedTarget('confirm', false, () => 0)).toBe('back');
    for (const previous of GUIDED_TAP_TARGETS) {
      for (let step = 0; step < 20; step += 1) {
        expect(pickGuidedTarget(previous, true, () => step / 20)).not.toBe(previous);
      }
    }
  });

  it('copes with a random source outside [0, 1)', () => {
    expect(pickGuidedTarget(null, false, () => 1)).toBe('quick_action_2');
    expect(pickGuidedTarget(null, false, () => -3)).toBe('confirm');
    expect(pickGuidedTarget(null, false, () => Number.NaN)).toBe('confirm');
  });

  it('maps each target to its contact', () => {
    expect(contactForTarget('next')).toBe('middle_base');
    expect(contactForTarget('emergency')).toBe('pinky_tip');
  });
});

describe('target words', () => {
  it('names the command and the contact', () => {
    expect(describeTarget('next')).toEqual({
      command: 'Next',
      where: 'middle finger base',
      visible: 'Next — middle finger base',
      spoken: 'Next, middle finger base',
    });
    expect(describeTarget('confirm').visible).toBe('Confirm — index fingertip');
  });

  it('separates the pinky fingertip tap from the five-second hold', () => {
    expect(describeTarget('quick_action_1').spoken).toBe('Shortcut 1, pinky fingertip, brief tap');
    expect(describeTarget('emergency').visible).toBe('Emergency — hold the pinky fingertip for five seconds');
  });

  it('builds the prompt announcements', () => {
    expect(promptAnnouncement('next')).toBe('Your target: Next, middle finger base.');
    expect(newTargetAnnouncement('previous')).toBe('New target: Previous, ring finger base.');
  });
});

describe('evaluateGuided', () => {
  it('calls the target command correct', () => {
    const evaluation = evaluateGuided('next', command('next', 'middle_base'), DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation).toEqual({
      verdict: 'correct',
      visibleMessage: 'Correct: Next.',
      announcement: { message: 'Correct: Next.', assertive: false },
      detectedContact: null,
      logWords: 'Correct',
    });
    expect(correctAnnouncement(evaluation, 'previous')).toEqual({
      message: 'Correct: Next. New target: Previous, ring finger base.',
      assertive: false,
    });
  });

  it('names the detected command and contact for a wrong point', () => {
    const evaluation = evaluateGuided('next', command('previous', 'ring_base'), DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation.verdict).toBe('wrong');
    expect(evaluation.visibleMessage).toBe(
      'That was Previous, on the ring finger base. Try again: Next, middle finger base.',
    );
    expect(evaluation.announcement).toEqual({ message: evaluation.visibleMessage, assertive: false });
    expect(evaluation.detectedContact).toBe('ring_base');
    expect(evaluation.logWords).toBe('Not the target: Previous');
  });

  it('treats a brief tap on the pinky fingertip as wrong when the target is Emergency', () => {
    const evaluation = evaluateGuided('emergency', command('quick_action_1', 'pinky_tip'), DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation.verdict).toBe('wrong');
    expect(evaluation.visibleMessage).toBe(
      'That was Shortcut 1, on the pinky fingertip. Try again: Emergency, hold the pinky fingertip for five seconds.',
    );
  });

  it('calls a completed hold correct for an Emergency target, with the simulation notice', () => {
    const result: RingResult = { id: 'e', at: AT, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 };
    const evaluation = evaluateGuided('emergency', result, DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation.verdict).toBe('correct');
    expect(evaluation.visibleMessage).toBe(`Correct: Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}`);
    expect(evaluation.announcement?.assertive).toBe(true);
  });

  it('keeps the simulation notice when a completed hold was not the target', () => {
    const result: RingResult = { id: 'e', at: AT, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 };
    const evaluation = evaluateGuided('confirm', result, DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation.verdict).toBe('wrong');
    expect(evaluation.visibleMessage).toContain(EMERGENCY_SIMULATION_NOTICE);
    expect(evaluation.visibleMessage).toContain('Try again: Confirm, index fingertip.');
    expect(evaluation.announcement?.assertive).toBe(true);
    expect(evaluation.detectedContact).toBe('pinky_tip');
  });

  it('leaves dropped presses to the ring announcement and shows the ring words on screen', () => {
    const result: RingResult = {
      id: 'x',
      at: AT,
      kind: 'rejected',
      reason: 'indeterminate_duration',
      contact: 'middle_base',
      durationMs: 1200,
    };
    const evaluation = evaluateGuided('next', result, DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation.verdict).toBe('not_recognised');
    expect(evaluation.announcement).toBeNull();
    expect(evaluation.visibleMessage).toMatch(/^Not recognised\. That press lasted 1\.2 seconds/);
    expect(evaluation.visibleMessage).toMatch(/Try again: Next, middle finger base\.$/);
    expect(evaluation.logWords).toBe('Not recognised: press too long');
  });

  it('leaves a cancelled hold to the ring announcement', () => {
    const result: RingResult = { id: 'c', at: AT, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 3000 };
    const evaluation = evaluateGuided('emergency', result, DEFAULT_SHORTCUT_MAPPING);
    expect(evaluation.verdict).toBe('not_recognised');
    expect(evaluation.announcement).toBeNull();
    expect(evaluation.visibleMessage).toContain('Emergency hold cancelled after 3.0 seconds. Nothing was sent.');
    expect(correctAnnouncement(evaluation, 'confirm')).toBeNull();
  });
});

describe('score', () => {
  it('counts attempts and correct answers', () => {
    let score = EMPTY_SCORE;
    expect(scoreLine(score)).toBe('This session: no attempts yet');
    score = addToScore(score, 'correct');
    score = addToScore(score, 'wrong');
    score = addToScore(score, 'not_recognised');
    expect(score).toEqual({ attempts: 3, correct: 1 });
    expect(scoreLine({ attempts: 9, correct: 7 })).toBe('This session: 7 of 9 correct');
  });
});
