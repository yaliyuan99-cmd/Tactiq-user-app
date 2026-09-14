import { renderApp, screen } from '@/test/renderApp';
import { useAuth } from '@/services/auth/AuthProvider';
import { useDevice } from '@/services/device/DeviceProvider';
import { useServices } from '@/services/ServicesProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';

function Probe() {
  const { user, loading } = useAuth();
  const { state } = useDevice();
  const services = useServices();
  const { preferences } = usePreferences();
  if (loading) return <p>loading</p>;
  return (
    <ul>
      <li>user:{user?.displayName ?? 'none'}</li>
      <li>device:{state.mode}</li>
      <li>history:{services.history.count()}</li>
      <li>onboarded:{String(preferences.onboardingCompleted)}</li>
    </ul>
  );
}

describe('AppProviders', () => {
  it('composes every provider with a signed-in demo profile', async () => {
    renderApp(<Probe />);
    expect(await screen.findByText('user:Alex')).toBeInTheDocument();
    expect(screen.getByText('device:demo')).toBeInTheDocument();
    expect(screen.getByText('history:0')).toBeInTheDocument();
    expect(screen.getByText('onboarded:true')).toBeInTheDocument();
  });

  it('renders signed out when asked', async () => {
    renderApp(<Probe />, { signedIn: false });
    expect(await screen.findByText('user:none')).toBeInTheDocument();
  });
});
