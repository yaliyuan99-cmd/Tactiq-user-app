import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { isDataDeletedLocationState, isSignedOutLocationState, safeNextPath } from '@/app/routing/redirects';
import { Button, Callout, PageHeader, TextField } from '@/components';
import { NEW_PROFILE_SETUP_PATCH } from '@/features/onboarding/onboardingFlow';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/services/auth/AuthProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { toAuthError } from '@/services/auth/validation';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { AuthLayout } from './AuthLayout';
import { DemoModeNote, FormMessage, TextLink } from './AuthParts';
import {
  fieldForAuthError,
  firstInvalidField,
  SIGN_IN_FIELDS,
  validateSignIn,
  type FieldErrors,
  type SignInField,
} from './formValidation';
import { PasswordField } from './PasswordField';
import { useFocusRequest } from './useFocusRequest';

type Pending = 'sign-in' | 'guest' | null;

/** Confirmation after signing out or deleting a profile (both arrive with `{ signedOut: true }`). */
export const SIGNED_OUT_MESSAGE = 'You have signed out.';

/**
 * Confirmation after Settings → "Delete all local data", which arrives with
 * `{ signedOut: true, dataDeleted: true }`. The deletion is the permanent part,
 * so it is named first and in its own words: this never reads like an ordinary
 * sign-out.
 */
export const DATA_DELETED_MESSAGE = 'All Tactiq data in this browser was deleted, and you have signed out.';

export default function SignInPage() {
  usePageTitle('Sign in');
  const { mode, user, signIn, continueAsGuest } = useAuth();
  const { update: updatePreferences } = usePreferences();
  const { announce } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const demo = mode === 'demo';
  const guestHintId = `guest-hint-${useId().replace(/:/g, '')}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<SignInField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [signedOutMessage, setSignedOutMessage] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const requestFocus = useFocusRequest();
  const fieldRefs = { email: emailRef, password: passwordRef };

  // Arriving from a sign-out: show the confirmation, then replace the history entry
  // without the marker so a refresh (or coming Back) does not repeat it. The status
  // region is already on the page, so the message is announced when it appears; the
  // route change itself announces the page title.
  const { pathname, search, hash, state: locationState } = location;
  useEffect(() => {
    if (!isSignedOutLocationState(locationState)) return;
    setSignedOutMessage(isDataDeletedLocationState(locationState) ? DATA_DELETED_MESSAGE : SIGNED_OUT_MESSAGE);
    navigate({ pathname, search, hash }, { replace: true, state: null });
  }, [locationState, pathname, search, hash, navigate]);

  const finish = (message: string) => {
    announce(message);
    navigate(safeNextPath(search), { replace: true });
  };

  const fail = (error: unknown) => {
    const authError = toAuthError(error);
    setPending(null);
    const field = fieldForAuthError(authError);
    if (field === 'email' || (field === 'password' && !demo)) {
      setErrors({ [field]: authError.message });
      requestFocus(fieldRefs[field]);
      return;
    }
    setFormError(authError.message);
    requestFocus(alertRef);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const found = validateSignIn({ email, password }, mode);
    setErrors(found);
    setFormError(null);
    setSignedOutMessage(null);
    const firstInvalid = firstInvalidField(SIGN_IN_FIELDS, found);
    if (firstInvalid) {
      requestFocus(fieldRefs[firstInvalid]);
      return;
    }
    setPending('sign-in');
    try {
      const signedIn = await signIn(demo ? { email } : { email, password });
      finish(`Signed in as ${signedIn.displayName}.`);
    } catch (error) {
      fail(error);
    }
  };

  const handleGuest = async () => {
    if (pending) return;
    setErrors({});
    setFormError(null);
    setSignedOutMessage(null);
    setPending('guest');
    try {
      // Preferences belong to the browser, not the profile, so a guest profile
      // created after someone else finished setup would otherwise inherit their
      // "setup done" and never see onboarding. A returning guest keeps theirs.
      const { created } = await continueAsGuest();
      if (created) updatePreferences(NEW_PROFILE_SETUP_PATCH);
      finish('Signed in as a guest.');
    } catch (error) {
      fail(error);
    }
  };

  const clearError = (field: SignInField) => {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <AuthLayout>
      <PageHeader
        title="Sign in"
        lede={
          demo
            ? 'Enter the email you used for your profile in this browser.'
            : 'Enter the email and password for your Tactiq account.'
        }
      />

      <FormMessage tone="success" message={signedOutMessage} className="mb-6" />

      {user && (
        <Callout kind="info" className="mb-6">
          <p>
            You are already signed in as {user.displayName}. <TextLink to={ROUTES.dashboard}>Go to your dashboard</TextLink>
          </p>
        </Callout>
      )}

      <FormMessage ref={alertRef} tone="error" message={formError} className="mb-6" />

      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <TextField
          ref={emailRef}
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError('email');
          }}
        />
        {!demo && (
          <div>
            <PasswordField
              ref={passwordRef}
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              error={errors.password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError('password');
              }}
            />
            <p>
              <TextLink to={ROUTES.forgotPassword}>Forgot password?</TextLink>
            </p>
          </div>
        )}
        <Button type="submit" fullWidth busy={pending === 'sign-in'}>
          Sign in
        </Button>
      </form>

      {demo && (
        <div className="mt-3">
          <Button
            variant="secondary"
            fullWidth
            busy={pending === 'guest'}
            aria-describedby={guestHintId}
            onClick={handleGuest}
          >
            Continue as a guest
          </Button>
          <p id={guestHintId} className="mt-2 text-sm text-muted-foreground">
            Opens a guest profile in this browser. No email needed.
          </p>
        </div>
      )}

      <p className="mt-6">
        {demo ? 'No profile yet?' : 'No account yet?'}{' '}
        <TextLink to={ROUTES.signUp}>{demo ? 'Create a profile' : 'Create an account'}</TextLink>
      </p>

      {demo && (
        <DemoModeNote className="mt-8">
          <p>
            <TextLink to={ROUTES.forgotPassword}>About passwords in Demo Mode</TextLink>
          </p>
        </DemoModeNote>
      )}
    </AuthLayout>
  );
}
