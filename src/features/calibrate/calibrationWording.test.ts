import { MAX_MISSES_PER_POINT } from './calibrationFlow';
import {
  EMERGENCY_CANCELLED_NOTE,
  afterSampleAnnouncement,
  evidenceSentence,
  joinWithAnd,
  missesSentence,
  numberWord,
  pointCommandSentence,
  progressText,
  promptHeading,
  promptSentence,
  repeatPromptMessage,
  resultsAnnouncement,
  resultsHeading,
  resultsSentence,
  sampleFeedback,
  tapLimitWords,
} from './calibrationWording';
import { ALL_DONE, ok, profile } from './testing/profiles';

describe('calibration wording', () => {
  const input = {
    prompt: 'index_tip',
    detectedContact: 'index_tip',
    accepted: true,
    acceptedCount: 2,
    required: 3,
    misses: 0,
    emergencyCancelled: false,
  } as const;

  it('confirms an accepted tap and a finished point', () => {
    expect(sampleFeedback(input)).toEqual({ message: 'Got it. 2 of 3 on the index fingertip.', tone: 'accepted' });
    expect(sampleFeedback({ ...input, acceptedCount: 3 })).toEqual({ message: 'Index fingertip done.', tone: 'accepted' });
  });

  it('corrects a wrong point and a long press', () => {
    expect(sampleFeedback({ ...input, accepted: false, reason: 'wrong_contact', detectedContact: 'index_base', misses: 1 })).toEqual({
      message: 'That was the index finger base. Tap the index fingertip.',
      tone: 'retry',
    });
    expect(sampleFeedback({ ...input, accepted: false, reason: 'too_long', misses: 1 }).message).toBe(
      'That press was too long. Tap briefly, under half a second.',
    );
    expect(sampleFeedback({ ...input, accepted: false, reason: 'no_contact', detectedContact: null, misses: 1 }).message).toBe(
      'No point was detected. Tap the index fingertip.',
    );
  });

  it('says when a point is marked to repeat, and when an emergency hold was cancelled', () => {
    expect(
      sampleFeedback({ ...input, accepted: false, reason: 'wrong_contact', detectedContact: 'middle_tip', misses: MAX_MISSES_PER_POINT })
        .message,
    ).toBe('That was the middle fingertip. After three tries, we will move on and mark the index fingertip to repeat.');
    expect(
      sampleFeedback({ ...input, prompt: 'pinky_tip', detectedContact: 'pinky_tip', accepted: false, reason: 'too_long', misses: 1, emergencyCancelled: true })
        .message,
    ).toBe(`${EMERGENCY_CANCELLED_NOTE} That press was too long. Tap briefly, under half a second.`);
  });

  it('words prompts, repeats and context', () => {
    expect(promptHeading('index_tip')).toBe('Tap your Index fingertip');
    expect(promptSentence('ring_base')).toBe('Tap your ring finger base.');
    expect(repeatPromptMessage(profile([ok('index_tip')]), 'index_tip')).toBe(
      'Tap your index fingertip. The pad at the very end of your index finger, next to the ring. Sample 2 of 3.',
    );
    expect(pointCommandSentence('index_base')).toBe('In everyday use this point would carry Dismiss / Back.');
    expect(pointCommandSentence('pinky_tip')).toBe(
      'In everyday use this point would carry Shortcut 1. Keep the tap brief: a five-second hold here is Emergency.',
    );
  });

  it('summarises results, misses and evidence', () => {
    expect(resultsHeading(true)).toBe('Calibration complete');
    expect(resultsHeading(false)).toBe('Calibration incomplete');
    expect(resultsSentence(profile(ALL_DONE))).toBe('All eight points have three accepted taps.');
    const short = profile(ALL_DONE.filter((s) => s.contact !== 'ring_tip'));
    expect(resultsSentence(short)).toBe('One point needs repeating: Ring fingertip.');
    const two = profile(ALL_DONE.filter((s) => s.contact !== 'ring_tip' && s.contact !== 'index_base'));
    expect(resultsSentence(two)).toBe('Two points need repeating: Index finger base and Ring fingertip.');
    expect(missesSentence(1)).toBe('One try has not counted on this point. After three, we move on and mark it to repeat.');
    expect(missesSentence(2)).toMatch(/^Two tries have not counted/);
    expect(evidenceSentence('simulated')).toContain('always detects the point you choose');
    expect(evidenceSentence('measured')).toContain('not a validated accuracy result');
    expect(joinWithAnd([])).toBe('');
    expect(joinWithAnd(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('counts progress and small numbers in words', () => {
    expect(progressText(profile([ok('index_tip'), ok('index_base')]))).toBe('2 of 24 taps');
    expect(progressText(null)).toBe('0 of 24 taps');
    expect(numberWord(8)).toBe('eight');
    expect(numberWord(12)).toBe('12');
    expect(tapLimitWords(500)).toBe('half a second');
    expect(tapLimitWords(400)).toBe('400 milliseconds');
  });

  it('adds the next prompt to speech only when the prompt moves on', () => {
    const done = { message: 'Index fingertip done.', tone: 'accepted' } as const;
    expect(afterSampleAnnouncement(done, 'index_tip', 'index_base')).toEqual({
      text: 'Index fingertip done.',
      spoken: 'Index fingertip done. Tap your index finger base.',
    });
    const retry = { message: 'That press was too long. Tap briefly, under half a second.', tone: 'retry' } as const;
    expect(afterSampleAnnouncement(retry, 'index_tip', 'index_tip')).toEqual({ text: retry.message, spoken: retry.message });
  });

  it('announces the end of a run without repeating the focused heading on the live region', () => {
    expect(resultsAnnouncement(profile(ALL_DONE, { status: 'complete' }), 'Pinky finger base done.')).toEqual({
      text: 'Pinky finger base done. All eight points have three accepted taps.',
      spoken: 'Pinky finger base done. Calibration complete. All eight points have three accepted taps.',
    });
    const short = profile(ALL_DONE.filter((s) => s.contact !== 'ring_tip'), { status: 'incomplete' });
    expect(resultsAnnouncement(short, null)).toEqual({
      text: 'One point needs repeating: Ring fingertip.',
      spoken: 'Calibration incomplete. One point needs repeating: Ring fingertip.',
    });
  });
});
