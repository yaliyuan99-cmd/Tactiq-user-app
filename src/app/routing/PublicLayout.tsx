import { Outlet } from 'react-router';
import { RouteErrorBoundary } from '@/app/ErrorBoundary';
import { ROUTES } from '@/app/routes';
import { HelpLink } from '@/app/shell/HelpLink';
import { ButtonLink, Logo, SkipLink } from '@/components';
import { cn } from '@/lib/cn';
import { useAuth } from '@/services/auth/AuthProvider';

/**
 * Frame for the screens outside the app navigation: the public product page at
 * "/" and the top-level "Page not found". It supplies the skip link, one
 * banner with the wordmark and the way in, and the single main landmark, so
 * those pages render only their own content and their own h1.
 *
 * `contained` centres the content in a reading column — right for Page not
 * found, wrong for the product page, which lays out its own full-width
 * sections.
 *
 * Help lives inside the account section, so it is offered to someone who is
 * signed in; a visitor who is not is offered the demonstration, which carries
 * the same Help.
 *
 * Onboarding is deliberately not rendered here: OnboardingLayout draws its own
 * skip link, banner and main, and nesting it would give the page two main
 * landmarks and two skip links.
 */
export function PublicLayout({ contained = false }: { readonly contained?: boolean }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 sm:px-6">
          <Logo to={ROUTES.root} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-1 gap-y-1 sm:gap-x-2">
            {user ? (
              <>
                <HelpLink />
                <ButtonLink to={ROUTES.dashboard} size="sm" variant="secondary">
                  Your dashboard
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink to={ROUTES.demo} size="sm" variant="ghost">
                  Demonstration
                </ButtonLink>
                <ButtonLink to={ROUTES.signIn} size="sm" variant="secondary">
                  Sign in
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="w-full flex-1 outline-none">
        <div className={cn(contained && 'mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10', '[&_[id]]:scroll-mt-6')}>
          <RouteErrorBoundary variant="section">
            <Outlet />
          </RouteErrorBoundary>
        </div>
      </main>
    </div>
  );
}
