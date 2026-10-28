/**
 * The application root: router, providers, error boundary and route table.
 *
 * Route tree
 *   /                            the public product page, which draws its own frame
 *   PublicLayout                 skip link, banner with the wordmark and the way in, main
 *     /                          the public product page, signed in or out
 *     *                          Page not found (centred reading column)
 *   BareLayout (main landmark only; the auth pages draw their own layout)
 *     AuthRoute                  sign-in, sign-up, forgot-password (a user already
 *                                signed in goes to ?next= or the dashboard)
 *     /reset-password            reachable signed in or out (recovery links sign the user in)
 *   /login, /signup              aliases of the account flow
 *   ProtectedRoute (standalone)
 *     /onboarding                OnboardingPage draws its own frame (skip link, banner with
 *                                Help and Skip setup, main), so it sits outside any layout
 *                                and the page has one main landmark and one skip link
 *   ProtectedRoute → OnboardingGate → AppShell section="account"
 *     /dashboard and everything under it: the account screens
 *   AppShell section="demo"
 *     /demo and everything under it: the same screens as a guest demonstration,
 *     with no account and no guard — labelled as a demonstration, never as a
 *     signed-in session
 *
 * sectionRoutes() is the one list of account screens, mounted under both bases,
 * so the two can never drift apart. Every page is rendered through RoutePage:
 * its own Suspense boundary with an accessible "Loading…" status, plus
 * RouteFocus for focus and announcements.
 */
import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { LocalStorageAdapter } from '@/services/storage/StorageAdapter';
import { AppProviders } from './AppProviders';
import { RouteErrorBoundary } from './ErrorBoundary';
import * as Pages from './lazyPages';
import { ROUTES } from './routes';
import { AliasRedirect } from './routing/AliasRedirect';
import { PUBLIC_ALIASES, SECTION_ALIASES } from './routing/aliases';
import { AuthRoute } from './routing/AuthRoute';
import { BareLayout } from './routing/BareLayout';
import { DemoSessionProvider } from './routing/DemoSession';
import { OnboardingGate } from './routing/OnboardingGate';
import { ProtectedRoute } from './routing/ProtectedRoute';
import { PublicLayout } from './routing/PublicLayout';
import { RoutePage } from './routing/RoutePage';
import { sectionChild, type SectionId } from './routing/sections';
import { AppShell } from './shell/AppShell';
import { RouteFocusProvider } from './shell/RouteFocus';

/** The account screens, mounted under /dashboard and again under /demo. */
function sectionRoutes(section: SectionId) {
  const child = sectionChild;
  return (
    <>
      <Route index element={<RoutePage page={Pages.DashboardPage} />} />
      <Route path={child(ROUTES.connect)} element={<RoutePage page={Pages.ConnectPage} />} />
      <Route path={child(ROUTES.calibrate)} element={<RoutePage page={Pages.CalibratePage} />} />
      <Route path={child(ROUTES.train)} element={<RoutePage page={Pages.TrainPage} />} />
      <Route path={`${child(ROUTES.train)}/:lessonId`} element={<RoutePage page={Pages.LessonPage} />} />
      <Route path={child(ROUTES.simulator)} element={<RoutePage page={Pages.SimulatorPage} />} />
      <Route path={child(ROUTES.commands)} element={<RoutePage page={Pages.CommandsPage} />} />
      <Route path={child(ROUTES.history)} element={<RoutePage page={Pages.HistoryPage} />} />
      <Route path={child(ROUTES.settings)} element={<RoutePage page={Pages.SettingsPage} />} />
      <Route path={child(ROUTES.help)} element={<RoutePage page={Pages.HelpPage} />} />
      {SECTION_ALIASES.map((alias) => (
        <Route
          key={alias.from}
          path={child(alias.from)}
          element={<AliasRedirect to={alias.to} section={section} />}
        />
      ))}
      <Route path="*" element={<RoutePage page={Pages.NotFoundPage} />} />
    </>
  );
}

export function AppRoutes() {
  return (
    <RouteErrorBoundary variant="page">
      <DemoSessionProvider>
        <RouteFocusProvider>
          <Routes>
            {/* The product page draws its own skip link, banner, main landmark and
                footer, so it is registered bare. Wrapping it in PublicLayout gave the
                page two of each, which is an accessibility defect, not just a double
                header. Page not found keeps the layout's reading column. */}
            <Route path={ROUTES.root} element={<RoutePage page={Pages.HomePage} />} />
            <Route element={<PublicLayout contained />}>
              <Route path="*" element={<RoutePage page={Pages.NotFoundPage} />} />
            </Route>

            <Route element={<BareLayout />}>
              <Route element={<AuthRoute />}>
                <Route path={ROUTES.signIn} element={<RoutePage page={Pages.SignInPage} />} />
                <Route path={ROUTES.signUp} element={<RoutePage page={Pages.SignUpPage} />} />
                <Route path={ROUTES.forgotPassword} element={<RoutePage page={Pages.ForgotPasswordPage} />} />
              </Route>
              <Route path={ROUTES.resetPassword} element={<RoutePage page={Pages.ResetPasswordPage} />} />
            </Route>

            {PUBLIC_ALIASES.map((alias) => (
              <Route key={alias.from} path={alias.from} element={<AliasRedirect to={alias.to} />} />
            ))}

            <Route element={<ProtectedRoute standalone />}>
              <Route path={ROUTES.onboarding} element={<RoutePage page={Pages.OnboardingPage} standalone />} />
            </Route>

            <Route element={<ProtectedRoute standalone />}>
              <Route element={<OnboardingGate />}>
                <Route path={ROUTES.dashboard} element={<AppShell section="account" />}>
                  {sectionRoutes('account')}
                </Route>
              </Route>
            </Route>

            <Route path={ROUTES.demo} element={<AppShell section="demo" />}>
              {sectionRoutes('demo')}
            </Route>
          </Routes>
        </RouteFocusProvider>
      </DemoSessionProvider>
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
