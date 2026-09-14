import { Outlet } from 'react-router';
import { RouteErrorBoundary } from '@/app/ErrorBoundary';

/**
 * Frame for the signed-out screens (sign-in, sign-up, forgot and reset
 * password). Those pages draw their own full-screen layout with the logo, so
 * this only supplies the main landmark and an error boundary. Nothing precedes
 * main, so no skip link is needed.
 */
export function BareLayout() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground outline-none">
      <RouteErrorBoundary variant="section">
        <Outlet />
      </RouteErrorBoundary>
    </main>
  );
}
