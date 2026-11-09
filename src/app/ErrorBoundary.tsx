/**
 * Catches render errors so a crash never leaves a blank screen.
 *
 * - variant "section": inside a layout's main landmark; navigation stays usable.
 * - variant "page": nothing else is on screen; renders its own main landmark.
 *
 * The boundary resets when `resetKey` changes (RouteErrorBoundary passes the
 * pathname), so "Go to the dashboard" or any nav link recovers.
 */
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { RotateCcw } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Logo, PAGE_TITLE_ID, PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';

export type ErrorBoundaryVariant = 'page' | 'section';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly variant?: ErrorBoundaryVariant;
  /** When this changes after an error, the boundary tries its children again. */
  readonly resetKey?: string;
  /** Called with the error, e.g. for reporting. Optional. */
  readonly onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : 'An unknown error occurred.');
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(toError(error), info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // Only reset an error that was already showing, not one raised in this very update.
    if (prevState.error !== null && this.state.error !== null && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error) return <ErrorFallback error={error} variant={this.props.variant ?? 'page'} />;
    return this.props.children;
  }
}

/** ErrorBoundary that resets when the route's pathname changes. Must be inside a router. */
export function RouteErrorBoundary({ children, variant }: Omit<ErrorBoundaryProps, 'resetKey'>) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname} variant={variant ?? 'page'}>
      {children}
    </ErrorBoundary>
  );
}

export const ERROR_TITLE = 'Something went wrong';

function ErrorFallback({ error, variant }: { error: Error; variant: ErrorBoundaryVariant }) {
  usePageTitle(ERROR_TITLE);

  useEffect(() => {
    // Focus was on something that no longer exists; put it on the explanation.
    document.getElementById(PAGE_TITLE_ID)?.focus();
  }, []);

  const content = (
    <>
      <PageHeader
        title={ERROR_TITLE}
        lede="This screen hit an unexpected problem and could not be shown. Your preferences and activity stay saved in this browser."
      />
      <div className="flex flex-wrap gap-3">
        <Button leadingIcon={<RotateCcw className="h-5 w-5" />} onClick={() => window.location.reload()}>
          Reload the app
        </Button>
        <ButtonLink to={ROUTES.dashboard} variant="secondary">
          Go to the dashboard
        </ButtonLink>
      </div>
      <details className="mt-8 rounded-lg border-[1.5px] border-foreground bg-card px-4 py-2">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">Technical details</summary>
        <pre className="mb-2 mt-2 whitespace-pre-wrap break-words font-mono text-sm text-foreground">
          {error.message || 'No error message was provided.'}
        </pre>
      </details>
    </>
  );

  if (variant === 'section') return <div className="max-w-3xl">{content}</div>;

  return (
    <div className="notebook flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none sm:px-6">
        <div className="max-w-3xl">{content}</div>
      </main>
    </div>
  );
}
