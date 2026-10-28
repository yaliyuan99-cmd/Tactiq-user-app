import '@/app/testing/mockPages';
import { screen, waitFor, within } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import { currentLocation, renderRoutes } from '@/app/testing/renderRoutes';

describe('MoreMenu', () => {
  it('holds everything the five-destination bottom bar cannot, grouped as the sidebar is', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.click(screen.getByRole('button', { name: 'More' }));
    const dialog = await screen.findByRole('dialog', { name: 'More' });
    expect(within(dialog).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      ROUTES.train,
      ROUTES.simulator,
      ROUTES.commands,
      ROUTES.connect,
      ROUTES.calibrate,
      ROUTES.help,
    ]);
    expect(within(within(dialog).getByRole('list', { name: 'Practice' })).getAllByRole('link')).toHaveLength(3);
    expect(within(within(dialog).getByRole('list', { name: 'Device' })).getAllByRole('link')).toHaveLength(2);
    expect(within(dialog).getByRole('link', { name: 'Calibrate' })).toHaveAccessibleDescription(
      'Guided taps on each contact point',
    );
    expect(within(dialog).getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('navigates from the menu and closes it', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await user.click(screen.getByRole('button', { name: 'More' }));
    const dialog = await screen.findByRole('dialog', { name: 'More' });

    await user.click(within(dialog).getByRole('link', { name: 'Calibrate' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Calibrate' })).toBeInTheDocument();
    expect(currentLocation()).toBe(ROUTES.calibrate);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the keyboard, traps focus and gives it back on Escape', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const more = screen.getByRole('button', { name: 'More' });
    expect(more).toHaveAttribute('aria-haspopup', 'dialog');
    expect(more).toHaveAttribute('aria-expanded', 'false');

    more.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'More' });
    expect(more).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'More' })).toHaveFocus();
  });

  it('reaches every destination with Tab alone', async () => {
    const { user } = renderRoutes({ route: ROUTES.dashboard });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await user.click(screen.getByRole('button', { name: 'More' }));
    const dialog = await screen.findByRole('dialog', { name: 'More' });

    const reached = new Set<string>();
    for (let presses = 0; presses < 30; presses += 1) {
      const active = document.activeElement;
      if (active instanceof HTMLAnchorElement && dialog.contains(active)) reached.add(active.textContent ?? '');
      await user.tab();
    }
    expect([...reached].some((text) => text.startsWith('Train'))).toBe(true);
    expect([...reached].some((text) => text.startsWith('Help'))).toBe(true);
  });
});
