import { HOME_SECTIONS, homeHash, type HomeSectionId } from '@/app/publicRoutes';
import { ROUTES } from '@/app/routes';
import { Logo } from '@/components';
import { cn } from '@/lib/cn';
import { Link } from 'react-router';
import { FOOTER_NOTE } from './homeContent';
import { EYEBROW, SHELL } from './homeStyles';

const FOOTER_LINK = 'target-44 inline-flex items-center text-foreground underline';

interface LinkGroup {
  readonly id: string;
  readonly title: string;
  readonly links: readonly { readonly label: string; readonly section?: HomeSectionId; readonly to?: string }[];
}

const GROUPS: readonly LinkGroup[] = [
  {
    id: 'page',
    title: 'On this page',
    links: [
      { label: 'How it works', section: HOME_SECTIONS.howItWorks },
      { label: 'The command map', section: HOME_SECTIONS.commands },
      { label: 'The app', section: HOME_SECTIONS.app },
      { label: 'Questions', section: HOME_SECTIONS.questions },
    ],
  },
  {
    id: 'project',
    title: 'Project',
    links: [
      { label: 'Project status', section: HOME_SECTIONS.research },
      { label: 'Privacy', section: HOME_SECTIONS.privacy },
      { label: 'Accessibility', section: HOME_SECTIONS.accessibility },
    ],
  },
  {
    id: 'start',
    title: 'Start',
    links: [
      { label: 'Get started', to: ROUTES.signUp },
      { label: 'Sign in', to: ROUTES.signIn },
    ],
  },
];

/**
 * The footer carries every in-page anchor, including the three the header
 * hides below `md`, so no section of the page is unreachable on a phone.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div
        className={cn(
          SHELL,
          'grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-12',
        )}
      >
        <div className="max-w-prose">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">{FOOTER_NOTE}</p>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.id} aria-labelledby={`footer-${group.id}`}>
            <h2 id={`footer-${group.id}`} className={cn(EYEBROW, 'font-semibold')}>
              {group.title}
            </h2>
            <ul className="mt-2 grid">
              {group.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className={FOOTER_LINK}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={homeHash(link.section ?? HOME_SECTIONS.research)} className={FOOTER_LINK}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
