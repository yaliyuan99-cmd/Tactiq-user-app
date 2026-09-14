import { useId } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { SignedInAs, SignOutButton } from './AccountControls';
import { navCurrent, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, type NavItem } from './navItems';
import { ThemeSwitcher } from './ThemeSwitcher';

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const current = navCurrent(item.to, pathname, item.exact);
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to}
        aria-current={current}
        className={cn(
          'relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-foreground no-underline hover:bg-secondary',
          current &&
            'bg-secondary font-semibold before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-primary',
        )}
      >
        <Icon
          className={cn('h-5 w-5 shrink-0', current ? 'text-primary-strong' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

/** Desktop (lg and up) navigation column. Hidden below lg, where MobileNav and the More dialog take over. */
export function Sidebar() {
  const { pathname } = useLocation();
  const moreLabelId = `sidebar-more-${useId().replace(/:/g, '')}`;
  return (
    <div
      data-testid="sidebar"
      className="hidden lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-sidebar-border lg:bg-sidebar"
    >
      <nav aria-label="Main" className="flex-1 px-3 py-4">
        <ul className="grid gap-0.5">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.id} item={item} pathname={pathname} />
          ))}
        </ul>
        <p id={moreLabelId} className="font-mono-label mb-1.5 mt-5 px-3 text-muted-foreground">
          More
        </p>
        <ul aria-labelledby={moreLabelId} className="grid gap-0.5">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.id} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>
      <section aria-label="Account" className="grid gap-4 border-t border-sidebar-border px-4 py-4">
        <SignedInAs />
        <ThemeSwitcher />
        <SignOutButton />
      </section>
    </div>
  );
}
