import { useState } from 'react';
import { Bluetooth } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, ConfirmDialog, StatusPill } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { SettingsSection } from '../SettingsSection';
import { useHeadingFocusRequest } from '../useHeadingFocusRequest';

function ForgetRememberedRing({ name, onForgotten }: { name: string; onForgotten: () => void }) {
  const { forget } = useDevice();
  const { announce } = useFeedback();
  const [open, setOpen] = useState(false);

  const confirm = async () => {
    setOpen(false);
    await forget();
    announce(`${name} forgotten.`);
    // The Forget button goes away with the remembered ring; continue from the section heading.
    onForgotten();
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Forget {name}
      </Button>
      <ConfirmDialog
        open={open}
        destructive
        title={`Forget ${name}?`}
        description="To use it again, you would choose it in your browser’s Bluetooth window."
        confirmLabel="Forget ring"
        onCancel={() => setOpen(false)}
        onConfirm={() => void confirm()}
      />
    </>
  );
}

export function DeviceSection() {
  const { state } = useDevice();
  const view = describeDeviceState(state);
  const focusHeading = useHeadingFocusRequest('device');

  return (
    <SettingsSection id="device" intro="The ring this app listens to.">
      <div className="grid gap-3">
        <p>
          <span className="sr-only">Status: </span>
          <StatusPill status={view.kind} label={view.label} />
        </p>
        <p className="max-w-prose">{view.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={ROUTES.connect} variant="secondary" leadingIcon={<Bluetooth className="h-4 w-4" />}>
          Manage connection
        </ButtonLink>
        {state.remembered && <ForgetRememberedRing name={state.remembered.name} onForgotten={focusHeading} />}
      </div>
    </SettingsSection>
  );
}
