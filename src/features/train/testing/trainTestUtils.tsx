/** Helpers shared by the Train tests: rendering, driving the simulated ring and reading what was saved. */
import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import { GATE_HOLD_MS } from '@/domain/timing';
import { settleProviders } from '@/features/practice/testing/practiceTestUtils';
import { LocalHistoryService } from '@/services/history/LocalHistoryService';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import { LocalTrainingService } from '@/services/training/LocalTrainingService';
import { act, renderApp, screen, userEvent, within, type RenderAppOptions } from '@/test/renderApp';
import LessonPage from '../LessonPage';

export type User = ReturnType<typeof userEvent.setup>;

export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export async function renderWithUser(ui: ReactElement, options: RenderAppOptions = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = renderApp(ui, options);
  await settleProviders();
  return { user, ...view };
}

/** The lesson route, with a stand-in Train page so leaving a lesson can be observed. */
export function renderLessonPage(lessonId: string, options: RenderAppOptions = {}) {
  return renderWithUser(
    <Routes>
      <Route path={ROUTES.train} element={<p>Train page stand-in</p>} />
      <Route path={`${ROUTES.train}/:lessonId`} element={<LessonPage />} />
    </Routes>,
    { route: `${ROUTES.train}/${lessonId}`, ...options },
  );
}

export async function squeeze(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
  advance(GATE_HOLD_MS);
}

/** A brief tap on a contact point, from the keyboard. */
export async function tapPoint(user: User, name: string | RegExp): Promise<void> {
  screen.getByRole('button', { name }).focus();
  await user.keyboard('{Enter}');
}

export function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

export function assertiveRegion(): HTMLElement {
  return screen.getByTestId('live-region-assertive');
}

/** The visible result panel for the current step. */
export function feedbackPanel(): HTMLElement {
  const panel = document.querySelector<HTMLElement>('[data-outcome]');
  if (!panel) throw new Error('No feedback panel');
  return panel;
}

/** The run's "Attempts: … · Correct: … · Accuracy: …" line, as one string. */
export function runStatsText(): string {
  const line = screen.getByText((_, element) => element?.tagName === 'SPAN' && /^Attempts: \d+ · Correct: /.test(element.textContent ?? ''));
  return line.textContent ?? '';
}

export function stepHeading(position: number, total: number): HTMLElement {
  return screen.getByRole('heading', { level: 2, name: new RegExp(`^Step ${position} of ${total}: `) });
}

export function savedTraining(storage: StorageAdapter): LocalTrainingService {
  return new LocalTrainingService(storage);
}

export function savedHistory(storage: StorageAdapter): LocalHistoryService {
  return new LocalHistoryService(storage);
}

export { within };
