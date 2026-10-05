import { ROUTES } from '@/app/routes';
import { Logo } from '@/components';
import { DeviceStatusLink } from './DeviceStatusLink';
import { HelpLink } from './HelpLink';
import { MoreMenu } from './MoreMenu';

/**
 * Top bar (sticky from sm up): logo, device state, Help on every screen and,
 * below lg, the More menu.
 *
 * Its height is --app-top-bar-height (see src/design-system/theme.css), which
 * is also the scroll padding that keeps a focused control from ending up
 * behind this bar.
 */
export function TopBar() {
  return (
    <header className="z-30 border-b border-border bg-background sm:sticky sm:top-0">
      <div className="flex min-h-[var(--app-top-bar-height)] flex-wrap items-center gap-x-1 gap-y-1 px-3 py-1.5 sm:gap-x-2 sm:px-6 lg:h-[var(--app-top-bar-height)] lg:flex-nowrap lg:py-0">
        {/* The wordmark steps down a size below sm so the bar fits on one line at 320 px. */}
        <Logo
          to={ROUTES.dashboard}
          className="[&>span]:text-base [&>svg]:h-4 [&>svg]:w-4 sm:[&>span]:text-xl sm:[&>svg]:h-5 sm:[&>svg]:w-5"
        />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-0.5 sm:gap-x-2">
          <DeviceStatusLink />
          <HelpLink />
          <MoreMenu className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
