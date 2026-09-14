import { Callout } from '@/components';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';

export const EMERGENCY_NOTICE_DETAIL =
  'In the design, the phone would hand over to its own emergency pathway. This app never contacts anyone.';

export interface EmergencyNoticeProps {
  readonly className?: string;
}

/** Shown whenever an emergency hold completes. The wording is fixed and must not be softened or removed. */
export function EmergencyNotice({ className }: EmergencyNoticeProps) {
  return (
    <Callout kind="warning" role="status" title="Simulation only" className={className}>
      <p>{EMERGENCY_SIMULATION_NOTICE}</p>
      <p className="mt-1">{EMERGENCY_NOTICE_DETAIL}</p>
    </Callout>
  );
}
