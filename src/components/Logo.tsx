import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { DotCell } from './DotCell';

export interface LogoProps {
  readonly size?: 'sm' | 'md';
  /** When given, the logo is a link (named "Tactiq home") to this path. */
  readonly to?: string;
  readonly className?: string;
}

export function Logo({ size = 'md', to, className }: LogoProps) {
  const content = (
    <>
      <DotCell size={size === 'sm' ? 16 : 20} className="text-primary" />
      <span className={cn('font-semibold tracking-[-0.035em]', size === 'sm' ? 'text-base' : 'text-xl')}>
        Tactiq
      </span>
    </>
  );

  if (to !== undefined) {
    return (
      <Link
        to={to}
        aria-label="Tactiq home"
        className={cn('target-44 inline-flex items-center gap-2 rounded-md text-foreground no-underline', className)}
      >
        {content}
      </Link>
    );
  }

  return <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>{content}</span>;
}
