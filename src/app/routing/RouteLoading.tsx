import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';

export interface RouteLoadingProps {
  /**
   * True when rendered outside any layout (e.g. the dashboard guard before the
   * shell exists): the status is then wrapped in its own main landmark.
   */
  readonly standalone?: boolean;
}

/** The accessible "Loading…" status shown while a page chunk or the session is loading. */
export function RouteLoading({ standalone = false }: RouteLoadingProps) {
  const { prefersReducedMotion } = usePreferences();
  const status = (
    <div className="flex justify-center py-12">
      <p role="status" className="inline-flex items-center gap-2 text-muted-foreground">
        <Loader2 className={cn('h-5 w-5 shrink-0', !prefersReducedMotion && 'animate-spin')} aria-hidden="true" />
        Loading…
      </p>
    </div>
  );
  if (!standalone) return status;
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground outline-none">
      {status}
    </main>
  );
}
