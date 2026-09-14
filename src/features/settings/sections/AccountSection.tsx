import { type ReactNode } from 'react';
import { CircleAlert, LogOut } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useSignOut } from '@/app/shell/useSignOut';
import { Button, ButtonLink } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';
import { GUEST_EMAIL } from '@/services/auth/LocalDemoAuthService';
import { SUPABASE_MESSAGES } from '@/services/auth/supabaseErrors';
import { SettingsDivider, SettingsSection } from '../SettingsSection';
import { DeleteProfileControl } from './DeleteProfileControl';
import { DisplayNameForm } from './DisplayNameForm';

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <dt className="font-mono-label min-w-32 text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function SignOutControl() {
  const { signOut, pending, error } = useSignOut();
  return (
    <>
      <Button variant="secondary" busy={pending} leadingIcon={<LogOut className="h-4 w-4" />} onClick={() => void signOut()}>
        Sign out
      </Button>
      {error && (
        <p role="alert" className="flex basis-full items-start gap-1.5 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </>
  );
}

export function AccountSection() {
  const { user, loading, mode } = useAuth();
  const demo = mode === 'demo';

  if (!user) {
    return (
      <SettingsSection id="account">
        {loading ? (
          <p>Checking your profile…</p>
        ) : (
          <div className="grid gap-3">
            <p>You are not signed in.</p>
            <div>
              <ButtonLink to={ROUTES.signIn} variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </div>
        )}
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      id="account"
      intro={
        demo
          ? 'This is a local Demo Mode profile. It lives only in this browser and has no password, so anyone using this browser can open it.'
          : 'You are signed in with an account.'
      }
    >
      <dl className="grid gap-2">
        <DetailRow term="Display name">{user.displayName}</DetailRow>
        <DetailRow term="Email">{user.email === GUEST_EMAIL ? 'None (guest profile)' : user.email}</DetailRow>
      </dl>

      <DisplayNameForm key={user.id} currentName={user.displayName} />

      <SettingsDivider />

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <SignOutControl />
          {demo && <DeleteProfileControl displayName={user.displayName} />}
        </div>
        {!demo && (
          <p className="max-w-prose text-sm text-muted-foreground">
            Account deletion has to be requested from the team running this deployment. {SUPABASE_MESSAGES.deleteUnavailable}
          </p>
        )}
      </div>
    </SettingsSection>
  );
}
