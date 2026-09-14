import { Outlet } from 'react-router';
import { RouteErrorBoundary } from '@/app/ErrorBoundary';
import { ROUTES } from '@/app/routes';
import { HelpLink } from '@/app/shell/HelpLink';
import { Logo, SkipLink } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';

/**
 * Frame for the top-level "Page not found" (and the "/" redirect), screens
 * without the app navigation. It provides the skip link, a banner with the
 * logo (plus Help once signed in) and the main landmark with a centred
 * container, so those pages render only their content.
 *
 * Onboarding is deliberately not rendered here: OnboardingLayout draws its own
 * skip link, banner and main, and nesting it would give the page two main
 * landmarks and two skip links.
 */
export function PublicLayout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center gap-2 px-4 sm:px-6">
          <Logo to={ROUTES.root} />
          {user && <HelpLink className="ml-auto" />}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="w-full flex-1 outline-none">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 [&_[id]]:scroll-mt-6">
          <RouteErrorBoundary variant="section">
            <Outlet />
          </RouteErrorBoundary>
        </div>
      </main>
    </div>
  );
}
