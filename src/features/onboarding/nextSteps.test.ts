import { LESSON_IDS } from '@/domain/lessons';
import type { TrainingSummary } from '@/domain/models';
import { nextStepLinks, trainingLink } from './nextSteps';

const UNTOUCHED: TrainingSummary = {
  lessonsCompleted: 0,
  lessonsTotal: LESSON_IDS.length,
  attempts: 0,
  correct: 0,
  accuracy: null,
  commandsLearnt: [],
  nextLesson: 'squeeze_to_activate',
  evidence: 'simulated',
};

describe('the training link setup recommends', () => {
  it('offers to start lesson 1 to someone with no progress at all', () => {
    expect(trainingLink(UNTOUCHED)).toEqual({
      id: 'training',
      to: '/dashboard/train/squeeze_to_activate',
      label: 'Start training',
      description: 'Lesson 1 of 5: Squeeze to activate. Open the command window on purpose, so ordinary hand movement never fires a command.',
    });
  });

  it('offers lesson 2 once lesson 1 is done, and says continue', () => {
    const link = trainingLink({
      ...UNTOUCHED,
      lessonsCompleted: 1,
      attempts: 3,
      correct: 3,
      accuracy: 1,
      nextLesson: 'confirm_and_back',
    });
    expect(link.label).toBe('Continue training');
    expect(link.to).toBe('/dashboard/train/confirm_and_back');
    expect(link.description).toContain('Lesson 2 of 5: Confirm and Back.');
  });

  it('says continue, not start, to someone who has attempted lesson 1 without finishing it', () => {
    const link = trainingLink({ ...UNTOUCHED, attempts: 2, correct: 1, accuracy: 0.5 });
    expect(link.label).toBe('Continue training');
    expect(link.to).toBe('/dashboard/train/squeeze_to_activate');
  });

  it('never tells someone who has finished every lesson to continue', () => {
    const link = trainingLink({
      ...UNTOUCHED,
      lessonsCompleted: LESSON_IDS.length,
      attempts: 40,
      correct: 38,
      accuracy: 0.95,
      nextLesson: null,
    });
    expect(link).toEqual({
      id: 'training',
      to: '/dashboard/train',
      label: 'Open training',
      description: 'All 5 lessons are done. Open training to run any of them again.',
    });
  });
});

describe('the three places setup offers at the end', () => {
  it('puts training first, then calibration, then the simulator', () => {
    const links = nextStepLinks(UNTOUCHED);
    expect(links.map((link) => link.id)).toEqual(['training', 'calibrate', 'simulator']);
    expect(links[1]?.to).toBe('/dashboard/calibrate');
    expect(links[2]?.to).toBe('/dashboard/simulator');
  });

  it('describes calibration as a recording, never as teaching or tuning a ring', () => {
    const calibrate = nextStepLinks(UNTOUCHED).find((link) => link.id === 'calibrate');
    expect(calibrate?.description).toContain('records which point you tapped');
    expect(calibrate?.description).toContain('does not adjust a ring');
    expect(calibrate?.description).not.toMatch(/teach|tune/i);
  });
});
