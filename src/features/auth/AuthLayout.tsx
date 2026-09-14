import { type ReactNode } from 'react';
import { HandMap, Logo } from '@/components';

export const AUTH_PROTOTYPE_LINE = 'A student research prototype. No finished ring exists yet.';
export const AUTH_ILLUSTRATION_CAPTION = 'Eight contact points, nine commands.';

/**
 * Split layout for the signed-out screens. Wide screens: a brand panel on the
 * left (logo, the prototype disclaimer, the hand illustration) and the form
 * on the right. Narrow screens: one column with the logo and disclaimer on
 * top, then the form; the illustration moves below the form from md upwards
 * and is hidden below md, so the form always starts near the top.
 *
 * Landmarks come from the app shell, so this renders no <main>. The page's
 * <PageHeader> inside `children` supplies the only h1.
 */
export function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background text-foreground lg:grid-cols-[5fr_7fr] lg:grid-rows-[auto_1fr]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-4 sm:px-6 lg:col-start-1 lg:row-start-1 lg:block lg:border-b-0 lg:border-r lg:bg-card lg:px-10 lg:pt-10">
        <Logo />
        <p className="text-sm text-muted-foreground lg:mt-3 lg:max-w-xs">{AUTH_PROTOTYPE_LINE}</p>
      </div>

      <div className="min-w-0 px-4 py-8 sm:px-6 sm:py-12 lg:col-start-2 lg:row-[1/span_2] lg:flex lg:items-center lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>

      <div className="hidden border-t border-border px-6 py-10 md:block lg:col-start-1 lg:row-start-2 lg:flex lg:items-center lg:border-r lg:border-t-0 lg:bg-card lg:px-10 lg:pb-16">
        <HandMap hand="right" interactive={false} size="sm" caption={AUTH_ILLUSTRATION_CAPTION} />
      </div>
    </div>
  );
}
