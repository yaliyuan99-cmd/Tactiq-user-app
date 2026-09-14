import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, PageHeader, TextField } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/services/auth/AuthProvider';
import { DISPLAY_NAME_MAX_LENGTH, toAuthError } from '@/services/auth/validation';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { AuthLayout } from './AuthLayout';
import { DemoModeNote, FormMessage, TextLink } from './AuthParts';
import {
  fieldForAuthError,
  firstInvalidField,
  isConfirmEmailNotice,
  PASSWORD_MIN_LENGTH,
  SIGN_UP_FIELDS,
  validateSignUp,
  type FieldErrors,
  type SignUpField,
} from './formValidation';
import { PasswordField } from './PasswordField';
import { useFocusRequest } from './useFocusRequest';

export default function SignUpPage() {
  const { mode, signUp } = useAuth();
  const demo = mode === 'demo';
  const title = demo ? 'Create your profile' : 'Create your account';
  usePageTitle(title);
  const { announce } = useFeedback();
  const navigate = useNavigate();

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };
  const alertRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const requestFocus = useFocusRequest();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const found = validateSignUp(values, mode);
    setErrors(found);
    setFormError(null);
    const firstInvalid = firstInvalidField(SIGN_UP_FIELDS, found);
    if (firstInvalid) {
      requestFocus(fieldRefs[firstInvalid]);
      return;
    }
    setPending(true);
    try {
      const input = { email: values.email, displayName: values.name };
      await signUp(demo ? input : { ...input, password: values.password });
      announce(demo ? 'Profile created.' : 'Account created.');
      navigate(ROUTES.onboarding, { replace: true });
    } catch (error) {
      const authError = toAuthError(error);
      setPending(false);
      if (isConfirmEmailNotice(authError)) {
        setNotice(authError.message);
        requestFocus(noticeRef);
        return;
      }
      const field = fieldForAuthError(authError);
      if (field && !(field === 'password' && demo)) {
        setErrors({ [field]: authError.message });
        requestFocus(fieldRefs[field]);
        return;
      }
      setFormError(authError.message);
      requestFocus(alertRef);
    }
  };

  const update = (field: SignUpField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  if (notice) {
    return (
      <AuthLayout>
        <PageHeader title={title} />
        <FormMessage ref={noticeRef} tone="success" title="One more step" message={notice} className="mb-6" />
        <ButtonLink to={ROUTES.signIn} fullWidth>
          Go to sign in
        </ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <PageHeader
        title={title}
        lede={
          demo
            ? 'A profile lets you use the app in this browser. Your settings and practice stay on this device.'
            : 'An account lets you sign in with a password. Your settings and practice stay on this device.'
        }
      />

      {demo && <DemoModeNote className="mb-6" />}

      <FormMessage ref={alertRef} tone="error" message={formError} className="mb-6" />

      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <TextField
          ref={fieldRefs.name}
          label="Name"
          hint={`What the app calls you. Up to ${DISPLAY_NAME_MAX_LENGTH} characters.`}
          name="name"
          autoComplete="name"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          required
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          ref={fieldRefs.email}
          label="Email"
          hint={demo ? 'Used only to find your profile in this browser. Nothing is sent.' : undefined}
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={values.email}
          error={errors.email}
          onChange={(event) => update('email', event.target.value)}
        />
        {!demo && (
          <>
            <PasswordField
              ref={fieldRefs.password}
              label="Password"
              hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
              name="password"
              autoComplete="new-password"
              required
              value={values.password}
              error={errors.password}
              onChange={(event) => update('password', event.target.value)}
            />
            <PasswordField
              ref={fieldRefs.confirm}
              label="Confirm password"
              toggleLabel="Show password confirmation"
              name="confirm-password"
              autoComplete="new-password"
              required
              value={values.confirm}
              error={errors.confirm}
              onChange={(event) => update('confirm', event.target.value)}
            />
          </>
        )}
        <Button type="submit" fullWidth busy={pending}>
          {demo ? 'Create profile' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6">
        {demo ? 'Already have a profile?' : 'Already have an account?'} <TextLink to={ROUTES.signIn}>Sign in</TextLink>
      </p>
    </AuthLayout>
  );
}
