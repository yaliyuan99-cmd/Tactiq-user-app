import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleAlert, UserX } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import type { SignedOutLocationState } from '@/app/routing/redirects';
import { Button, ConfirmDialog } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';

export const PROFILE_NOT_DELETED = 'The profile was not deleted. Try again in a moment.';

/** Demo Mode: removes the signed-in local profile, then opens sign-in. */
export function DeleteProfileControl({ displayName }: { displayName: string }) {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (cause) {
      setBusy(false);
      setOpen(false);
      setError(cause instanceof Error && cause.message ? cause.message : PROFILE_NOT_DELETED);
      return;
    }
    const state: SignedOutLocationState = { signedOut: true };
    navigate(ROUTES.signIn, { replace: true, state });
  };

  return (
    <>
      <Button variant="ghost" leadingIcon={<UserX className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Delete this profile
      </Button>
      {error && (
        <p role="alert" className="flex basis-full items-start gap-1.5 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      <ConfirmDialog
        open={open}
        destructive
        busy={busy}
        title="Delete this profile?"
        description={`This removes the profile “${displayName}” from this browser and signs you out. Preferences, calibration, lessons and activity stay in this browser; use Delete all local data to remove those too.`}
        confirmLabel="Delete profile"
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
