/**
 * The application root: router, providers, error boundary and route table.
 *
 * Route tree
 *   BareLayout (main landmark only; the auth pages draw their own layout)
 *     AuthRoute            sign-in, sign-up, forgot-password (users already signed in go to ?next= or the dashboard)
 *     /reset-password      reachable signed in or out (recovery links sign the user in)
 *   PublicLayout (skip link, logo banner with Help once signed in, main)
 *     /                    RootRedirect → dashboard or sign-in
 *     *                    Page not found
 *   ProtectedRoute (standalone)
 *     /onboarding          OnboardingPage draws its own frame (skip link, banner with
 *                          Help and Skip setup, main), so it sits outside PublicLayout
 *                          and the page has exactly one main landmark and one skip link
 *   ProtectedRoute → OnboardingGate → AppShell (top bar, navigation, main)
 *     /dashboard, connect, calibrate, train, train/:lessonId, simulator,
 *     commands, history, settings, help, and * (Page not found inside the shell)
 *
 * Every page is rendered through RoutePage: its own Suspense boundary with an
 * accessible "Loading…" status (inside its own main landmark for a standalone
 * page), plus RouteFocus for focus and announcements.
 */
import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { LocalStorageAdapter } from '@/services/storage/StorageAdapter';
import { AppProviders } from './AppProviders';
import { RouteErrorBoundary } from './ErrorBoundary';
import * as Pages from './lazyPages';
import { ROUTES } from './routes';
import { AuthRoute } from './routing/AuthRoute';
import { BareLayout } from './routing/BareLayout';
import { OnboardingGate } from './routing/OnboardingGate';
import { ProtectedRoute } from './routing/ProtectedRoute';
import { PublicLayout } from './routing/PublicLayout';
import { RootRedirect } from './routing/RootRedirect';
import { RoutePage } from './routing/RoutePage';
import { AppShell } from './shell/AppShell';
import { RouteFocusProvider } from './shell/RouteFocus';

/** "/dashboard/train" → "train": child paths derived from ROUTES so they never drift. */
function dashboardChild(path: string): string {
  return path.slice(ROUTES.dashboard.length + 1);
}

export function AppRoutes() {
  return (
    <RouteErrorBoundary variant="page">
      <RouteFocusProvider>
        <Routes>
          <Route element={<BareLayout />}>
            <Route element={<AuthRoute />}>
              <Route path={ROUTES.signIn} element={<RoutePage page={Pages.SignInPage} />} />
              <Route path={ROUTES.signUp} element={<RoutePage page={Pages.SignUpPage} />} />
              <Route path={ROUTES.forgotPassword} element={<RoutePage page={Pages.ForgotPasswordPage} />} />
            </Route>
            <Route path={ROUTES.resetPassword} element={<RoutePage page={Pages.ResetPasswordPage} />} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route path={ROUTES.root} element={<RootRedirect />} />
            <Route path="*" element={<RoutePage page={Pages.NotFoundPage} />} />
          </Route>

          <Route element={<ProtectedRoute standalone />}>
            <Route path={ROUTES.onboarding} element={<RoutePage page={Pages.OnboardingPage} standalone />} />
          </Route>

          <Route element={<ProtectedRoute standalone />}>
            <Route element={<OnboardingGate />}>
              <Route path={ROUTES.dashboard} element={<AppShell />}>
                <Route index element={<RoutePage page={Pages.DashboardPage} />} />
                <Route path={dashboardChild(ROUTES.connect)} element={<RoutePage page={Pages.ConnectPage} />} />
                <Route path={dashboardChild(ROUTES.calibrate)} element={<RoutePage page={Pages.CalibratePage} />} />
                <Route path={dashboardChild(ROUTES.train)} element={<RoutePage page={Pages.TrainPage} />} />
                <Route path={`${dashboardChild(ROUTES.train)}/:lessonId`} element={<RoutePage page={Pages.LessonPage} />} />
                <Route path={dashboardChild(ROUTES.simulator)} element={<RoutePage page={Pages.SimulatorPage} />} />
                <Route path={dashboardChild(ROUTES.commands)} element={<RoutePage page={Pages.CommandsPage} />} />
                <Route path={dashboardChild(ROUTES.history)} element={<RoutePage page={Pages.HistoryPage} />} />
                <Route path={dashboardChild(ROUTES.settings)} element={<RoutePage page={Pages.SettingsPage} />} />
                <Route path={dashboardChild(ROUTES.help)} element={<RoutePage page={Pages.HelpPage} />} />
                <Route path="*" element={<RoutePage page={Pages.NotFoundPage} />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </RouteFocusProvider>
    </RouteErrorBoundary>
  );
}

let appStorage: LocalStorageAdapter | null = null;

/** The browser storage adapter, created once per page load (it registers a cross-tab listener). */
function getAppStorage(): LocalStorageAdapter {
  appStorage ??= new LocalStorageAdapter();
  return appStorage;
}

export default function App() {
  const [storage] = useState(getAppStorage);
  return (
    <BrowserRouter>
      <RouteErrorBoundary variant="page">
        <AppProviders storage={storage}>
          <AppRoutes />
        </AppProviders>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}
