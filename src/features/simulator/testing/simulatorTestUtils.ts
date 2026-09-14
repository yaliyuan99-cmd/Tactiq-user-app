/** Helpers for the Simulator page tests. Not used by the running app. */
import { Fragment, createElement } from 'react';
import { ROUTES } from '@/app/routes';
import { GATE_HOLD_MS } from '@/domain/timing';
import type { GestureEvent } from '@/domain/models';
import { settleProviders } from '@/features/practice/testing/practiceTestUtils';
import { LocalHistoryService } from '@/services/history/LocalHistoryService';
import { act, renderApp, screen, userEvent, type RenderAppOptions } from '@/test/renderApp';
import SimulatorPage, { type SimulatorPageProps } from '../SimulatorPage';
import { LocationProbe } from './LocationProbe';

export type TestUser = ReturnType<typeof userEvent.setup>;

/** Always picks the first candidate: Confirm first, then Dismiss / Back, and so on. */
export const FIRST_CANDIDATE = () => 0;

export async function renderSimulator(props: SimulatorPageProps = { random: FIRST_CANDIDATE }, options: RenderAppOptions = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = renderApp(
    createElement(Fragment, null, createElement(SimulatorPage, props), createElement(LocationProbe)),
    { route: ROUTES.simulator, ...options, preferences: { audioAnnouncements: true, ...options.preferences } },
  );
  await settleProviders();
  const history = (): GestureEvent[] => new LocalHistoryService(view.storage).list();
  return { user, history, ...view };
}

export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Presses "Squeeze the ring" and waits for the gate, so the command window is open. */
export async function squeeze(user: TestUser): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Squeeze the ring' }));
  advance(GATE_HOLD_MS);
}

export function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

export function assertiveRegion(): HTMLElement {
  return screen.getByTestId('live-region-assertive');
}

export function locationSearch(): string {
  return screen.getByTestId('location-search').textContent ?? '';
}

/** Presses Tab until `target` has focus, failing after a sensible number of stops. */
export async function tabTo(user: TestUser, target: HTMLElement, maxStops = 40): Promise<void> {
  for (let stop = 0; stop < maxStops && document.activeElement !== target; stop += 1) {
    await user.tab();
  }
  expect(target).toHaveFocus();
}
