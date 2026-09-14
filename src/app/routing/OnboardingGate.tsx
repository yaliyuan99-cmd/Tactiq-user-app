import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { isOnboardingExempt } from './redirects';

/**
 * Sends a user who has not finished (or skipped) setup to onboarding.
 * Help stays reachable so guidance is never locked behind setup.
 */
export function OnboardingGate() {
  const { preferences } = usePreferences();
  const { pathname } = useLocation();
  if (!preferences.onboardingCompleted && !isOnboardingExempt(pathname)) {
    return <Navigate to={ROUTES.onboarding} replace />;
  }
  return <Outlet />;
}
