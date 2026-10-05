import { getLesson, type LessonStep } from '@/domain/lessons';
import {
  joinWithAnd,
  lessonActionLabel,
  lessonStatusLabel,
  lessonTitle,
  runSummarySentence,
  stepName,
  teachesPhrase,
} from './trainingWords';

const confirmStep: LessonStep = { kind: 'tap', contact: 'index_tip', token: 'confirm', instruction: 'Tap Confirm.' };
const squeezeStep: LessonStep = { kind: 'squeeze', instruction: 'Squeeze.' };
const cancelStep: LessonStep = {
  kind: 'hold',
  contact: 'pinky_tip',
  token: 'emergency',
  holdMs: 5000,
  expect: 'cancel',
  instruction: 'Cancel.',
};
const completeStep: LessonStep = { ...cancelStep, expect: 'complete', instruction: 'Complete.' };

describe('training words', () => {
  it('names each kind of step for the summary sentence', () => {
    expect(stepName(confirmStep)).toBe('Confirm');
    expect(stepName(squeezeStep)).toBe('the squeeze');
    expect(stepName(cancelStep)).toBe('cancelling the hold');
    expect(stepName(completeStep)).toBe('the full hold');
  });

  it('joins lists and names what a lesson teaches', () => {
    expect(joinWithAnd([])).toBe('');
    expect(joinWithAnd(['Next'])).toBe('Next');
    expect(joinWithAnd(['Next', 'Previous'])).toBe('Next and Previous');
    expect(joinWithAnd(['Undo', 'Shortcut 1', 'Shortcut 2'])).toBe('Undo, Shortcut 1 and Shortcut 2');
    expect(teachesPhrase(getLesson('squeeze_to_activate'))).toBeNull();
    expect(lessonTitle(getLesson('emergency_hold'))).toBe('Lesson 5: Five-second emergency hold');
    expect(teachesPhrase(getLesson('confirm_and_back'))).toBe('Confirm and Dismiss or Back');
  });

  it('words lesson status and the action for it', () => {
    expect(lessonStatusLabel('not_started')).toBe('Not started');
    expect(lessonStatusLabel('in_progress')).toBe('In progress');
    expect(lessonStatusLabel('complete')).toBe('Completed');
    expect(lessonActionLabel('not_started')).toBe('Start');
    expect(lessonActionLabel('in_progress')).toBe('Continue');
    expect(lessonActionLabel('complete')).toBe('Practise again');
  });
});

describe('runSummarySentence', () => {
  const lesson3 = getLesson('next_previous_read');

  it('says there were no retries', () => {
    const records = lesson3.steps.map(() => ({ attempts: 1, correct: 1 }));
    expect(runSummarySentence(lesson3, records)).toBe('You found every point, with no retries.');
    expect(runSummarySentence(getLesson('squeeze_to_activate'), [1, 1, 1].map(() => ({ attempts: 1, correct: 1 })))).toBe(
      'You opened the command window at every step, with no retries.',
    );
  });

  it('names one retry on one command', () => {
    // Step 4 of lesson 3 is Previous.
    const records = lesson3.steps.map((_, i) => ({ attempts: i === 3 ? 2 : 1, correct: 1 }));
    expect(runSummarySentence(lesson3, records)).toBe('You found every point, with one retry on Previous.');
  });

  it('adds retries on the same command together and lists commands in step order', () => {
    // Steps 1, 2 and 6 are Next; step 3 is Read / Repeat.
    const records = [3, 2, 2, 1, 1, 2].map((attempts) => ({ attempts, correct: 1 }));
    expect(runSummarySentence(lesson3, records)).toBe('You found every point, with four retries on Next and one retry on Read or Repeat.');
  });

  it('describes the hold lesson', () => {
    const lesson5 = getLesson('emergency_hold');
    expect(runSummarySentence(lesson5, [{ attempts: 2, correct: 1 }, { attempts: 1, correct: 1 }])).toBe(
      'You completed every hold step, with one retry on cancelling the hold.',
    );
    expect(runSummarySentence(lesson5, [{ attempts: 1, correct: 1 }, { attempts: 12, correct: 1 }])).toBe(
      'You completed every hold step, with 11 retries on the full hold.',
    );
  });
});
