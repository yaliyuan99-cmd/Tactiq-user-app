import { useId, useState } from 'react';
import { ChevronRight, Ellipsis } from 'lucide-react';
import { Link } from 'react-router';
import { Button, Dialog } from '@/components';
import { cn } from '@/lib/cn';
import { AccountAction, accountRegionLabel, AccountSummary } from './AccountControls';
import { HELP_NAV_ITEM, navCurrent, PRIMARY_NAV_ITEMS, type NavItem } from './navItems';
import { useNavPathname, useShellSection } from './ShellSection';
import { ThemeSwitcher } from './ThemeSwitcher';

function MenuLink({ item, baseId, onNavigate }: { item: NavItem; baseId: string; onNavigate: () => void }) {
  const pathname = useNavPathname();
  const { path } = useShellSection();
  const current = navCurrent(item.to, pathname, item.exact);
  const labelId = `${baseId}-${item.id}-label`;
  const descriptionId = `${baseId}-${item.id}-description`;
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={path(item.to)}
        aria-current={current}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onClick={onNavigate}
        className={cn(
          'flex min-h-12 items-center gap-3 rounded-md px-3 py-2 text-foreground no-underline hover:bg-secondary',
          current && 'bg-secondary',
        )}
      >
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id={labelId} className={cn('block', current ? 'font-semibold' : 'font-medium')}>
            {item.label}
          </span>
          <span id={descriptionId} className="block text-sm text-muted-foreground">
            {item.description}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * Below lg: a "More" button opening everything the five-destination bottom bar
 * cannot hold — the pages grouped under Practice and Device, Help, the theme
 * and the account. Grouped in the same order as the desktop sidebar, so the
 * two navigations teach the same shape. The dialog traps and restores focus.
 */
export function MoreMenu({ className }: { readonly className?: string }) {
  const [open, setOpen] = useState(false);
  const section = useShellSection();
  const baseId = `more-${useId().replace(/:/g, '')}`;
  const close = () => setOpen(false);
  const groups = PRIMARY_NAV_ITEMS.filter((item) => item.children && item.children.length > 0);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        leadingIcon={<Ellipsis className="h-5 w-5" />}
        onClick={() => setOpen(true)}
        className={cn('px-2!', className)}
      >
        <span className="sr-only sm:not-sr-only">More</span>
      </Button>
      <Dialog open={open} onClose={close} title="More" size="sm">
        <nav aria-label="More destinations" className="grid gap-4">
          {groups.map((group) => {
            const groupLabelId = `${baseId}-${group.id}-group`;
            return (
              <div key={group.id}>
                <p id={groupLabelId} className="font-mono-label mb-1 px-3 text-muted-foreground">
                  {group.label}
                </p>
                <ul aria-labelledby={groupLabelId} className="grid gap-1">
                  {group.children?.map((child) => (
                    <MenuLink key={child.id} item={child} baseId={baseId} onNavigate={close} />
                  ))}
                </ul>
              </div>
            );
          })}
          <ul className="grid gap-1 border-t border-border pt-4">
            <MenuLink item={HELP_NAV_ITEM} baseId={baseId} onNavigate={close} />
          </ul>
        </nav>
        <div className="mt-5 border-t border-border pt-5">
          <ThemeSwitcher />
        </div>
        <section aria-label={accountRegionLabel(section.id)} className="mt-5 grid gap-4 border-t border-border pt-5">
          <AccountSummary />
          <AccountAction />
        </section>
      </Dialog>
    </>
  );
}
