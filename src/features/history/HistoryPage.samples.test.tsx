/**
 * Sample records are opt-in. They exist so a first-time Demo Mode user has
 * something to read the screens from, and they are never written on mount:
 * that put practice records into whichever profile happened to open the app,
 * and a user who had deliberately cleared them could not tell the difference.
 *
 * The hook that offers them was written for a control that was never rendered,
 * so until now the Activity screen promised sample records nobody could get.
 */
import { renderApp, screen, userEvent, waitFor } from '@/test/renderApp';
import HistoryPage from './HistoryPage';

const addSamples = () => screen.queryByRole('button', { name: 'Add sample records' });

describe('offering sample records', () => {
  it('offers them in the empty state, and adds them when asked', async () => {
    const user = userEvent.setup();
    renderApp(<HistoryPage />, { deviceMode: 'demo' });

    expect(screen.getByRole('heading', { level: 2, name: 'No activity yet' })).toBeInTheDocument();
    const button = addSamples();
    expect(button).toBeInTheDocument();

    await user.click(button!);

    // The empty state is gone because there are records now, and every one of
    // them says where it came from.
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'No activity yet' })).not.toBeInTheDocument());
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0);
  });

  it('does not offer them twice', async () => {
    const user = userEvent.setup();
    renderApp(<HistoryPage />, { deviceMode: 'demo' });
    await user.click(addSamples()!);
    await waitFor(() => expect(addSamples()).not.toBeInTheDocument());
  });

  it('never offers them against a bench ring, where they would sit beside real readings', () => {
    renderApp(<HistoryPage />, { deviceMode: 'hardware' });
    expect(addSamples()).not.toBeInTheDocument();
  });

  it('says what it did, so a screen-reader user is not left guessing', async () => {
    const user = userEvent.setup();
    renderApp(<HistoryPage />, { deviceMode: 'demo' });
    await user.click(addSamples()!);
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent(/sample records added/i));
  });
});
