import type { LessonId } from '@/domain/lessons';
import type { LessonProgress, TrainingProgress } from '@/domain/models';
import { emptyTrainingProgress } from '@/services/training/trainingRules';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { screen, waitFor, within } from '@/test/renderApp';
import { RESET_ANNOUNCEMENT } from './ResetTrainingSection';
import { politeRegion, renderWithUser } from './testing/trainTestUtils';
import TrainPage, { TRAIN_LEDE } from './TrainPage';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function progressWith(changes: Partial<Record<LessonId, Partial<LessonProgress>>>): TrainingProgress {
  const base = emptyTrainingProgress();
  const lessons = { ...base.lessons };
  for (const [id, change] of Object.entries(changes) as Array<[LessonId, Partial<LessonProgress>]>) {
    lessons[id] = { ...lessons[id], ...change };
  }
  return { version: 1, lessons };
}

async function renderTrain(progress?: TrainingProgress) {
  const storage = new MemoryStorageAdapter();
  if (progress) storage.set(STORAGE_KEYS.training, progress);
  return renderWithUser(<TrainPage />, { route: '/dashboard/train', storage });
}

function lessonItems(): HTMLElement[] {
  const section = screen.getByRole('region', { name: 'Lessons' });
  return within(within(section).getByRole('list')).getAllByRole('listitem');
}

describe('TrainPage', () => {
  it('lists the five lessons in order, all not started, with lesson 1 recommended', async () => {
    await renderTrain();
    expect(document.title).toBe('Train · Tactiq');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Train' })).toBeInTheDocument();
    expect(screen.getByText(TRAIN_LEDE)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Your progress', 'Lessons', 'Start over']);

    const bar = screen.getByRole('progressbar', { name: 'Lessons completed' });
    expect(bar).toHaveAttribute('aria-valuetext', '0 of 5');

    const items = lessonItems();
    expect(items).toHaveLength(5);
    expect(items.map((item) => within(item).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Lesson 1: Squeeze to activate',
      'Lesson 2: Confirm and Back',
      'Lesson 3: Next, Previous and Read',
      'Lesson 4: Undo and personal shortcuts',
      'Lesson 5: Five-second emergency hold',
    ]);
    for (const item of items) expect(item).toHaveTextContent('Not started');
    const [first, second] = items as [HTMLElement, HTMLElement];
    expect(within(first).getByText('Recommended')).toBeInTheDocument();
    expect(within(second).queryByText('Recommended')).not.toBeInTheDocument();
    expect(screen.getAllByText('Recommended')).toHaveLength(1);
    expect(within(first).getByRole('link', { name: 'Start lesson 1: Squeeze to activate' })).toHaveAttribute(
      'href',
      '/dashboard/train/squeeze_to_activate',
    );
    expect(within(first).queryByText(/Best:/)).not.toBeInTheDocument();

    const overview = screen.getByRole('region', { name: 'Your progress' });
    expect(within(overview).getByRole('link', { name: 'Start lesson 1' })).toHaveAttribute('href', '/dashboard/train/squeeze_to_activate');
    expect(within(overview).getByText('Simulated')).toBeInTheDocument();
  });

  it('shows statuses in words, best accuracy (Simulated) and the right action for each lesson', async () => {
    await renderTrain(
      progressWith({
        squeeze_to_activate: { status: 'complete', attempts: 4, correct: 3, bestAccuracy: 0.92, lastAccuracy: 0.75, runs: 1 },
        confirm_and_back: { status: 'in_progress', attempts: 2, correct: 2 },
      }),
    );
    const [first, second, third] = lessonItems() as [HTMLElement, HTMLElement, HTMLElement];

    expect(first).toHaveTextContent('Completed');
    expect(first).toHaveTextContent('Best: 92%');
    expect(within(first).getByText('Simulated')).toBeInTheDocument();
    expect(within(first).getByRole('link', { name: 'Practise again lesson 1: Squeeze to activate' })).toBeInTheDocument();

    expect(second).toHaveTextContent('In progress');
    expect(within(second).getByText('Recommended')).toBeInTheDocument();
    expect(within(second).getByRole('link', { name: 'Continue lesson 2: Confirm and Back' })).toHaveAttribute(
      'href',
      '/dashboard/train/confirm_and_back',
    );

    expect(third).toHaveTextContent('Not started');
    expect(within(third).getByRole('link', { name: 'Start lesson 3: Next, Previous and Read' })).toBeInTheDocument();

    const overview = screen.getByRole('region', { name: 'Your progress' });
    expect(within(overview).getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuetext', '1 of 5');
    expect(within(overview).getByText('Attempts').nextElementSibling).toHaveTextContent('6');
    expect(within(overview).getByText('Accuracy').nextElementSibling).toHaveTextContent('83%');
    expect(within(overview).getByRole('link', { name: 'Continue lesson 2' })).toBeInTheDocument();
  });

  it('says when every lesson is complete, with no recommendation', async () => {
    const all = progressWith({
      squeeze_to_activate: { status: 'complete', bestAccuracy: 1 },
      confirm_and_back: { status: 'complete', bestAccuracy: 1 },
      next_previous_read: { status: 'complete', bestAccuracy: 1 },
      undo_and_shortcuts: { status: 'complete', bestAccuracy: 1 },
      emergency_hold: { status: 'complete', bestAccuracy: 1 },
    });
    await renderTrain(all);
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    expect(screen.getByText(/You have completed all five lessons/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Simulator' })).toHaveAttribute('href', '/dashboard/simulator');
  });

  it('resets all training progress after confirmation', async () => {
    const { user, storage } = await renderTrain(progressWith({ squeeze_to_activate: { status: 'complete', bestAccuracy: 1 } }));
    expect(lessonItems()[0]).toHaveTextContent('Completed');

    await user.click(screen.getByRole('button', { name: 'Reset all training progress' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset all training progress?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(lessonItems()[0]).toHaveTextContent('Completed');

    await user.click(screen.getByRole('button', { name: 'Reset all training progress' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset progress' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    for (const item of lessonItems()) expect(item).toHaveTextContent('Not started');
    expect(storage.get(STORAGE_KEYS.training)).toBeNull();
    await waitFor(() => expect(politeRegion()).toHaveTextContent(RESET_ANNOUNCEMENT));
    expect(screen.getByRole('button', { name: 'Reset all training progress' })).toHaveFocus();
  });
});
