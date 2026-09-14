import { type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export interface DashboardLinkProps {
  readonly to: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** A section's text link: underlined, accent ink, 44px target, with a decorative arrow. */
export function DashboardLink({ to, children, className }: DashboardLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'target-44 inline-flex items-center gap-1.5 font-medium text-primary-strong underline decoration-1 underline-offset-2 hover:decoration-2',
        className,
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
