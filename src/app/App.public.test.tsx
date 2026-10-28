/**
 * `/` with the real public homepage inside the real route table.
 *
 * App.test.tsx stubs every feature page, so there it can only be shown that
 * the route opens the public page and wraps it in nothing. The frame and the
 * way in belong to the page itself — it draws its own skip link, banner, main
 * landmark and footer — so those claims are made here, against the page.
 *
 * Nothing is stubbed on purpose: only the matched route's chunk is loaded, and
 * for "/" that is the home page.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { banners, banner } from '@/app/testing/landmarks';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';
import { PAGE_TITLE_ID } from '@/components';

/** The status the page shows while the chunk below the hero is still loading. */
const BODY_LOADING = 'Loading the rest of this page…';

/** Opens "/" and waits for the hero and the lazily loaded rest of the page. */
async function renderHome({ signedIn = false }: { readonly signedIn?: boolean } = {}) {
  const result = renderRoutes({ route: ROUTES.root, signedIn });
  const heading = await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(screen.queryByText(BODY_LOADING)).not.toBeInTheDocument());
  return { ...result, heading };
}

describe('the real public page at /', () => {
  it('offers a signed-out visitor the way in', async () => {
    await renderHome();
    expect(currentLocation()).toBe(ROUTES.root);
    const header = within(banner());
    expect(header.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', ROUTES.signIn);
    expect(header.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', ROUTES.signUp);
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('offers a way to try the app without an account, where the words match the link', async () => {
    // This replaces the banner's old "Demonstration" link to /demo: the
    // invitation now sits in the hero and goes to sign-in, where "Continue as a
    // guest" opens a guest profile in this browser. What the page claims and
    // where the link goes have to keep agreeing, which is what is checked here.
    await renderHome();
    const invitations = screen.getAllByRole('link', { name: 'Try the demo' });
    expect(invitations.length).toBeGreaterThan(0);
    for (const invitation of invitations) expect(invitation).toHaveAttribute('href', ROUTES.signIn);
    expect(screen.getByText(/No email address and no account needed/)).toBeInTheDocument();
  });

  it('offers a signed-in user the way to their dashboard instead of redirecting them', async () => {
    await renderHome({ signedIn: true });
    expect(currentLocation()).toBe(ROUTES.root);
    const header = within(banner());
    expect(header.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', ROUTES.dashboard);
    expect(header.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('has one banner, one main landmark, one skip link and one h1', async () => {
    const { heading } = await renderHome();
    expect(banners()).toHaveLength(1);

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute('id', 'main-content');

    const skipLinks = screen.getAllByRole('link', { name: 'Skip to main content' });
    expect(skipLinks).toHaveLength(1);
    expect(skipLinks[0]).toHaveAttribute('href', '#main-content');
    expect(document.querySelectorAll('#main-content')).toHaveLength(1);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(heading).toHaveAttribute('id', PAGE_TITLE_ID);
    expect(within(mains[0] as HTMLElement).getByRole('heading', { level: 1 })).toBe(heading);
    expect(document.title).toBe('Tactiq');
  });

  it('moves focus to the page heading from the skip link', async () => {
    const { user } = await renderHome();
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
