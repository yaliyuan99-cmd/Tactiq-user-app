import { useId, useState } from 'react';
import { ChevronRight, Ellipsis } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { Button, Dialog } from '@/components';
import { cn } from '@/lib/cn';
import { SignedInAs, SignOutButton } from './AccountControls';
import { navCurrent, SECONDARY_NAV_ITEMS } from './navItems';
import { ThemeSwitcher } from './ThemeSwitcher';

/** Below lg: a "More" button that opens the secondary destinations, the theme and sign-out. */
export function MoreMenu({ className }: { readonly className?: string }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const baseId = `more-${useId().replace(/:/g, '')}`;
  const close = () => setOpen(false);

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
        <nav aria-label="More destinations">
          <ul className="grid gap-1">
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const current = navCurrent(item.to, pathname, item.exact);
              const labelId = `${baseId}-${item.id}-label`;
              const descriptionId = `${baseId}-${item.id}-description`;
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    aria-current={current}
                    aria-labelledby={labelId}
                    aria-describedby={descriptionId}
                    onClick={close}
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
            })}
          </ul>
        </nav>
        <div className="mt-5 border-t border-border pt-5">
          <ThemeSwitcher />
        </div>
        <div className="mt-5 grid gap-4 border-t border-border pt-5">
          <SignedInAs />
          <SignOutButton />
        </div>
      </Dialog>
    </>
  );
}
