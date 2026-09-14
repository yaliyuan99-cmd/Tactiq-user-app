import { Suspense, type ComponentType } from 'react';
import { RouteFocus } from '@/app/shell/RouteFocus';
import { RouteLoading } from './RouteLoading';

export interface RoutePageProps {
  /** Usually a React.lazy page component. */
  readonly page: ComponentType;
}

/**
 * One routed page: its own Suspense boundary with an accessible "Loading…"
 * status, and <RouteFocus/> committed together with the page.
 */
export function RoutePage({ page: Page }: RoutePageProps) {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Page />
      <RouteFocus />
    </Suspense>
  );
}
