import { useRef, useState, type FormEvent } from 'react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Callout, PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/services/auth/AuthProvider';
import { DEMO_MESSAGES } from '@/services/auth/LocalDemoAuthService';
import type { AuthUser } from '@/services/auth/types';
import { toAuthError } from '@/services/auth/validation';
import { AuthLayout } from './AuthLayout';
import { DemoModeNote, FormMessage, TextLink } from './AuthParts';
import {
  firstInvalidField,
  NEW_PASSWORD_FIELDS,
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
  type FieldErrors,
  type NewPasswordField,
} from './formValidation';
import { PasswordField } from './PasswordField';
import { useFocusRequest } from './useFocusRequest';

const TITLE = 'Choose a new password';

export const RESET_SAVED_MESSAGE = 'Your new password is saved and you are signed in.';

function NewPasswordForm({ user }: { readonly user: AuthUser }) {
  const { completePasswordReset } = useAuth();
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors<NewPasswordField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const fieldRefs = { password: useRef<HTMLInputElement>(null), confirm: useRef<HTMLInputElement>(null) };
  const alertRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const requestFocus = useFocusRequest();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const found = validateNewPassword(values);
    setErrors(found);
    setFormError(null);
    const firstInvalid = firstInvalidField(NEW_PASSWORD_FIELDS, found);
    if (firstInvalid) {
      requestFocus(fieldRefs[firstInvalid]);
      return;
    }
    setPending(true);
    try {
      await completePasswordReset(values.password);
      setPending(false);
      setSaved(true);
      requestFocus(savedRef);
    } catch (error) {
      const authError = toAuthError(error);
      setPending(false);
      if (authError.code === 'weak_password') {
        setErrors({ password: authError.message });
        requestFocus(fieldRefs.password);
      } else {
        setFormError(authError.message);
        requestFocus(alertRef);
      }
    }
  };

  const update = (field: NewPasswordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  if (saved) {
    return (
      <>
        <PageHeader title={TITLE} />
        <FormMessage ref={savedRef} tone="success" title="Password saved" message={RESET_SAVED_MESSAGE} className="mb-6" />
        <ButtonLink to={ROUTES.dashboard} fullWidth>
          Go to your dashboard
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} lede={`Choose a new password for ${user.email}.`} />
      <FormMessage ref={alertRef} tone="error" message={formError} className="mb-6" />
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <PasswordField
          ref={fieldRefs.password}
          label="New password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          name="new-password"
          autoComplete="new-password"
          required
          value={values.password}
          error={errors.password}
          onChange={(event) => update('password', event.target.value)}
        />
        <PasswordField
          ref={fieldRefs.confirm}
          label="Confirm new password"
          toggleLabel="Show password confirmation"
          name="confirm-new-password"
          autoComplete="new-password"
          required
          value={values.confirm}
          error={errors.confirm}
          onChange={(event) => update('confirm', event.target.value)}
        />
        <Button type="submit" fullWidth busy={pending}>
          Save new password
        </Button>
      </form>
    </>
  );
}

function SupabaseReset() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <>
        <PageHeader title={TITLE} />
        <p role="status">Checking your reset link…</p>
      </>
    );
  }
  if (user) return <NewPasswordForm user={user} />;
  return (
    <>
      <PageHeader title={TITLE} />
      <Callout kind="warning" title="This link may have expired" className="mb-6">
        <p>
          No password reset is open in this browser. Reset links work once and only for a limited time, so this one
          may have expired or already been used. Ask for a new link and open it from the latest email.
        </p>
      </Callout>
      <ButtonLink to={ROUTES.forgotPassword} fullWidth>
        Ask for a new reset link
      </ButtonLink>
      <p className="mt-6">
        Remembered your password? <TextLink to={ROUTES.signIn}>Back to sign in</TextLink>
      </p>
    </>
  );
}

function DemoReset() {
  return (
    <>
      <PageHeader title={TITLE} lede={DEMO_MESSAGES.resetNothingToReset} />
      <ButtonLink to={ROUTES.signIn} fullWidth>
        Go to sign in
      </ButtonLink>
      <DemoModeNote className="mt-8" />
    </>
  );
}

export default function ResetPasswordPage() {
  usePageTitle(TITLE);
  const { mode } = useAuth();
  return <AuthLayout>{mode === 'demo' ? <DemoReset /> : <SupabaseReset />}</AuthLayout>;
}
