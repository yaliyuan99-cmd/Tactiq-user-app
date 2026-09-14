import { Suspense, type ComponentType } from 'react';
import { RouteFocus } from '@/app/shell/RouteFocus';
import { RouteLoading } from './RouteLoading';

export interface RoutePageProps {
  /** Usually a React.lazy page component. */
  readonly page: ComponentType;
  /**
   * The page draws its own frame, main landmark included (onboarding), so no
   * layout wraps it: the "Loading…" status then gets its own main landmark.
   */
  readonly standalone?: boolean;
}

/**
 * One routed page: its own Suspense boundary with an accessible "Loading…"
 * status, and <RouteFocus/> committed together with the page.
 */
export function RoutePage({ page: Page, standalone = false }: RoutePageProps) {
  return (
    <Suspense fallback={<RouteLoading standalone={standalone} />}>
      <Page />
      <RouteFocus />
    </Suspense>
  );
}
