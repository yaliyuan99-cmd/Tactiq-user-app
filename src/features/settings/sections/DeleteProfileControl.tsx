import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleAlert, UserX } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import type { SignedOutLocationState } from '@/app/routing/redirects';
import { Button, ConfirmDialog } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';
import { useServices } from '@/services/ServicesProvider';
import { clearScope } from '@/services/storage/scopedStorage';

export const PROFILE_NOT_DELETED = 'The profile was not deleted. Try again in a moment.';

/**
 * Demo Mode: removes the signed-in local profile and everything saved under
 * it, then opens sign-in.
 *
 * The profile's own records go with it. Leaving them would leave practice data
 * in the browser that no profile can open and that no screen can show, which
 * neither the user nor the data export could then account for. What belongs to
 * the browser — appearance settings and the remembered ring — stays.
 */
export function DeleteProfileControl({ displayName }: { displayName: string }) {
  const { deleteAccount, user } = useAuth();
  const { deviceStorage } = useServices();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    // Read before the account goes: afterwards there is no signed-in user to ask.
    const scopeId = user?.id ?? null;
    try {
      await deleteAccount();
    } catch (cause) {
      setBusy(false);
      setOpen(false);
      setError(cause instanceof Error && cause.message ? cause.message : PROFILE_NOT_DELETED);
      return;
    }
    // Only once the profile is really gone, so a failed deletion leaves the data intact.
    if (scopeId) clearScope(deviceStorage, scopeId);
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
        description={`This removes the profile “${displayName}” from this browser, along with its calibration, lessons, shortcuts, activity and its own preferences, then signs you out. This browser's appearance settings and remembered ring stay, as do any other profiles. It cannot be undone.`}
        confirmLabel="Delete profile"
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
