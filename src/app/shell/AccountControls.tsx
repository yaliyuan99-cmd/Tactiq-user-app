import { CircleAlert, LogOut } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink } from '@/components';
import type { SectionId } from '@/app/routing/sections';
import { useAuth } from '@/services/auth/AuthProvider';
import { useShellSection } from './ShellSection';
import { useSignOut } from './useSignOut';

/** Name for the shell region that holds these controls. */
export function accountRegionLabel(section: SectionId): string {
  return section === 'demo' ? 'Demonstration' : 'Account';
}

/**
 * Who the app thinks you are. In the demonstration that is deliberately
 * nobody: it is never dressed up as a signed-in session.
 */
export function AccountSummary() {
  const { user, mode } = useAuth();
  const section = useShellSection();

  if (section.id === 'demo') {
    return (
      <p className="min-w-0">
        <span className="font-mono-label block text-muted-foreground">Signed in as</span>
        <span className="block font-medium">Nobody</span>
        <span className="block text-sm text-muted-foreground">
          A demonstration, not an account. Nothing here is kept for you.
        </span>
      </p>
    );
  }
  if (!user) return null;
  return (
    <p className="min-w-0">
      <span className="font-mono-label block text-muted-foreground">Signed in as</span>
      <span className="block break-words font-medium">{user.displayName}</span>
      {mode === 'demo' && <span className="block text-sm text-muted-foreground">Local profile in this browser</span>}
    </p>
  );
}

/** Sign out (account), or the way to keep your progress (demonstration). */
export function AccountAction() {
  const section = useShellSection();
  const { signOut, pending, error } = useSignOut();

  if (section.id === 'demo') {
    return (
      <div className="grid gap-2">
        <ButtonLink to={ROUTES.signUp} size="sm" fullWidth>
          Create a profile
        </ButtonLink>
        <ButtonLink to={ROUTES.signIn} size="sm" variant="secondary" fullWidth>
          Sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        busy={pending}
        leadingIcon={<LogOut className="h-4 w-4" />}
        onClick={() => {
          void signOut();
        }}
      >
        Sign out
      </Button>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
