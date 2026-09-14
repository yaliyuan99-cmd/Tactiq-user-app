import { Navigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/services/auth/AuthProvider';
import { RouteLoading } from './RouteLoading';

/** "/": the dashboard for a signed-in user, sign-in for everyone else. */
export function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  return <Navigate to={user ? ROUTES.dashboard : ROUTES.signIn} replace />;
}
