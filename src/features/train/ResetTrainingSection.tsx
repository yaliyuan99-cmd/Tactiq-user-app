import { useState } from 'react';
import { Link } from 'react-router';
import { RotateCcw } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, ConfirmDialog } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { useServices } from '@/services/ServicesProvider';

const HEADING_ID = 'reset-training-heading';

export const RESET_ANNOUNCEMENT = 'Training progress reset. All five lessons are now Not started.';

/** Clears lesson progress in this browser, after a confirmation. Activity history is left alone. */
export function ResetTrainingSection() {
  const { training } = useServices();
  const { announce } = useFeedback();
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-labelledby={HEADING_ID} className="border-t border-border pt-8">
      <h2 id={HEADING_ID}>Start over</h2>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Resetting clears lesson status, attempts and best accuracy in this browser. Your activity history stays; you can
        manage it on the{' '}
        <Link to={ROUTES.history} className="font-medium text-primary-strong underline">
          History page
        </Link>
        .
      </p>
      <Button
        variant="secondary"
        className="mt-4"
        leadingIcon={<RotateCcw className="h-4 w-4" />}
        onClick={() => setConfirming(true)}
      >
        Reset all training progress
      </Button>
      <ConfirmDialog
        open={confirming}
        destructive
        title="Reset all training progress?"
        description="All five lessons go back to Not started, and their attempts and best accuracy are cleared. This cannot be undone."
        confirmLabel="Reset progress"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          training.resetAll();
          setConfirming(false);
          announce(RESET_ANNOUNCEMENT);
        }}
      />
    </section>
  );
}
