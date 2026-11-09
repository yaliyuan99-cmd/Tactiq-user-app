import { CircleCheck, Hourglass } from 'lucide-react';
import { Button, ButtonLink, Callout, EvidenceLabel } from '@/components';
import { ROUTES } from '@/app/routes';
import { DEVICE_NAME, PING_COMMAND } from '@/domain/protocol';
import { formatTime } from '@/lib/time';
import { useDevice } from '@/services/device/DeviceProvider';
import { BatteryNotReported, DeviceDetailsList } from '../components/DeviceDetailsList';
import { PING_REPLIED_TEXT, PING_WAITING_TEXT, usePingCheck } from '../usePingCheck';
import { ForgetRingControl } from './ForgetRingControl';

export const HARDWARE_EVIDENCE_DETAIL = 'bench prototype — not a validated device';

/** Shown only while the status is "connected". */
export function ConnectedPanel() {
  const { state, disconnect } = useDevice();
  const { phase, send } = usePingCheck();
  const device = state.device;
  const name = device?.name ?? state.remembered?.name ?? DEVICE_NAME;
  const connectedAt = device?.lastConnectedAt ?? null;

  return (
    <div className="grid gap-5">
      <p>{name} is connected over Bluetooth. Messages from the ring now reach this app.</p>
      <DeviceDetailsList
        items={[
          { term: 'Name', value: name },
          { term: 'Firmware', value: device?.firmwareVersion ?? 'Not reported yet' },
          { term: 'Battery', value: <BatteryNotReported /> },
          {
            term: 'Connected since',
            value: connectedAt ? <time dateTime={connectedAt}>{formatTime(connectedAt)}</time> : 'Not recorded',
          },
          { term: 'Evidence', value: <EvidenceLabel kind="measured" detail={HARDWARE_EVIDENCE_DETAIL} /> },
        ]}
      />

      {state.error && (
        <Callout kind="warning" role="alert" title={state.error.message}>
          {state.error.hint}
        </Callout>
      )}

      <div className="grid gap-2">
        <h3 className="text-base">Check the link</h3>
        <p className="text-muted-foreground">
          Sends {PING_COMMAND} to the ring. The bench firmware answers with a short reply when the link is working.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button onClick={() => void send()}>Send a test ping</Button>
          {phase !== 'idle' && (
            <p className="inline-flex items-center gap-1.5 font-medium" data-testid="ping-result">
              {phase === 'replied' ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-status-confirmed" aria-hidden="true" />
              ) : (
                <Hourglass className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              {phase === 'replied' ? PING_REPLIED_TEXT : PING_WAITING_TEXT}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <ButtonLink to={ROUTES.calibrate} variant="secondary">
          Calibrate
        </ButtonLink>
        <Button variant="secondary" onClick={() => void disconnect()}>
          Disconnect
        </Button>
        <ForgetRingControl name={name} />
      </div>
    </div>
  );
}
