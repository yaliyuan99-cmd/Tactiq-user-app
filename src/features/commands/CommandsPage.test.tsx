import { SHORTCUT_ACTIONS } from '@/domain/commands';
import { FakeRingAdapter } from '@/features/settings/testing/FakeRingAdapter';
import { act, renderApp, screen, userEvent, within } from '@/test/renderApp';
import CommandsPage from './CommandsPage';

/** Renders the page and lets the provider stack finish restoring the session. */
async function renderPage(options: Parameters<typeof renderApp>[1] = {}) {
  const result = renderApp(<CommandsPage />, { route: '/dashboard/commands', ...options });
  await act(async () => {});
  return result;
}

function commandTable(): HTMLElement {
  return screen.getByRole('table', { name: 'Command map' });
}

function bodyRows(table: HTMLElement): HTMLElement[] {
  return within(table).getAllByRole('row').slice(1);
}

describe('CommandsPage', () => {
  it('has one h1, the page title, the lede and the three sections in order', async () => {
    await renderPage();
    expect(document.title).toBe('Commands and shortcuts · Tactiq');
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Commands and shortcuts');
    expect(
      screen.getByText('Eight contact points carry nine commands. Seven are fixed. You can choose what Shortcut 1 and Shortcut 2 do.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Where each command lives',
      'All nine commands',
      'Your shortcuts',
    ]);
    expect(screen.getByRole('region', { name: 'All nine commands' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your shortcuts' })).toBeInTheDocument();
  });

  it('draws a non-interactive map for the chosen hand, labelled with commands and saved shortcuts', async () => {
    await renderPage({ preferences: { hand: 'left' } });
    const map = screen.getByRole('region', { name: 'Where each command lives' });
    const figure = within(map).getByRole('figure', { name: /^Left hand, palm facing you\./ });
    expect(figure).toHaveAttribute('data-hand', 'left');
    expect(within(figure).queryAllByRole('button')).toHaveLength(0);
    expect(within(figure).getByText('Pinky fingertip: Shortcut 1: Play or pause media; hold 5 seconds for Emergency')).toBeInTheDocument();
    expect(within(figure).getByText('Index fingertip: Confirm')).toBeInTheDocument();
    expect(within(figure).getByText('Dashed ring: hold five seconds for Emergency')).toBeInTheDocument();
    expect(within(map).getByRole('link', { name: 'Change hand in Settings' })).toHaveAttribute('href', '/dashboard/settings');
  });

  it('lists all nine commands with Fixed, Customisable and locked Emergency status', async () => {
    await renderPage();
    const table = commandTable();
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Contact point',
      'Touch',
      'Command',
      'What it does',
      'Status',
    ]);
    const rows = bodyRows(table);
    expect(rows).toHaveLength(9);

    const byCommand = (name: string) => {
      const row = rows.find((r) => within(r).getByRole('rowheader').textContent?.includes(name));
      if (!row) throw new Error(`No row for ${name}`);
      return row;
    };
    const confirm = byCommand('Confirm');
    expect(confirm).toHaveTextContent('Index fingertip');
    expect(confirm).toHaveTextContent('Brief tap');
    expect(within(confirm).getAllByRole('cell').at(-1)).toHaveTextContent(/^(Status)?Fixed$/);

    const shortcut1 = byCommand('Shortcut 1');
    expect(within(shortcut1).getByRole('rowheader')).toHaveTextContent('Shortcut 1Play or pause media');
    expect(within(shortcut1).getAllByRole('cell').at(-1)).toHaveTextContent(/^(Status)?Customisable$/);

    const emergency = byCommand('Emergency');
    expect(emergency).toHaveTextContent('Pinky fingertip');
    expect(emergency).toHaveTextContent('Hold 5 seconds');
    expect(within(emergency).getAllByRole('cell').at(-1)).toHaveTextContent('Fixed — cannot be changed');

    expect(within(table).getAllByText(/^Fixed$/)).toHaveLength(6);
    expect(within(table).getAllByText('Customisable')).toHaveLength(2);
  });

  it('explains the command window and how to lengthen it', async () => {
    await renderPage({ preferences: { longerInteractionTime: true } });
    const section = screen.getByRole('region', { name: 'All nine commands' });
    expect(section).toHaveTextContent('Your window is 6 s because Longer interaction time is on.');
    expect(within(section).getByRole('link', { name: 'Change it in Settings' })).toHaveAttribute('href', '/dashboard/settings');
  });

  it('shows how each command would confirm, with design-intent haptics and unguaranteed routes', async () => {
    const user = userEvent.setup();
    await renderPage();
    expect(screen.getByRole('heading', { level: 3, name: 'How you would know it worked' })).toBeInTheDocument();
    const summaries = document.querySelectorAll('details > summary');
    expect(summaries).toHaveLength(9);

    const undo = document.querySelector<HTMLDetailsElement>('details[data-command="undo"]');
    if (!undo) throw new Error('missing undo details');
    const undoSummary = undo.querySelector('summary');
    if (!undoSummary) throw new Error('missing undo summary');
    await user.click(undoSummary);
    expect(undo.open).toBe(true);
    expect(undo).toHaveTextContent('Design intent');
    expect(undo).toHaveTextContent('One firm click');
    expect(undo).toHaveTextContent('App-dependent; not guaranteed');
    expect(within(undo).getByText('Not guaranteed on every phone')).toBeInTheDocument();

    const confirm = document.querySelector('details[data-command="confirm"]');
    expect(confirm).toHaveTextContent('Screen-reader activate');
    expect(confirm).not.toHaveTextContent('Not guaranteed on every phone');

    const emergency = document.querySelector('details[data-command="emergency"]');
    expect(emergency).toHaveTextContent('Platform SOS pathway; not guaranteed');
    expect(emergency).toHaveTextContent('never contacts emergency services');
  });

  it('offers exactly two shortcut editors and nothing that edits a fixed command or Emergency', async () => {
    await renderPage();
    const editor = screen.getByRole('region', { name: 'Your shortcuts' });
    const shortcut1 = within(editor).getByRole('group', { name: 'Shortcut 1 — pinky fingertip, brief tap' });
    const shortcut2 = within(editor).getByRole('group', { name: 'Shortcut 2 — pinky finger base' });
    expect(within(shortcut1).getAllByRole('radio')).toHaveLength(SHORTCUT_ACTIONS.length);
    expect(within(shortcut2).getAllByRole('radio')).toHaveLength(SHORTCUT_ACTIONS.length);

    expect(document.querySelectorAll('fieldset')).toHaveLength(2);
    expect(screen.getAllByRole('radio')).toHaveLength(SHORTCUT_ACTIONS.length * 2);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('group', { name: /confirm|emergency|back|undo|next|read|previous/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /edit|remap|change (confirm|emergency)/i })).toBeNull();

    SHORTCUT_ACTIONS.forEach((action) => {
      expect(within(shortcut1).getByRole('radio', { name: action.label })).toHaveAccessibleDescription(action.description);
    });
  });

  it('carries the Emergency reminder and the simulator-only note with its evidence label', async () => {
    await renderPage();
    const editor = screen.getByRole('region', { name: 'Your shortcuts' });
    expect(
      within(editor).getByText(
        'Emergency is a five-second hold on the pinky fingertip and can never be changed. A brief tap on the same point is Shortcut 1.',
      ),
    ).toBeInTheDocument();
    const note = within(editor).getByText(
      'In this app, shortcuts run in the simulator only. On a phone they would depend on platform automation, which the research does not promise.',
    );
    expect(note.parentElement?.querySelector('[data-evidence="design_intent"]')).toHaveTextContent('Design intent');
  });

  it('moves focus to the editor from the saved shortcuts panel', async () => {
    const user = userEvent.setup();
    await renderPage();
    const panel = screen.getByRole('heading', { level: 3, name: 'Your saved shortcuts' }).closest('div');
    expect(panel).not.toBeNull();
    expect(screen.getByText('These are the defaults. You have not changed them yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change shortcuts' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Your shortcuts' })).toHaveFocus();
  });
  it('states the window the app is actually using, not the preference, with a ring connected', async () => {
    // Longer interaction time is on, but a connected bench ring keeps its
    // firmware's 3 s window — a user who trusted "6 s" would miss the window.
    await renderPage({
      preferences: { longerInteractionTime: true },
      deviceMode: 'hardware',
      deviceAdapter: new FakeRingAdapter({ status: 'connected' }),
    });
    const section = screen.getByRole('region', { name: 'All nine commands' });
    expect(section).toHaveTextContent('Your bench ring’s window is 3 s, fixed by its firmware.');
    expect(section).toHaveTextContent('Longer interaction time only changes the simulated ring in Demo Mode.');
    expect(section).not.toHaveTextContent('Your window is 6 s');
    expect(section).not.toHaveTextContent('Switch on Longer interaction time');
  });

  it('offers the six-second tip only in Demo Mode', async () => {
    await renderPage({ preferences: { longerInteractionTime: false } });
    const section = screen.getByRole('region', { name: 'All nine commands' });
    expect(section).toHaveTextContent('Your window is 3 s. Switch on Longer interaction time for 6 s.');
  });
});
