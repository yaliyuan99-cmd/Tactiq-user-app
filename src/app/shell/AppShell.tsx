import { Outlet } from 'react-router';
import { RouteErrorBoundary } from '@/app/ErrorBoundary';
import { SkipLink } from '@/components';
import { DemoModeNotice } from './DemoModeNotice';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from './OfflineBanner';
import { Sidebar } from './Sidebar';
import { StorageBanner } from './StorageBanner';
import { TopBar } from './TopBar';
import { useDemoHistorySeed } from './useDemoHistorySeed';

export const MAIN_CONTENT_ID = 'main-content';

/**
 * The signed-in application frame for every /dashboard page.
 *
 * Reading and tab order: skip link → top bar → (lg) sidebar → main → (below lg)
 * bottom bar. Only one "Main" navigation is displayed at a time: the sidebar
 * from lg up, the bottom bar below. Main reserves space for the bottom bar.
 */
export function AppShell() {
  useDemoHistorySeed();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <TopBar />
      <div className="lg:flex">
        <Sidebar />
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="min-w-0 flex-1 pb-24 outline-none lg:pb-0">
          <DemoModeNotice />
          <OfflineBanner />
          <StorageBanner />
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
            <RouteErrorBoundary variant="section">
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
