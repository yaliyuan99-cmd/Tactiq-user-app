import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, TextField } from '@/components';
import { useAuth } from '@/services/auth/AuthProvider';
import { DISPLAY_NAME_MAX_LENGTH } from '@/services/auth/validation';
import { useFeedback } from '@/services/feedback/FeedbackProvider';

export const NAME_NOT_SAVED = 'Your name was not saved. Try again in a moment.';

export interface DisplayNameFormProps {
  readonly currentName: string;
}

/** Edit the display name. The service validates it; its message is shown on the field. */
export function DisplayNameForm({ currentName }: DisplayNameFormProps) {
  const { updateProfile } = useAuth();
  const { announce } = useFeedback();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const user = await updateProfile({ displayName: name });
      if (!mounted.current) return;
      setName(user.displayName);
      announce(`Name saved as ${user.displayName}.`);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error && cause.message ? cause.message : NAME_NOT_SAVED);
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="grid max-w-md gap-3">
      <TextField
        label="Display name"
        hint={`Shown in the app. Up to ${DISPLAY_NAME_MAX_LENGTH} characters.`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={error ?? undefined}
        autoComplete="nickname"
      />
      <div>
        <Button type="submit" busy={saving}>
          Save name
        </Button>
      </div>
    </form>
  );
}
