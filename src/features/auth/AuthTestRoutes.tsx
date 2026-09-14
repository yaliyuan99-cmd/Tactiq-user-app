/** Test-only: the four auth screens plus a stub that shows where navigation landed. */
import { Route, Routes, useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';

function LandedAt() {
  const location = useLocation();
  return <p>{`Landed at ${location.pathname}${location.search}`}</p>;
}

/** Exposes the current path, search and router state (as JSON) to tests. */
export function LocationStateProbe() {
  const { pathname, search, state } = useLocation();
  return (
    <div hidden data-testid="location-state" data-location={`${pathname}${search}`} data-state={JSON.stringify(state ?? null)} />
  );
}

export function AuthTestRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.signIn} element={<SignInPage />} />
      <Route path={ROUTES.signUp} element={<SignUpPage />} />
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
      <Route path="*" element={<LandedAt />} />
    </Routes>
  );
}
