import { CircleHelp } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { cn } from '@/lib/cn';
import { navCurrent } from './navItems';
import { useNavPathname, useShellSection } from './ShellSection';

/** "Help" in the top bar: icon and text from the sm breakpoint, icon with the same accessible name below it. */
export function HelpLink({ className }: { readonly className?: string }) {
  const pathname = useNavPathname();
  const { path } = useShellSection();
  const current = navCurrent(ROUTES.help, pathname, true);
  return (
    <Link
      to={path(ROUTES.help)}
      aria-current={current}
      className={cn(
        'target-44 inline-flex items-center justify-center gap-1.5 rounded-md px-2 font-medium text-foreground no-underline hover:bg-secondary',
        current && 'underline decoration-2 underline-offset-4',
        className,
      )}
    >
      <CircleHelp className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Help</span>
    </Link>
  );
}
