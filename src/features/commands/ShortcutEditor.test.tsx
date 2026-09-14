import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { act, renderApp, screen, userEvent, waitFor, within } from '@/test/renderApp';
import CommandsPage from './CommandsPage';
import { NOT_PERSISTED_NOTE } from './ShortcutResult';

/** Renders the page and lets the provider stack finish restoring the session. */
async function renderPage(storage = new MemoryStorageAdapter()) {
  const result = renderApp(<CommandsPage />, { route: '/dashboard/commands', storage });
  await act(async () => {});
  return result;
}

const group1 = () => screen.getByRole('group', { name: 'Shortcut 1 — pinky fingertip, brief tap' });
const group2 = () => screen.getByRole('group', { name: 'Shortcut 2 — pinky finger base' });
const preview = () => screen.getByTestId('shortcut-preview');
const saveButton = () => screen.getByRole('button', { name: 'Save shortcuts' });
const politeRegion = () => screen.getByTestId('live-region-polite');

describe('Shortcut editor', () => {
  it('starts with the saved choices, no changes and Save unavailable', async () => {
    await renderPage();
    expect(within(group1()).getByRole('radio', { name: 'Play or pause media' })).toBeChecked();
    expect(within(group2()).getByRole('radio', { name: 'Announce the time' })).toBeChecked();
    expect(within(preview()).getByText('No changes yet.')).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
    expect(saveButton()).toHaveAccessibleDescription('No changes yet.');
    expect(screen.queryByRole('button', { name: 'Discard changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore defaults' })).toBeNull();
    expect(screen.getByText('Both shortcuts use the defaults.')).toBeInTheDocument();
    expect(preview()).not.toHaveAttribute('aria-live');
  });

  it('previews a change to Shortcut 1, enables Save and shows the unsaved notice', async () => {
    const user = userEvent.setup();
    const { storage } = await renderPage();
    await user.click(within(group1()).getByRole('radio', { name: 'Announce the time' }));

    expect(within(preview()).getByText('Shortcut 1: Play or pause media → Announce the time')).toBeInTheDocument();
    expect(within(preview()).queryByText('No changes yet.')).toBeNull();
    expect(saveButton()).not.toHaveAttribute('aria-disabled');
    expect(saveButton()).toHaveAccessibleDescription('Shortcut 1 changes from Play or pause media to Announce the time.');
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes in Your shortcuts.')).toBeInTheDocument();
    // Nothing is stored until Save.
    expect(storage.get(STORAGE_KEYS.commandMapping)).toBeNull();

    // Choosing the saved value again clears the preview.
    await user.click(within(group1()).getByRole('radio', { name: 'Play or pause media' }));
    expect(within(preview()).getByText('No changes yet.')).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('changes a shortcut with the keyboard', async () => {
    const user = userEvent.setup();
    await renderPage();
    within(group2()).getByRole('radio', { name: 'Announce the time' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(within(group2()).getByRole('radio', { name: 'Read recent notifications' })).toBeChecked();
    expect(within(preview()).getByText('Shortcut 2: Announce the time → Read recent notifications')).toBeInTheDocument();
  });

  it('saves through the service, announces it and shows the saved values', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    const { unmount } = await renderPage(storage);
    await user.click(within(group1()).getByRole('radio', { name: 'Toggle the flashlight' }));
    await user.click(within(group2()).getByRole('radio', { name: 'Nothing assigned' }));
    expect(within(preview()).getAllByRole('listitem')).toHaveLength(2);
    await user.click(saveButton());

    await waitFor(() => expect(politeRegion()).toHaveTextContent('Shortcuts saved.'));
    const success = screen.getAllByRole('status').find((el) => el.textContent?.includes('Shortcuts saved'));
    if (!success) throw new Error('success callout missing');
    expect(success).toHaveTextContent('Shortcut 1: Toggle the flashlight');
    expect(success).toHaveTextContent('Shortcut 2: Nothing assigned');

    expect(storage.get(STORAGE_KEYS.commandMapping)).toMatchObject({
      shortcuts: { quick_action_1: 'toggle_flashlight', quick_action_2: 'unassigned' },
    });
    expect(within(preview()).getByText('No changes yet.')).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Not saved yet')).toBeNull();
    const shortcutRow = screen
      .getAllByRole('rowheader')
      .find((th) => th.textContent?.startsWith('Shortcut 1'));
    expect(shortcutRow).toHaveTextContent('Toggle the flashlight');

    unmount();
    await renderPage(storage);
    expect(within(group1()).getByRole('radio', { name: 'Toggle the flashlight' })).toBeChecked();
    expect(within(group2()).getByRole('radio', { name: 'Nothing assigned' })).toBeChecked();
    expect(screen.getByText(/^Last changed /)).toBeInTheDocument();
  });

  it('says when the browser did not store the saved shortcuts, while they still apply for now', async () => {
    class RefusingStorage extends MemoryStorageAdapter {
      set<T>(key: string, value: T): boolean {
        if (key === STORAGE_KEYS.commandMapping) return false;
        return super.set(key, value);
      }
    }
    const user = userEvent.setup();
    await renderPage(new RefusingStorage());
    await user.click(within(group1()).getByRole('radio', { name: 'Toggle the flashlight' }));
    await user.click(saveButton());

    await waitFor(() => expect(politeRegion()).toHaveTextContent(`Shortcuts saved. ${NOT_PERSISTED_NOTE}`));
    const result = screen.getAllByRole('status').find((el) => el.textContent?.includes('Shortcuts saved'));
    expect(result).toHaveTextContent('Shortcut 1: Toggle the flashlight');
    expect(result).toHaveTextContent(NOT_PERSISTED_NOTE);
    expect(within(group1()).getByRole('radio', { name: 'Toggle the flashlight' })).toBeChecked();
  });

  it('does not mention storage when the save was stored', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(within(group2()).getByRole('radio', { name: 'Toggle the flashlight' }));
    await user.click(saveButton());
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Shortcuts saved.'));
    expect(screen.queryByText(NOT_PERSISTED_NOTE)).toBeNull();
  });

  it('discards the draft, reverts the choices and keeps focus nearby', async () => {
    const user = userEvent.setup();
    const { storage } = await renderPage();
    await user.click(within(group1()).getByRole('radio', { name: 'Start a voice memo' }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(within(group1()).getByRole('radio', { name: 'Play or pause media' })).toBeChecked();
    expect(within(preview()).getByText('No changes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard changes' })).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Changes to save' })).toHaveFocus();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Changes discarded.'));
    expect(storage.get(STORAGE_KEYS.commandMapping)).toBeNull();
  });

  it('restores the defaults after confirmation', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    storage.set(STORAGE_KEYS.commandMapping, {
      version: 1,
      shortcuts: { quick_action_1: 'open_assistant', quick_action_2: 'start_voice_memo' },
      updatedAt: '2026-09-10T08:00:00.000Z',
    });
    await renderPage(storage);
    expect(within(group1()).getByRole('radio', { name: 'Open the voice assistant' })).toBeChecked();

    await user.click(within(group2()).getByRole('radio', { name: 'Toggle the flashlight' }));
    await user.click(screen.getByRole('button', { name: 'Restore defaults' }));
    const dialog = screen.getByRole('dialog', { name: 'Restore default shortcuts?' });
    expect(dialog).toHaveTextContent('Shortcut 1: Play or pause media');
    expect(dialog).toHaveTextContent('Shortcut 2: Announce the time');
    expect(dialog).toHaveTextContent('Your unsaved changes will be discarded too.');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(group2()).getByRole('radio', { name: 'Toggle the flashlight' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Restore defaults' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore defaults' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Default shortcuts restored.'));
    expect(within(group1()).getByRole('radio', { name: 'Play or pause media' })).toBeChecked();
    expect(within(group2()).getByRole('radio', { name: 'Announce the time' })).toBeChecked();
    expect(storage.get(STORAGE_KEYS.commandMapping)).toMatchObject({
      shortcuts: { quick_action_1: 'play_pause', quick_action_2: 'announce_time' },
    });
    const restored = screen.getAllByRole('status').find((el) => el.textContent?.includes('Default shortcuts restored'));
    expect(restored).toHaveTextContent('Shortcut 1: Play or pause media');
    expect(screen.getByRole('heading', { level: 3, name: 'Changes to save' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Restore defaults' })).toBeNull();
  });

  it('follows a save made elsewhere while there is no draft', async () => {
    const storage = new MemoryStorageAdapter();
    await renderPage(storage);
    act(() => {
      storage.set(STORAGE_KEYS.commandMapping, {
        version: 1,
        shortcuts: { quick_action_1: 'announce_phone_battery', quick_action_2: 'announce_time' },
        updatedAt: '2026-09-15T08:00:00.000Z',
      });
    });
    await waitFor(() =>
      expect(within(group1()).getByRole('radio', { name: 'Announce phone battery' })).toBeChecked(),
    );
    expect(within(preview()).getByText('No changes yet.')).toBeInTheDocument();
  });
});
