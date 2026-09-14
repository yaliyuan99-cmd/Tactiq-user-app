import { useLocation } from 'react-router';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { renderWithProviders, screen } from './render';

function Probe() {
  const location = useLocation();
  const { preferences } = usePreferences();
  const feedback = useFeedback();
  return (
    <p>
      {location.pathname} · {preferences.hand} · {typeof feedback.announce}
    </p>
  );
}

describe('renderWithProviders', () => {
  it('wraps the UI in router, preferences and feedback providers', () => {
    renderWithProviders(<Probe />, { route: '/settings', preferences: { hand: 'left' } });
    expect(screen.getByText('/settings · left · function')).toBeInTheDocument();
  });

  it('uses the storage it is given and returns it', () => {
    const storage = new MemoryStorageAdapter();
    const result = renderWithProviders(<Probe />, { storage });
    expect(result.storage).toBe(storage);
    expect(screen.getByText('/ · right · function')).toBeInTheDocument();
  });
});
