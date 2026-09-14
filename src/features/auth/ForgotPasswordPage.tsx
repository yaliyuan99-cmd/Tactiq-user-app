import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, PageHeader, TextField } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/services/auth/AuthProvider';
import { toAuthError } from '@/services/auth/validation';
import { AuthLayout } from './AuthLayout';
import { DemoModeNote, FormMessage, TextLink } from './AuthParts';
import { emailError } from './formValidation';
import { useFocusRequest } from './useFocusRequest';

const TITLE = 'Reset your password';

/** Demo Mode has no passwords: explain that, using the service's own words, and offer what works instead. */
function DemoReset() {
  const { requestPasswordReset } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const headingId = `forgot-email-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    let active = true;
    requestPasswordReset('').then(
      (result) => {
        if (active) setMessage(result.message);
      },
      (error: unknown) => {
        if (active) setMessage(toAuthError(error).message);
      },
    );
    return () => {
      active = false;
    };
  }, [requestPasswordReset]);

  return (
    <>
      <PageHeader title={TITLE} lede={message} />
      <div className="space-y-3">
        <ButtonLink to={ROUTES.signIn} fullWidth>
          Sign in with your email
        </ButtonLink>
        <ButtonLink to={ROUTES.signUp} variant="secondary" fullWidth>
          Create a new profile
        </ButtonLink>
      </div>

      <section aria-labelledby={headingId} className="mt-8">
        <h2 id={headingId}>If you cannot remember your email</h2>
        <p className="mt-2">
          Demo Mode finds a profile by its email alone. If you have forgotten which email you used, create a new profile,
          or choose Continue as a guest on the sign-in page. Nothing stored in this browser is removed when you do.
        </p>
      </section>

      <DemoModeNote className="mt-8" />
    </>
  );
}

function SupabaseReset() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const requestFocus = useFocusRequest();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const invalid = emailError(email);
    setFieldError(invalid);
    setFormError(null);
    setSent(null);
    if (invalid) {
      requestFocus(emailRef);
      return;
    }
    setPending(true);
    try {
      const result = await requestPasswordReset(email);
      setSent(result.message);
    } catch (error) {
      const authError = toAuthError(error);
      if (authError.code === 'invalid_email') {
        setFieldError(authError.message);
        requestFocus(emailRef);
      } else {
        setFormError(authError.message);
        requestFocus(alertRef);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        title={TITLE}
        lede="Enter the email for your account and we will send a link to choose a new password."
      />
      <FormMessage ref={alertRef} tone="error" message={formError} className="mb-6" />
      <FormMessage tone="success" title="Request received" message={sent} className="mb-6" />

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
          error={fieldError}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(undefined);
          }}
        />
        <Button type="submit" fullWidth busy={pending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6">
        Remembered it? <TextLink to={ROUTES.signIn}>Back to sign in</TextLink>
      </p>
    </>
  );
}

export default function ForgotPasswordPage() {
  usePageTitle(TITLE);
  const { mode } = useAuth();
  return <AuthLayout>{mode === 'demo' ? <DemoReset /> : <SupabaseReset />}</AuthLayout>;
}
