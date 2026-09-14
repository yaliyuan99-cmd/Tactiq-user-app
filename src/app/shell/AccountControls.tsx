import { CircleAlert, LogOut } from 'lucide-react';
import { Button } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';
import { useSignOut } from './useSignOut';

/** "Signed in as <name>", with a note when the profile only lives in this browser. */
export function SignedInAs() {
  const { user, mode } = useAuth();
  if (!user) return null;
  return (
    <p className="min-w-0">
      <span className="font-mono-label block text-muted-foreground">Signed in as</span>
      <span className="block break-words font-medium">{user.displayName}</span>
      {mode === 'demo' && <span className="block text-sm text-muted-foreground">Local profile in this browser</span>}
    </p>
  );
}

/** Sign out, then go to sign-in. Shows a message if sign-out fails. */
export function SignOutButton() {
  const { signOut, pending, error } = useSignOut();
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
