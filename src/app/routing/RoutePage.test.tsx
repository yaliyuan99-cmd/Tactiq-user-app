import { lazy } from 'react';
import { renderApp, screen } from '@/test/renderApp';
import { RoutePage } from './RoutePage';

/** A lazy page whose chunk never arrives, so the Suspense fallback stays on screen. */
const NeverLoads = lazy(() => new Promise<{ default: () => JSX.Element }>(() => undefined));

describe('RoutePage', () => {
  it('shows the loading status without a landmark inside a layout', async () => {
    renderApp(<RoutePage page={NeverLoads} />);
    const loading = await screen.findByText('Loading…');
    expect(loading.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('wraps the loading status in its own main landmark for a standalone page', async () => {
    renderApp(<RoutePage page={NeverLoads} standalone />);
    const loading = await screen.findByText('Loading…');
    expect(loading.closest('[role="status"]')).not.toBeNull();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toContainElement(loading);
  });
});
