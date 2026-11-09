/**
 * `/` — the public product homepage, reachable signed out and signed in.
 *
 * It draws its own frame (skip link, banner, main landmark, footer), so the
 * shell registers it outside PublicLayout: that keeps exactly one main
 * landmark, one skip link and one h1 on the page.
 *
 * Import boundary. This module graph reaches only `@/domain`,
 * `@/components`, `@/components/product`, `@/app/routes`,
 * `@/app/publicRoutes`, `@/lib`, and the two context hooks the app already
 * loads before any route renders (auth, for the signed-in banner action, and
 * preferences, for which hand the drawings mirror to). It does not reach the
 * dashboard, the device or Bluetooth layer, the history services or the
 * simulator. Everything below the hero is a separate chunk (HomeBody).
 */
import { Suspense, lazy } from 'react';
import { SkipLink } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { HeroSection } from './HeroSection';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';

const HomeBody = lazy(() => import('./HomeBody'));

export default function HomePage() {
  usePageTitle('');
  return (
    <div className="notebook logbook-page flex min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 outline-none">
        <HeroSection />
        <Suspense
          fallback={
            <p role="status" className="border-t border-border px-4 py-16 text-center text-muted-foreground">
              Loading the rest of this page…
            </p>
          }
        >
          <HomeBody />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
