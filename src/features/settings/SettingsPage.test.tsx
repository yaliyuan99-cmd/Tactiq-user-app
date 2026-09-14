import type { UserPreferences } from '@/domain/models';
import { MemoryStorageAdapter, STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { screen, userEvent, waitFor, within } from '@/test/renderApp';
import { SETTINGS_SECTIONS } from './settingsSections';
import { politeRegion, renderSettings, sectionRegion } from './testing/renderSettings';

function storedPreferences(storage: StorageAdapter): UserPreferences | null {
  return storage.get<UserPreferences>(STORAGE_KEYS.preferences);
}

/** Refuses writes once `failing` is set, as a browser in private mode or out of quota would. */
class RefusingStorage extends MemoryStorageAdapter {
  failing = false;
  override set<T>(key: string, value: T): boolean {
    if (this.failing) return false;
    return super.set(key, value);
  }
}

describe('SettingsPage', () => {
  it('has one h1, the lede, a contents list and nine named sections in order', async () => {
    await renderSettings();
    expect(document.title).toBe('Settings · Tactiq');
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Settings');
    expect(screen.getByText('Changes save straight away in this browser.')).toBeInTheDocument();

    const contents = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(contents).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(
      SETTINGS_SECTIONS.map((section) => [section.title, `#${section.id}`]),
    );

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(
      SETTINGS_SECTIONS.map((section) => section.title),
    );
    for (const section of SETTINGS_SECTIONS) {
      expect(sectionRegion(section.title)).toHaveAttribute('id', section.id);
    }
  });

  it('moves focus to a section heading when it is chosen from the contents list', async () => {
    const user = userEvent.setup();
    await renderSettings();
    await user.click(screen.getByRole('link', { name: 'Privacy and your data' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Privacy and your data' })).toHaveFocus();
  });

  it('applies the theme at once, saves it and announces it', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({ preferences: { theme: 'light' } });
    const theme = screen.getByRole('group', { name: 'Theme' });
    expect(within(theme).getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(within(theme).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(storedPreferences(storage)?.theme).toBe('dark');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Theme set to Dark.'));

    await user.click(within(theme).getByRole('radio', { name: 'System' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(storedPreferences(storage)?.theme).toBe('system');
  });

  it('changes text size with a preview sentence, and contrast, on the document', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings();
    expect(screen.getByText('Squeeze the ring, then touch your index fingertip to confirm.')).toBeInTheDocument();

    await user.click(within(screen.getByRole('group', { name: 'Text size' })).getByRole('radio', { name: 'Larger' }));
    expect(document.documentElement).toHaveAttribute('data-text-size', 'larger');
    expect(storedPreferences(storage)?.textSize).toBe('larger');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Text size set to Larger.'));

    await user.click(within(screen.getByRole('group', { name: 'Text size' })).getByRole('radio', { name: 'Default' }));
    expect(document.documentElement).not.toHaveAttribute('data-text-size');

    const contrast = screen.getByRole('group', { name: 'Contrast' });
    await user.click(within(contrast).getByRole('radio', { name: 'Increased' }));
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    expect(storedPreferences(storage)?.contrast).toBe('high');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Contrast set to Increased.'));
    await user.click(within(contrast).getByRole('radio', { name: 'Standard' }));
    expect(document.documentElement).not.toHaveAttribute('data-contrast');
  });

  it('moves between theme options with the arrow keys', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings({ preferences: { theme: 'light' } });
    within(screen.getByRole('group', { name: 'Theme' })).getByRole('radio', { name: 'Light' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(within(screen.getByRole('group', { name: 'Theme' })).getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(storedPreferences(storage)?.theme).toBe('dark');
  });

  it('turns reduce motion on and off with the keyboard', async () => {
    const user = userEvent.setup();
    const { storage } = await renderSettings();
    const toggle = screen.getByRole('switch', { name: 'Reduce motion' });
    expect(toggle).toHaveAccessibleDescription('Turns off animation in this app, even if your device allows it.');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveClass('force-reduced-motion');
    expect(storedPreferences(storage)?.reducedMotion).toBe(true);
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Reduce motion on.'));

    await user.keyboard('{Enter}');
    expect(document.documentElement).not.toHaveClass('force-reduced-motion');
  });

  it('warns when the browser refuses to save preferences', async () => {
    const user = userEvent.setup();
    const storage = new RefusingStorage();
    await renderSettings({ storage });
    expect(screen.queryByText('Changes are not being saved')).not.toBeInTheDocument();

    storage.failing = true;
    await user.click(screen.getByRole('switch', { name: 'Visual confirmation' }));
    expect(screen.getByText('Changes are not being saved')).toBeInTheDocument();
    expect(screen.getByText(/will not survive a refresh/)).toBeInTheDocument();
    // The change still applies for this visit.
    expect(screen.getByRole('switch', { name: 'Visual confirmation' })).toHaveAttribute('aria-checked', 'false');
  });
});
