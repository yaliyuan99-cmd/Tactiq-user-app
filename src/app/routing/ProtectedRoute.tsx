import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/services/auth/AuthProvider';
import { useDemoSession } from './DemoSession';
import { signInRedirectPath } from './redirects';
import { RouteLoading } from './RouteLoading';
import { demoPath, withLocation } from './sections';

export interface ProtectedRouteProps {
  /** Render the loading status with its own main landmark (no layout around this guard). */
  readonly standalone?: boolean;
}

/**
 * Renders child routes only for a signed-in user (a Demo Mode local profile
 * counts). A visitor who was never signed in here is sent to sign-in with
 * `?next=<path+search+hash>` so they come back afterwards. A user who signs
 * out while on a protected page goes to plain sign-in: they chose to leave.
 *
 * One exception: a guest who is part way through the demonstration and follows
 * a screen's link to an account address is taken to the same screen inside
 * /demo rather than asked to sign in. The demonstration address renders
 * without a guard, so this cannot loop.
 *
 * The session is restored before any of this is decided (`loading`), so a
 * refresh never flashes a signed-in page or another profile's content.
 */
export function ProtectedRoute({ standalone = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const demo = useDemoSession();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (user) wasSignedIn.current = true;
  }, [user]);

  if (loading) return <RouteLoading standalone={standalone} />;
  if (!user) {
    if (demo.active && !wasSignedIn.current) {
      return <Navigate to={withLocation(demoPath(location.pathname), location)} replace />;
    }
    const to = wasSignedIn.current ? ROUTES.signIn : signInRedirectPath(location);
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}
