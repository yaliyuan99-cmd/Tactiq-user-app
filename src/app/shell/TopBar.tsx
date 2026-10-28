import { ROUTES } from '@/app/routes';
import { Logo } from '@/components';
import { HelpLink } from './HelpLink';
import { MoreMenu } from './MoreMenu';

/**
 * Top bar (sticky from sm up): the wordmark, which is the route back to the
 * public site, Help on every screen, and the More menu below lg. The mode and
 * connection state live one row down, in ModeBar, beside the sentence that
 * explains them.
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
          to={ROUTES.root}
          className="[&>span]:text-base [&>svg]:h-4 [&>svg]:w-4 sm:[&>span]:text-xl sm:[&>svg]:h-5 sm:[&>svg]:w-5"
        />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-0.5 sm:gap-x-2">
          <HelpLink />
          <MoreMenu className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
