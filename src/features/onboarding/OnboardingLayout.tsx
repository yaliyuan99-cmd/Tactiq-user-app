import { type ReactNode } from 'react';
import { HelpLink } from '@/app/shell/HelpLink';
import { Button, Logo, SkipLink } from '@/components';
import { SKIP_SETUP_LABEL } from './onboardingCopy';

export interface OnboardingLayoutProps {
  /** Opens the Skip setup confirmation. Omit to hide the button (the last step). */
  readonly onSkipSetup?: () => void;
  readonly children: ReactNode;
}

/**
 * The first-run frame: skip link, a slim banner with the logo, Help and
 * "Skip setup", and the main landmark with a narrow centred column. There is
 * no app navigation here, so setup is one focused task.
 */
export function OnboardingLayout({ onSkipSetup, children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-1 sm:px-6">
          <Logo />
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <HelpLink />
            {onSkipSetup && (
              <Button variant="ghost" size="sm" onClick={onSkipSetup}>
                {SKIP_SETUP_LABEL}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="w-full flex-1 outline-none">
        <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">{children}</div>
      </main>
    </div>
  );
}
