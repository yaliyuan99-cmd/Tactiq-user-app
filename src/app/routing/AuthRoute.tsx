import { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/services/auth/AuthProvider';
import { safeNextPath } from './redirects';
import { RouteLoading } from './RouteLoading';

/**
 * Wraps sign-in, sign-up and forgot-password. A user who is already signed in
 * when they arrive is sent to the safe `?next=` path or the dashboard.
 *
 * A user who signs in or signs up on one of these screens is not redirected
 * here: the page navigates itself (sign-in to `next`, sign-up to onboarding),
 * so two competing redirects never race.
 *
 * Reset-password is deliberately not wrapped: a recovery link signs the user
 * in and must still reach its form.
 */
export function AuthRoute() {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  // Lazily initialised once the session is known; later sign-ins do not change it.
  const arrival = useRef<'signed-in' | 'signed-out' | null>(null);

  if (loading) return <RouteLoading />;
  if (arrival.current === null) arrival.current = user ? 'signed-in' : 'signed-out';
  if (user && arrival.current === 'signed-in') return <Navigate to={safeNextPath(search)} replace />;
  return <Outlet />;
}
