import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { PRIMARY_NAV_ITEMS, sectionCurrent } from './navItems';
import { useNavPathname, useShellSection } from './ShellSection';

/**
 * Fixed bottom bar below lg: the five primary destinations, icon above a label
 * that is always visible. Everything grouped under them is in the More dialog.
 *
 * Its height is --app-bottom-bar-height (see src/design-system/theme.css),
 * which is also the scroll padding that keeps a focused control from ending up
 * behind this bar.
 */
export function MobileNav() {
  const pathname = useNavPathname();
  const { path } = useShellSection();
  return (
    <nav
      aria-label="Main"
      data-testid="mobile-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const current = sectionCurrent(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.id} className="min-w-0">
              <Link
                to={path(item.to)}
                aria-current={current}
                className={cn(
                  'relative flex min-h-[var(--app-bottom-bar-height)] flex-col items-center justify-center gap-0.5 px-0 py-1.5 text-center text-[length:min(0.75rem,12px)] leading-tight no-underline hyphens-auto break-words',
                  current
                    ? 'font-semibold text-primary-strong before:absolute before:inset-x-3 before:top-0 before:h-1 before:rounded-b-full before:bg-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
