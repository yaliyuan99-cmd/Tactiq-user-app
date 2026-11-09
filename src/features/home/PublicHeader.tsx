import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { HOME_SECTIONS, homeHash, PUBLIC_ROUTES } from '@/app/publicRoutes';
import { ROUTES } from '@/app/routes';
import { ButtonLink, Logo } from '@/components';
import { cn } from '@/lib/cn';
import { useAuth } from '@/services/auth/AuthProvider';

const TODAY = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

const NAV_LINKS = [
  { label: 'How it works', section: HOME_SECTIONS.howItWorks },
  { label: 'The ring', section: HOME_SECTIONS.ring },
  { label: 'The app', section: HOME_SECTIONS.app },
  { label: 'Research', section: HOME_SECTIONS.research },
] as const;

const NAV_LINK =
  'target-44 inline-flex items-center px-3 py-2 font-medium text-foreground no-underline decoration-[color:var(--primary-strong)] decoration-2 underline-offset-[6px] hover:underline';

/**
 * The public banner. Deliberately not sticky: a fixed bar can leave a focused
 * control obscured (WCAG 2.2, 2.4.11), and the page's own anchors then need no
 * reserved scrollport.
 *
 * The in-page links are hidden below `md`, where they would push the two
 * actions onto a third row; every one of them is repeated in the footer, so
 * nothing becomes unreachable.
 */
export function PublicHeader() {
  const { user, loading } = useAuth();
  return (
    <header>
      <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', 'flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-foreground py-2')}>
        <span className="flex items-baseline gap-2">
          <Logo to={PUBLIC_ROUTES.home} />
          <span className="font-mono-label hidden text-muted-foreground sm:inline">logbook</span>
        </span>
        <nav aria-label="Sections of this page" className="hidden md:ml-4 md:flex md:items-center md:gap-1">
          {NAV_LINKS.map((link) => (
            <a key={link.section} href={homeHash(link.section)} className={NAV_LINK}>
              {link.label}
            </a>
          ))}
        </nav>
        <p className="font-mono-label ml-auto hidden text-muted-foreground lg:block">
          <time dateTime={new Date().toISOString().slice(0, 10)}>{TODAY.format(new Date())}</time>
        </p>
        {!loading && (
          <div className="ml-auto flex flex-wrap items-center gap-2 lg:ml-2">
            {user ? (
              <ButtonLink
                to={ROUTES.dashboard}
                size="sm"
                leadingIcon={<LayoutDashboard className="h-4 w-4" />}
              >
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to={ROUTES.signIn} variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink to={ROUTES.signUp} size="sm" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                  Get started
                </ButtonLink>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
