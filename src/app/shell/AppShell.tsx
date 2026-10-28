import { Outlet } from 'react-router';
import { RouteErrorBoundary } from '@/app/ErrorBoundary';
import { useMarkDemoSession } from '@/app/routing/DemoSession';
import type { SectionId } from '@/app/routing/sections';
import { SkipLink } from '@/components';
import { MobileNav } from './MobileNav';
import { ModeBar } from './ModeBar';
import { OfflineBanner } from './OfflineBanner';
import { ShellSectionProvider } from './ShellSection';
import { Sidebar } from './Sidebar';
import { StorageBanner } from './StorageBanner';
import { TopBar } from './TopBar';

export const MAIN_CONTENT_ID = 'main-content';

export interface AppShellProps {
  /**
   * 'account' for the signed-in app under /dashboard, 'demo' for the guest
   * demonstration under /demo. The same screens, labelled honestly.
   */
  readonly section?: SectionId;
}

/**
 * The application frame for every account screen.
 *
 * Reading and tab order: skip link → top bar → (lg) sidebar → mode bar → main
 * → (below lg) bottom bar. Only one "Main" navigation is displayed at a time:
 * the sidebar from lg up, the bottom bar below. Main reserves space for the
 * bottom bar.
 *
 * The mode bar states once, for the whole app, what is simulated; no page or
 * card repeats it.
 */
export function AppShell({ section = 'account' }: AppShellProps) {
  useMarkDemoSession(section === 'demo');
  return (
    <ShellSectionProvider id={section}>
      <div className="min-h-dvh bg-background text-foreground">
        <SkipLink targetId={MAIN_CONTENT_ID} />
        <TopBar />
        <div className="lg:flex">
          <Sidebar />
          <main id={MAIN_CONTENT_ID} tabIndex={-1} className="min-w-0 flex-1 pb-24 outline-none lg:pb-0">
            <ModeBar />
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
    </ShellSectionProvider>
  );
}
