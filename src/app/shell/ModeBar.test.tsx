/**
 * The mode bar is the app's one statement about what is real. A verifier found
 * the same "this is simulated" assurance on every page and inside most cards,
 * which a screen reader user heard over and over; these tests hold the line
 * that it is said once, in the shell, and survives navigation.
 */
import '@/app/testing/mockPages';
import { screen, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { renderRoutes } from '@/app/testing/renderRoutes';
import { modeSentence } from './modeNote';

const SIMULATED = modeSentence('account', 'demo');

describe('ModeBar', () => {
  it('names the mode once, in a pill that opens the connection screen', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const pill = screen.getByRole('link', { name: 'Device: Demo Mode. Open connection settings' });
    expect(pill).toHaveAttribute('href', ROUTES.connect);
    expect(pill).toHaveTextContent('Demo Mode');
    expect(screen.getAllByText(SIMULATED)).toHaveLength(1);
  });

  it('is stated once for the whole app, not once per page', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await user.click(within(screen.getByTestId('mobile-nav')).getByRole('link', { name: 'Activity' }));
    await screen.findByRole('heading', { level: 1, name: 'History' });
    expect(screen.getAllByText(SIMULATED)).toHaveLength(1);
  });

  it('is not a live region, so it is never read out again on its own', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const sentence = screen.getByText(SIMULATED);
    expect(sentence.closest('[aria-live]')).toBeNull();
    expect(sentence.closest('[role="status"]')).toBeNull();
    expect(sentence.closest('[role="alert"]')).toBeNull();
  });

  it('says what a hardware choice means instead, with no invented reading', async () => {
    renderRoutes({ route: ROUTES.dashboard, deviceMode: 'hardware' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByText(SIMULATED)).not.toBeInTheDocument();
    expect(screen.getByText(modeSentence('account', 'disconnected'))).toBeInTheDocument();
    const pill = screen.getByRole('link', { name: /^Device: .+\. Open connection settings$/ });
    expect(pill).not.toHaveTextContent('Demo Mode');
    expect(pill).not.toHaveTextContent(/\d/);
  });

  it('precedes the page content inside main, after the navigation', async () => {
    renderRoutes({ route: ROUTES.dashboard });
    const heading = await screen.findByRole('heading', { level: 1, name: 'Home' });
    const main = screen.getByRole('main');
    const sentence = screen.getByText(SIMULATED);
    expect(main).toContainElement(sentence);
    expect(sentence.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
