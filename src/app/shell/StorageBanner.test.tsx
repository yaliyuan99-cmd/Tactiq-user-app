import { act } from 'react';
import { renderApp, screen, waitFor } from '@/test/renderApp';
import { LocalStorageAdapter, STORAGE_KEYS, WRITES_BLOCKED_NOTE } from '@/services/storage/StorageAdapter';
import { StorageBanner } from './StorageBanner';

/** Renders the banner and lets the providers finish restoring the session. */
async function renderBanner(storage?: LocalStorageAdapter) {
  renderApp(<StorageBanner />, storage ? { storage } : {});
  await act(async () => {
    await Promise.resolve();
  });
}

/** Makes the browser refuse every write from now on, the way a full quota does. */
function refuseWrites() {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('StorageBanner', () => {
  it('shows nothing while the browser accepts writes', async () => {
    await renderBanner();
    expect(screen.queryByText(WRITES_BLOCKED_NOTE)).not.toBeInTheDocument();
  });

  it('shows and announces the note once the browser refuses a write', async () => {
    const storage = new LocalStorageAdapter();
    await renderBanner(storage);
    const polite = screen.getByTestId('live-region-polite');
    expect(screen.queryByText(WRITES_BLOCKED_NOTE)).not.toBeInTheDocument();

    refuseWrites();
    act(() => {
      storage.set(STORAGE_KEYS.history, [1]);
    });

    expect(screen.getByText(WRITES_BLOCKED_NOTE)).toBeInTheDocument();
    expect(screen.getByText('Changes are not being saved')).toBeInTheDocument();
    await waitFor(() => expect(polite).toHaveTextContent(WRITES_BLOCKED_NOTE));
  });

  it('is not a live region of its own, so the note is read once', async () => {
    const storage = new LocalStorageAdapter();
    await renderBanner(storage);
    refuseWrites();
    act(() => {
      storage.set(STORAGE_KEYS.history, [1]);
    });

    const callout = screen.getByText(WRITES_BLOCKED_NOTE).closest('[role]');
    expect(callout?.getAttribute('role')).not.toBe('status');
    expect(callout?.getAttribute('role')).not.toBe('alert');
  });
});
