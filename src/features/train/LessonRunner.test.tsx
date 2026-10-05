import { COMMAND_WINDOW_MS } from '@/domain/timing';
import { FakeHardwareRing } from '@/features/practice/testing/practiceTestUtils';
import { act, screen, waitFor } from '@/test/renderApp';
import { ADVANCE_DELAY_MS } from './lessonLogic';
import { LessonRunner } from './LessonRunner';
import {
  advance,
  feedbackPanel,
  politeRegion,
  renderWithUser,
  savedHistory,
  squeeze,
  within,
  type User,
} from './testing/trainTestUtils';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function stepHeading(position: number): HTMLElement {
  return screen.getByRole('heading', { level: 3, name: new RegExp(`^Step ${position} of 3: `) });
}

async function squeezeAndLetClose(user: User) {
  await squeeze(user);
  expect(feedbackPanel()).toHaveTextContent('Correct');
  advance(COMMAND_WINDOW_MS);
  advance(ADVANCE_DELAY_MS);
}

describe('LessonRunner', () => {
  it('states the window without linking to Settings when embedded, because Settings is behind the setup gate', async () => {
    await renderWithUser(<LessonRunner lessonId="squeeze_to_activate" embedded />);

    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument();
    // The information is still there, just not as a way out of the step.
    expect(screen.getByText(/Each squeeze opens the command window for 3 seconds\./)).toBeInTheDocument();
    expect(screen.getByText(/Longer interaction time, in Settings, gives 6 seconds\./)).toBeInTheDocument();
  });

  it('links to Settings on its own page, where following the link is not a dead end', async () => {
    await renderWithUser(<LessonRunner lessonId="squeeze_to_activate" />);

    expect(screen.getByRole('link', { name: 'Turn on Longer interaction time in Settings' })).toHaveAttribute(
      'href',
      '/dashboard/settings',
    );
  });

  it('uses the given heading levels, practises the squeeze with no map, and calls onComplete once', async () => {
    const onComplete = vi.fn();
    const { user, storage } = await renderWithUser(<LessonRunner lessonId="squeeze_to_activate" embedded onComplete={onComplete} />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Lesson 1: Squeeze to activate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'How this lesson works' })).toBeInTheDocument();
    expect(screen.getByText('Opening the command window with a squeeze')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exit lesson' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start lesson' }));
    expect(stepHeading(1)).toHaveFocus();
    expect(screen.getByText('No tapping needed yet.')).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'List view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exit lesson' })).not.toBeInTheDocument();

    await squeeze(user);
    expect(feedbackPanel()).toHaveTextContent('Command window open for 3 seconds.');
    expect(feedbackPanel()).toHaveTextContent('The next step starts when the command window closes, or choose Next step now.');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Correct. Command window open for 3 seconds.'));
    // The step waits for the window to close on its own before moving on.
    advance(ADVANCE_DELAY_MS * 2);
    expect(stepHeading(1)).toBeInTheDocument();
    advance(COMMAND_WINDOW_MS);
    advance(ADVANCE_DELAY_MS);
    expect(stepHeading(2)).toHaveFocus();

    await squeezeAndLetClose(user);
    expect(stepHeading(3)).toHaveFocus();
    await squeeze(user);
    expect(within(feedbackPanel()).getByRole('button', { name: 'Finish lesson' })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    advance(COMMAND_WINDOW_MS);
    advance(ADVANCE_DELAY_MS);

    expect(screen.getByRole('heading', { level: 3, name: 'Lesson complete' })).toHaveFocus();
    expect(screen.getByText('You opened the command window at every step, with no retries.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Next lesson/ })).not.toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ lessonId: 'squeeze_to_activate', attempts: 3, correct: 3, accuracy: 1 });

    const events = savedHistory(storage).list();
    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event).toMatchObject({
        source: 'training',
        mode: 'lesson',
        lessonId: 'squeeze_to_activate',
        token: null,
        targetContact: null,
        detectedContact: null,
        durationMs: null,
        outcome: 'recognised',
        evidence: 'simulated',
      });
    }
  });

  it('Next step during an open window moves on and closes the window, so the next squeeze counts', async () => {
    const { user } = await renderWithUser(<LessonRunner lessonId="squeeze_to_activate" embedded headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Lesson 1: Squeeze to activate' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start lesson' }));
    const heading = screen.getByRole('heading', { level: 4, name: /^Step 1 of 3: / });
    expect(heading).toHaveFocus();

    await squeeze(user);
    await user.click(within(feedbackPanel()).getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('heading', { level: 4, name: /^Step 2 of 3: / })).toHaveFocus();
    expect(screen.getByText('Command window closed. Squeeze to open it.')).toBeInTheDocument();

    await squeeze(user);
    expect(feedbackPanel()).toHaveTextContent('Correct');
  });

  it('offers the lesson links and Exit lesson on a page', async () => {
    const onExit = vi.fn();
    const { user } = await renderWithUser(<LessonRunner lessonId="confirm_and_back" onExit={onExit} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lesson 2: Confirm and Back' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start lesson' }));
    await user.click(screen.getByRole('button', { name: 'Exit lesson' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('works with a connected hardware ring: its events are judged and recorded as measured', async () => {
    const ring = new FakeHardwareRing();
    const { user, storage } = await renderWithUser(<LessonRunner lessonId="confirm_and_back" />, { deviceAdapter: ring });
    await user.click(screen.getByRole('button', { name: 'Start lesson' }));
    expect(screen.queryByRole('button', { name: 'Squeeze the ring' })).not.toBeInTheDocument();

    act(() => {
      ring.send({ type: 'gate', armed: true, closesAt: Date.now() + COMMAND_WINDOW_MS });
      ring.send({ type: 'token', token: 'back', contact: 'index_base', durationMs: 140 });
    });
    expect(feedbackPanel()).toHaveTextContent('That was Dismiss / Back, on the index finger base.');

    act(() => {
      ring.send({ type: 'token', token: 'confirm', contact: 'index_tip', durationMs: 150 });
    });
    expect(feedbackPanel()).toHaveTextContent('Correct');
    expect(savedHistory(storage).list().map((event) => event.evidence)).toEqual(['measured', 'measured']);
  });
});
