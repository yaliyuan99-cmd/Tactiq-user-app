import { useId } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { AccountAction, accountRegionLabel, AccountSummary } from './AccountControls';
import { HELP_NAV_ITEM, navCurrent, PRIMARY_NAV_ITEMS, sectionCurrent, type NavCurrent, type NavItem } from './navItems';
import { useNavPathname, useShellSection } from './ShellSection';
import { ThemeSwitcher } from './ThemeSwitcher';

const LINK =
  'relative flex min-h-11 items-center gap-2.5 rounded-md px-3 py-1.5 no-underline transition-colors duration-[var(--dur-tap)]';
/* Only one text colour is ever set: cn() does not resolve conflicting classes. */
const IDLE = 'text-foreground hover:bg-foreground/[0.05]';
/* The selected row is gone over with highlighter and its words are bold: fill and weight, not hue alone. */
const ACTIVE = 'bg-[var(--highlight)] font-semibold text-[var(--highlight-ink)] hover:bg-[var(--highlight)]';

function SidebarLink({ item, current, nested = false }: { item: NavItem; current: NavCurrent; nested?: boolean }) {
  const { path } = useShellSection();
  const Icon = item.icon;
  return (
    <Link to={path(item.to)} aria-current={current} className={cn(LINK, nested && 'text-[0.95em]', current ? ACTIVE : IDLE)}>
      <Icon
        className={cn(nested ? 'h-4 w-4' : 'h-5 w-5', 'shrink-0', current ? 'text-[var(--highlight-ink)]' : 'text-muted-foreground')}
        aria-hidden="true"
      />
      <span className="min-w-0">{item.label}</span>
    </Link>
  );
}

/**
 * A primary destination with its pages underneath (Practice, Device). The
 * group name is a label rather than a second link to the first child, and it
 * takes the heavier weight while any page inside the group is open, so the
 * current section is visible without relying on colour.
 */
function SidebarGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const labelId = `nav-${item.id}-${useId().replace(/:/g, '')}`;
  const inSection = sectionCurrent(item, pathname) !== undefined;
  return (
    <>
      <p
        id={labelId}
        className={cn(
          'flex items-center gap-2.5 px-3 pb-1',
          inSection ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="font-mono-label">{item.label}</span>
      </p>
      <ul aria-labelledby={labelId} className="grid gap-px">
        {item.children?.map((child) => (
          <li key={child.id}>
            <SidebarLink item={child} current={navCurrent(child.to, pathname, child.exact)} nested />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Desktop (lg and up) navigation column. Hidden below lg, where the bottom bar and More dialog take over. */
export function Sidebar() {
  const pathname = useNavPathname();
  const section = useShellSection();
  return (
    <div
      data-testid="sidebar"
      className="hidden lg:sticky lg:top-[var(--app-top-bar-height)] lg:flex lg:h-[calc(100dvh-var(--app-top-bar-height))] lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r-2 lg:border-[color:var(--margin-rule)] lg:bg-sidebar"
    >
      <nav aria-label="Main" className="flex-1 px-2 py-4">
        <ul className="grid gap-px">
          {PRIMARY_NAV_ITEMS.map((item, index) => {
            // A blank line before and after each group, so the two single
            // destinations under Device sit together rather than drifting apart.
            const previous = PRIMARY_NAV_ITEMS[index - 1];
            const spaced = index > 0 && (Boolean(item.children) || Boolean(previous?.children));
            return (
              <li key={item.id} className={cn(spaced && 'mt-4')}>
                {item.children ? (
                  <SidebarGroup item={item} pathname={pathname} />
                ) : (
                  <SidebarLink item={item} current={sectionCurrent(item, pathname)} />
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 border-t border-sidebar-border pt-3">
          <SidebarLink item={HELP_NAV_ITEM} current={navCurrent(HELP_NAV_ITEM.to, pathname)} />
        </div>
      </nav>
      <section
        aria-label={accountRegionLabel(section.id)}
        className="grid gap-4 border-t border-sidebar-border px-4 py-4"
      >
        <AccountSummary />
        <ThemeSwitcher />
        <AccountAction />
      </section>
    </div>
  );
}
