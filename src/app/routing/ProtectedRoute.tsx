import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/services/auth/AuthProvider';
import { signInRedirectPath } from './redirects';
import { RouteLoading } from './RouteLoading';

export interface ProtectedRouteProps {
  /** Render the loading status with its own main landmark (no layout around this guard). */
  readonly standalone?: boolean;
}

/**
 * Renders child routes only for a signed-in user (a Demo Mode guest counts).
 * A visitor who was never signed in here is sent to sign-in with
 * `?next=<path+search>` so they come back afterwards. A user who signs out
 * while on a protected page goes to plain sign-in: they chose to leave.
 */
export function ProtectedRoute({ standalone = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (user) wasSignedIn.current = true;
  }, [user]);

  if (loading) return <RouteLoading standalone={standalone} />;
  if (!user) {
    const to = wasSignedIn.current ? ROUTES.signIn : signInRedirectPath(location);
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}
