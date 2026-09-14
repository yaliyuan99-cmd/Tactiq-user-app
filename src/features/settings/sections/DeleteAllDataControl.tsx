import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleAlert, Trash2 } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import type { SignedOutLocationState } from '@/app/routing/redirects';
import { Button, ConfirmDialog } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';
import { useDevice } from '@/services/device/DeviceProvider';
import { useServices } from '@/services/ServicesProvider';

export const DELETE_ALL_PHRASE = 'delete';
export const DELETE_ALL_SIGN_OUT_FAILED =
  'Local data was deleted, but signing out did not finish. Check your connection, then sign out from Account.';

/**
 * Deletes every Tactiq value in this browser, then signs out and opens
 * sign-in. A remembered Bluetooth ring is forgotten first, so the ring
 * connection does not outlive the data.
 */
export function DeleteAllDataControl() {
  const { storage } = useServices();
  const { signOut } = useAuth();
  const { state, forget, setMode } = useDevice();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteEverything = async () => {
    setBusy(true);
    setError(null);
    if (state.mode === 'hardware') {
      await forget();
      setMode('demo');
    }
    let signedOut = true;
    try {
      await signOut();
    } catch {
      signedOut = false;
    }
    storage.clear();
    if (!signedOut) {
      setBusy(false);
      setOpen(false);
      setError(DELETE_ALL_SIGN_OUT_FAILED);
      return;
    }
    // `dataDeleted` lets sign-in say that the local data is gone, not only that the user signed out.
    const locationState: SignedOutLocationState & { readonly dataDeleted: true } = { signedOut: true, dataDeleted: true };
    navigate(ROUTES.signIn, { replace: true, state: locationState });
  };

  return (
    <div className="grid gap-2">
      <div>
        <Button variant="secondary" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Delete all local data
        </Button>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      <ConfirmDialog
        open={open}
        destructive
        busy={busy}
        typeToConfirm={DELETE_ALL_PHRASE}
        title="Delete all local data?"
        description="This permanently removes every Tactiq profile, preference, calibration, lesson record, shortcut and activity record in this browser, then signs you out. It cannot be undone. Download your data first if you want a copy."
        confirmLabel="Delete everything"
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        onConfirm={() => void deleteEverything()}
      />
    </div>
  );
}
