import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { COMMAND_WINDOW_MS, EMERGENCY_HOLD_MS } from '@/domain/timing';
import { act, screen, waitFor } from '@/test/renderApp';
import { ADVANCE_DELAY_MS } from './lessonLogic';
import {
  advance,
  assertiveRegion,
  feedbackPanel,
  politeRegion,
  renderLessonPage,
  runStatsText,
  savedHistory,
  savedTraining,
  squeeze,
  stepHeading,
  tapPoint,
  within,
  type User,
} from './testing/trainTestUtils';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

const INDEX_TIP_TARGET = 'Index fingertip, Confirm, target';
const INDEX_BASE = 'Index finger base, Dismiss / Back';

async function startLesson(user: User) {
  await user.click(screen.getByRole('button', { name: 'Start lesson' }));
}

describe('LessonPage', () => {
  it('shows the lesson intro with its title, what it teaches, the step count and the time limit', async () => {
    await renderLessonPage('confirm_and_back');
    expect(document.title).toBe('Lesson 2: Confirm and Back · Tactiq');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Lesson 2: Confirm and Back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All lessons' })).toHaveAttribute('href', '/dashboard/train');
    expect(screen.getByRole('heading', { level: 2, name: 'How this lesson works' })).toBeInTheDocument();
    expect(screen.getByText(/Confirm lives on the index fingertip/)).toBeInTheDocument();
    expect(screen.getByText('You will practise').nextElementSibling).toHaveTextContent('Confirm and Dismiss or Back');
    expect(screen.getByText('Steps').nextElementSibling).toHaveTextContent('5');
    expect(screen.getByText(/Each squeeze opens the command window for 3 seconds\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Turn on Longer interaction time in Settings' })).toHaveAttribute(
      'href',
      '/dashboard/settings',
    );
  });

  it('starts lesson 2: squeeze and tap the index fingertip is correct, then the next step follows', async () => {
    const { user, storage } = await renderLessonPage('confirm_and_back');
    await startLesson(user);

    const first = stepHeading(1, 5);
    expect(first).toHaveTextContent('Squeeze, then tap the index fingertip for Confirm.');
    expect(first).toHaveFocus();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 1 of 5');
    expect(savedTraining(storage).getLesson('confirm_and_back').status).toBe('in_progress');
    expect(feedbackPanel()).toHaveTextContent('Waiting for an attempt');

    await squeeze(user);
    await tapPoint(user, INDEX_TIP_TARGET);

    expect(feedbackPanel()).toHaveTextContent('Correct');
    expect(feedbackPanel()).toHaveTextContent('Confirm, on the index fingertip.');
    expect(within(feedbackPanel()).getByRole('button', { name: 'Next step' })).toBeInTheDocument();
    expect(feedbackPanel()).not.toHaveAttribute('role');
    // The lesson's words replace the ring's own "Confirm." rather than being read after it.
    await waitFor(() => expect(politeRegion().textContent).toBe('Correct. Confirm, on the index fingertip.'));
    expect(runStatsText()).toBe('Attempts: 1 · Correct: 1 · Accuracy: 100%');

    advance(ADVANCE_DELAY_MS);
    const second = stepHeading(2, 5);
    expect(second).toHaveTextContent('Squeeze, then tap the index finger base for Dismiss or Back.');
    expect(second).toHaveFocus();
    expect(feedbackPanel()).toHaveTextContent('Waiting for an attempt');
  });

  it('moves on at once with Next step, and stops moving on by itself once the user reaches for the button', async () => {
    const { user } = await renderLessonPage('confirm_and_back');
    await startLesson(user);
    await squeeze(user);
    await tapPoint(user, INDEX_TIP_TARGET);

    const next = within(feedbackPanel()).getByRole('button', { name: 'Next step' });
    act(() => next.focus());
    advance(ADVANCE_DELAY_MS * 3);
    expect(stepHeading(1, 5)).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(stepHeading(2, 5)).toHaveFocus();
  });

  it('a different point is incorrect: says what was used, counts the attempt and stays on the step', async () => {
    const { user, storage } = await renderLessonPage('confirm_and_back');
    await startLesson(user);
    await squeeze(user);
    await tapPoint(user, INDEX_BASE);

    const onScreen = 'That was Dismiss / Back, on the index finger base. Try again: Confirm on the index fingertip.';
    // The announcement carries the spoken label, so a screen reader never reads "Dismiss slash Back".
    const announced = 'That was Dismiss or Back, on the index finger base. Try again: Confirm on the index fingertip.';
    expect(feedbackPanel()).toHaveTextContent('Not yet');
    expect(feedbackPanel()).toHaveTextContent(onScreen);
    expect(feedbackPanel()).toHaveTextContent('Attempts on this step: 1');
    expect(within(feedbackPanel()).queryByRole('button')).not.toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(announced));
    expect(runStatsText()).toBe('Attempts: 1 · Correct: 0 · Accuracy: 0%');
    expect(screen.getByRole('button', { name: 'Index finger base, Dismiss / Back, detected here' })).toBeInTheDocument();

    advance(ADVANCE_DELAY_MS * 2);
    expect(stepHeading(1, 5)).toBeInTheDocument();
    expect(savedTraining(storage).getLesson('confirm_and_back')).toMatchObject({ attempts: 1, correct: 0, status: 'in_progress' });
    expect(savedHistory(storage).list()[0]).toMatchObject({
      source: 'training',
      mode: 'lesson',
      lessonId: 'confirm_and_back',
      targetContact: 'index_tip',
      targetToken: 'confirm',
      detectedContact: 'index_base',
      token: 'back',
      outcome: 'mismatch',
      evidence: 'simulated',
      seeded: false,
    });
  });

  it('a press that is too long is incorrect, in the ring’s own words', async () => {
    const { user } = await renderLessonPage('confirm_and_back');
    await startLesson(user);
    await squeeze(user);
    screen.getByRole('button', { name: INDEX_TIP_TARGET }).focus();
    await user.keyboard('{Enter>}');
    advance(1200);
    await user.keyboard('{/Enter}');

    expect(feedbackPanel()).toHaveTextContent('Not yet');
    expect(feedbackPanel()).toHaveTextContent(/^.*Not recognised\. That press lasted 1\.\d seconds/);
    await waitFor(() => expect(assertiveRegion()).toHaveTextContent(/Not recognised\. That press lasted/));
  });

  it('completes every step: summary with accuracy (Simulated), progress saved and history recorded', async () => {
    const { user, storage } = await renderLessonPage('confirm_and_back');
    await startLesson(user);
    await squeeze(user);

    const targets = [
      'Index fingertip, Confirm, target',
      'Index finger base, Dismiss / Back, target',
      'Index fingertip, Confirm, target',
      'Index finger base, Dismiss / Back, target',
      'Index fingertip, Confirm, target',
    ];
    for (const [index, target] of targets.entries()) {
      if (index === 1) await tapPoint(user, 'Index fingertip, Confirm');
      await tapPoint(user, target);
      expect(feedbackPanel()).toHaveTextContent('Correct');
      if (index < targets.length - 1) {
        advance(ADVANCE_DELAY_MS);
        expect(stepHeading(index + 2, 5)).toHaveFocus();
      }
    }
    expect(within(feedbackPanel()).getByRole('button', { name: 'Finish lesson' })).toBeInTheDocument();
    advance(ADVANCE_DELAY_MS);

    const summaryHeading = screen.getByRole('heading', { level: 2, name: 'Lesson complete' });
    expect(summaryHeading).toHaveFocus();
    expect(screen.getByText('You found every point, with one retry on Dismiss or Back.')).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Lesson complete' });
    const terms = within(summary).getAllByRole('term').map((term) => term.textContent);
    expect(terms).toEqual(['Steps', 'Attempts', 'Correct', 'Accuracy', 'Best accuracy']);
    const values = within(summary).getAllByRole('definition');
    expect(values.map((value) => value.textContent)).toEqual(['5', '6', '5', '83%Simulated', '83%Simulated']);
    expect(within(summary).getByRole('link', { name: 'Next lesson: Next, Previous and Read' })).toHaveAttribute(
      'href',
      '/dashboard/train/next_previous_read',
    );
    expect(within(summary).getByRole('button', { name: 'Practise again' })).toBeInTheDocument();

    expect(savedTraining(storage).getLesson('confirm_and_back')).toMatchObject({
      status: 'complete',
      attempts: 6,
      correct: 5,
      runs: 1,
      bestAccuracy: 5 / 6,
      lastAccuracy: 5 / 6,
    });
    const events = savedHistory(storage).list();
    expect(events).toHaveLength(6);
    expect(events.every((event) => event.source === 'training' && event.mode === 'lesson' && event.lessonId === 'confirm_and_back')).toBe(
      true,
    );
    expect(events.filter((event) => event.outcome === 'mismatch')).toHaveLength(1);

    await user.click(within(summary).getByRole('button', { name: 'Practise again' }));
    expect(stepHeading(1, 5)).toHaveFocus();
    expect(runStatsText()).toMatch(/^Attempts: 0 · Correct: 0 · Accuracy: —/);

    // A replay keeps the lesson Completed, with its best accuracy, while it is under way and after leaving it.
    expect(savedTraining(storage).getLesson('confirm_and_back')).toMatchObject({ status: 'complete', bestAccuracy: 5 / 6, runs: 1 });
    expect(screen.getByText('Leaving keeps this lesson marked Completed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exit lesson' }));
    expect(screen.getByText('Train page stand-in')).toBeInTheDocument();
    expect(savedTraining(storage).getLesson('confirm_and_back')).toMatchObject({ status: 'complete', runs: 1 });
    expect(savedTraining(storage).summary()).toMatchObject({ lessonsCompleted: 1 });
  });

  it('restarts after confirming, and Exit lesson returns to Train with the lesson still in progress', async () => {
    const { user, storage } = await renderLessonPage('confirm_and_back');
    await startLesson(user);
    await squeeze(user);
    await tapPoint(user, INDEX_TIP_TARGET);
    advance(ADVANCE_DELAY_MS);
    expect(stepHeading(2, 5)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restart lesson' }));
    const dialog = screen.getByRole('dialog', { name: 'Restart this lesson?' });
    await user.click(within(dialog).getByRole('button', { name: 'Restart lesson' }));
    await waitFor(() => expect(stepHeading(1, 5)).toHaveFocus());
    expect(runStatsText()).toMatch(/^Attempts: 0 · Correct: 0 · Accuracy: —/);

    expect(screen.getByText('Leaving keeps this lesson marked In progress.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exit lesson' }));
    expect(screen.getByText('Train page stand-in')).toBeInTheDocument();
    expect(savedTraining(storage).getLesson('confirm_and_back')).toMatchObject({ status: 'in_progress', attempts: 1 });
  });

  it('lesson 5: releasing early passes the cancel step, and the full hold passes with the simulation notice', async () => {
    const { user, storage } = await renderLessonPage('emergency_hold');
    await startLesson(user);
    expect(stepHeading(1, 2)).toHaveTextContent('let go before five seconds to cancel');

    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(1000);
    await user.click(screen.getByRole('button', { name: 'Release pinky fingertip' }));
    expect(feedbackPanel()).toHaveTextContent('Correct');
    expect(feedbackPanel()).toHaveTextContent('Cancelled in time. Nothing was sent.');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Correct. Cancelled in time. Nothing was sent.'));
    expect(screen.queryByText(EMERGENCY_SIMULATION_NOTICE)).not.toBeInTheDocument();

    advance(ADVANCE_DELAY_MS);
    expect(stepHeading(2, 2)).toHaveFocus();
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(EMERGENCY_HOLD_MS + 100);

    expect(feedbackPanel()).toHaveTextContent('Correct');
    expect(feedbackPanel()).toHaveTextContent('The hold reached five seconds.');
    expect(screen.getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    await waitFor(() =>
      expect(assertiveRegion()).toHaveTextContent(`Correct. The hold reached five seconds. ${EMERGENCY_SIMULATION_NOTICE}`),
    );

    advance(ADVANCE_DELAY_MS);
    expect(screen.getByRole('heading', { level: 2, name: 'Lesson complete' })).toHaveFocus();
    expect(screen.getByText('You completed every hold step, with no retries.')).toBeInTheDocument();
    expect(screen.getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to all lessons' })).toHaveAttribute('href', '/dashboard/train');
    const events = savedHistory(storage).list();
    expect(events.map((event) => event.outcome)).toEqual(['emergency', 'emergency_cancelled']);
    expect(events.every((event) => event.targetToken === 'emergency' && event.targetContact === 'pinky_tip')).toBe(true);
  });

  it('lesson 5: a brief tap on the pinky fingertip is Shortcut 1, not the hold, and is recorded as a mismatch', async () => {
    const { user, storage } = await renderLessonPage('emergency_hold');
    await startLesson(user);
    await squeeze(user);
    await tapPoint(user, /^Pinky fingertip, Shortcut 1: Play or pause media/);

    expect(feedbackPanel()).toHaveTextContent('Not yet');
    expect(feedbackPanel()).toHaveTextContent('That was Shortcut 1: Play or pause media, on the pinky fingertip.');
    expect(screen.queryByText(EMERGENCY_SIMULATION_NOTICE)).not.toBeInTheDocument();
    advance(ADVANCE_DELAY_MS);
    expect(stepHeading(1, 2)).toBeInTheDocument();
    expect(savedTraining(storage).getLesson('emergency_hold')).toMatchObject({ attempts: 1, correct: 0 });
    const events = savedHistory(storage).list();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: 'training',
      mode: 'lesson',
      lessonId: 'emergency_hold',
      targetContact: 'pinky_tip',
      targetToken: 'emergency',
      detectedContact: 'pinky_tip',
      token: 'quick_action_1',
      outcome: 'mismatch',
      evidence: 'simulated',
    });
  });

  it('lesson 5: completing the hold on the cancel step is incorrect and shows the notice', async () => {
    const { user } = await renderLessonPage('emergency_hold');
    await startLesson(user);
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(EMERGENCY_HOLD_MS + 100);

    expect(feedbackPanel()).toHaveTextContent('Not yet');
    expect(feedbackPanel()).toHaveTextContent('The hold reached five seconds. This time, let go sooner.');
    expect(screen.getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    await waitFor(() => expect(assertiveRegion()).toHaveTextContent(EMERGENCY_SIMULATION_NOTICE));
    advance(ADVANCE_DELAY_MS);
    expect(stepHeading(1, 2)).toBeInTheDocument();
  });

  it('lesson 5: letting go early on the full-hold step says how long the hold lasted', async () => {
    const { user } = await renderLessonPage('emergency_hold');
    await startLesson(user);
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(500);
    await user.click(screen.getByRole('button', { name: 'Release pinky fingertip' }));
    advance(ADVANCE_DELAY_MS);
    await squeeze(user);
    await user.click(screen.getByRole('button', { name: 'Start five-second hold on pinky fingertip' }));
    advance(3100);
    await user.click(screen.getByRole('button', { name: 'Release pinky fingertip' }));
    expect(feedbackPanel()).toHaveTextContent('Not yet');
    expect(feedbackPanel()).toHaveTextContent(/You let go after 3\.\d seconds\. Hold for the full five seconds\./);
    advance(COMMAND_WINDOW_MS);
    expect(stepHeading(2, 2)).toBeInTheDocument();
  });

  it('shows a clear message and a way back for an unknown lesson', async () => {
    await renderLessonPage('not_a_lesson');
    expect(document.title).toBe('Lesson not found · Tactiq');
    expect(screen.getByRole('heading', { level: 1, name: 'Lesson not found' })).toBeInTheDocument();
    expect(screen.getByText(/There is no lesson at this address/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to all lessons' })).toHaveAttribute('href', '/dashboard/train');
    expect(screen.queryByRole('button', { name: 'Start lesson' })).not.toBeInTheDocument();
  });
});
