import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';

export interface DisclosureProps {
  readonly summary: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * A native details element styled as a card. The summary is the whole
 * 44 px-tall control; the chevron is decoration, and the open state is
 * exposed by the browser, not by the icon.
 */
export function Disclosure({ summary, children, className }: DisclosureProps) {
  const { prefersReducedMotion } = usePreferences();
  return (
    <details className={cn('group rounded-lg border border-border bg-card text-card-foreground shadow-card', className)}>
      <summary
        className={cn(
          'target-44 flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-5 py-3 font-medium',
          'hover:bg-secondary [&::-webkit-details-marker]:hidden',
        )}
      >
        <span>{summary}</span>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-muted-foreground group-open:rotate-180', !prefersReducedMotion && 'transition-transform')}
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}
