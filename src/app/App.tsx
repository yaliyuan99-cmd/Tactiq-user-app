/* PLACEHOLDER shell — replaced by the app-shell implementation. Keeps every route reachable meanwhile. */
import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { AppProviders } from './AppProviders';
import { ROUTES } from './routes';
import { LocalStorageAdapter } from '@/services/storage/StorageAdapter';

const SignInPage = lazy(() => import('@/features/auth/SignInPage'));
const SignUpPage = lazy(() => import('@/features/auth/SignUpPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ConnectPage = lazy(() => import('@/features/connect/ConnectPage'));
const CalibratePage = lazy(() => import('@/features/calibrate/CalibratePage'));
const TrainPage = lazy(() => import('@/features/train/TrainPage'));
const LessonPage = lazy(() => import('@/features/train/LessonPage'));
const SimulatorPage = lazy(() => import('@/features/simulator/SimulatorPage'));
const CommandsPage = lazy(() => import('@/features/commands/CommandsPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const HelpPage = lazy(() => import('@/features/help/HelpPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <Routes>
        <Route path={ROUTES.root} element={<Navigate to={ROUTES.dashboard} replace />} />
        <Route path={ROUTES.signIn} element={<SignInPage />} />
        <Route path={ROUTES.signUp} element={<SignUpPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
        <Route
          path={ROUTES.dashboard}
          element={
            <main id="main-content" className="mx-auto max-w-5xl p-6">
              <Outlet />
            </main>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="connect" element={<ConnectPage />} />
          <Route path="calibrate" element={<CalibratePage />} />
          <Route path="train" element={<TrainPage />} />
          <Route path="train/:lessonId" element={<LessonPage />} />
          <Route path="simulator" element={<SimulatorPage />} />
          <Route path="commands" element={<CommandsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const storage = useMemo(() => new LocalStorageAdapter(), []);
  return (
    <BrowserRouter>
      <AppProviders storage={storage}>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
