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
