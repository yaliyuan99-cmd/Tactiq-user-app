import { useState } from 'react';
import { Button, ConfirmDialog } from '@/components';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';

export interface ForgetRingControlProps {
  readonly name: string;
  /**
   * Announce the result. Leave off while connected: forgetting then changes
   * the status, and the page already announces that.
   */
  readonly announceResult?: boolean;
}

/** "Forget this ring" with a destructive confirmation. */
export function ForgetRingControl({ name, announceResult = false }: ForgetRingControlProps) {
  const { forget } = useDevice();
  const { announce } = useFeedback();
  const [open, setOpen] = useState(false);

  const confirm = async () => {
    setOpen(false);
    await forget();
    if (announceResult) announce(`${name} forgotten.`);
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Forget this ring
      </Button>
      <ConfirmDialog
        open={open}
        destructive
        title={`Forget ${name}?`}
        description="You will need to choose it again in the Bluetooth window next time."
        confirmLabel="Forget ring"
        onCancel={() => setOpen(false)}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
