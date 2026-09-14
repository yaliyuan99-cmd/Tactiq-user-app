import { useState } from 'react';
import { Link, Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import { renderWithProviders, screen, userEvent, within } from '@/test/render';
import { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary';

function Broken(): JSX.Element {
  throw new Error('Lesson data could not be read');
}

function Toggle() {
  const [broken, setBroken] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setBroken(true)}>
        Break
      </button>
      {broken ? <Broken /> : <p>Working</p>}
    </>
  );
}

beforeEach(() => {
  // React logs caught render errors; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('ErrorBoundary', () => {
  it('renders the page fallback with a main landmark, actions and hidden details', async () => {
    renderWithProviders(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    const heading = screen.getByRole('heading', { level: 1, name: 'Something went wrong' });
    expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toBe(heading);
    expect(heading).toHaveFocus();
    expect(document.title).toBe('Something went wrong · Tactiq');
    expect(screen.getByRole('button', { name: 'Reload the app' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toHaveAttribute('href', ROUTES.dashboard);

    const details = screen.getByText('Technical details').closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    expect(within(details as HTMLElement).getByText('Lesson data could not be read')).toBeInTheDocument();
  });

  it('renders the section fallback without its own main landmark', () => {
    renderWithProviders(
      <main>
        <ErrorBoundary variant="section">
          <Broken />
        </ErrorBoundary>
      </main>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('reports the error to onError', () => {
    const onError = vi.fn();
    renderWithProviders(
      <ErrorBoundary onError={onError}>
        <Broken />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Lesson data could not be read' }), expect.anything());
  });

  it('recovers when the route changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RouteErrorBoundary variant="section">
        <Routes>
          <Route path="/broken" element={<Toggle />} />
          <Route path={ROUTES.dashboard} element={<p>Dashboard content</p>} />
        </Routes>
      </RouteErrorBoundary>,
      { route: '/broken' },
    );
    await user.click(screen.getByRole('button', { name: 'Break' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go to the dashboard' }));
    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument();
  });

  it('stays on the fallback when the new route also fails', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Link to="/b">Other page</Link>
        <RouteErrorBoundary variant="section">
          <Routes>
            <Route path="/a" element={<Broken />} />
            <Route path="/b" element={<Broken />} />
          </Routes>
        </RouteErrorBoundary>
      </>,
      { route: '/a' },
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Other page' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Lesson data could not be read')).toBeInTheDocument();
  });
});
