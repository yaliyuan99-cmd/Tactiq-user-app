import { act } from 'react';
import { renderApp, screen, waitFor } from '@/test/renderApp';
import { BACK_ONLINE_MESSAGE, OFFLINE_MESSAGE, OfflineBanner } from './OfflineBanner';

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

/** Renders the banner and lets the providers finish restoring the session. */
async function renderBanner() {
  renderApp(<OfflineBanner />);
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'onLine');
});

describe('OfflineBanner', () => {
  it('shows nothing while online', async () => {
    setOnline(true);
    await renderBanner();
    expect(screen.queryByText(OFFLINE_MESSAGE)).not.toBeInTheDocument();
  });

  it('shows and announces the offline note, then announces the return', async () => {
    setOnline(true);
    await renderBanner();
    const polite = screen.getByTestId('live-region-polite');

    setOnline(false);
    expect(screen.getByText(OFFLINE_MESSAGE)).toBeInTheDocument();
    await waitFor(() => expect(polite).toHaveTextContent(OFFLINE_MESSAGE));

    setOnline(true);
    expect(screen.queryByText(OFFLINE_MESSAGE)).not.toBeInTheDocument();
    await waitFor(() => expect(polite).toHaveTextContent(BACK_ONLINE_MESSAGE));
  });

  it('shows the note when the app starts offline, without an announcement', async () => {
    setOnline(false);
    await renderBanner();
    expect(screen.getByText(OFFLINE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId('live-region-polite')).toBeEmptyDOMElement();
  });
});
