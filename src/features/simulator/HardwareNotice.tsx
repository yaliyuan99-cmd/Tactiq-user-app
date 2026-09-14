import { Button, ButtonLink, Callout } from '@/components';
import { ROUTES } from '@/app/routes';

export interface HardwareNoticeProps {
  /** One sentence about the connection, from describeDeviceState. */
  readonly status: string;
  readonly onSwitchToDemo: () => void;
  readonly className?: string;
}

/** Shown in hardware mode while no ring is connected: nothing can arrive until one does. */
export function HardwareNotice({ status, onSwitchToDemo, className }: HardwareNoticeProps) {
  return (
    <Callout kind="info" title="Your ring is not connected" className={className}>
      <p>
        {status} The simulator is set to use a physical ring, so attempts can only arrive from one. Connect your ring, or
        switch to Demo Mode to practise with the simulated ring.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink to={ROUTES.connect} size="sm">
          Connect your ring
        </ButtonLink>
        <Button variant="secondary" size="sm" onClick={onSwitchToDemo}>
          Switch to Demo Mode
        </Button>
      </div>
    </Callout>
  );
}
