import { useEffect, useRef } from 'react';
import { ROUTES, helpRoute } from '@/app/routes';
import { Card, EvidenceLabel, StatusPill } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { DashboardLink } from './DashboardLink';
import {
  deviceModeText,
  lastConnectionText,
  needsTroubleshooting,
  reportedBatteryPercentage,
  troubleshootingTips,
} from './deviceWording';

export interface DeviceStatusSectionProps {
  readonly now: Date;
  readonly className?: string;
}

/** Announces a change of connection status while the dashboard is open (never on first render). */
function useAnnounceStatusChange(label: string): void {
  const { announce } = useFeedback();
  const previous = useRef(label);
  useEffect(() => {
    if (previous.current === label) return;
    previous.current = label;
    announce(`Ring status: ${label}.`);
  }, [label, announce]);
}

/** "Your ring": connection status, mode, last connection and, when a ring is unreachable, what to try. */
export function DeviceStatusSection({ now, className }: DeviceStatusSectionProps) {
  const { state } = useDevice();
  const view = describeDeviceState(state);
  const battery = reportedBatteryPercentage(state);
  const tips = needsTroubleshooting(state.mode, view.kind) ? troubleshootingTips(view.kind) : [];
  useAnnounceStatusChange(view.label);

  return (
    <Card
      heading="Your ring"
      className={className}
      actions={<DashboardLink to={ROUTES.connect}>Manage connection</DashboardLink>}
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-x-8">
        <div className="grid content-start gap-2">
          <StatusPill status={view.kind} label={view.label} className="justify-self-start" />
          <p>{view.description}</p>
        </div>

        <dl className="grid content-start gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Mode</dt>
          <dd className="font-medium">{deviceModeText(state)}</dd>
          <dt className="mt-2 text-muted-foreground sm:mt-0">Last connection</dt>
          <dd className="font-medium">{lastConnectionText(state, now)}</dd>
          {battery !== null && (
            <>
              <dt className="mt-2 text-muted-foreground sm:mt-0">Battery</dt>
              <dd className="flex flex-wrap items-center gap-x-3 font-medium">
                <span>{`${battery}%`}</span>
                <EvidenceLabel kind={state.device?.evidence === 'measured' ? 'measured' : 'simulated'} />
              </dd>
            </>
          )}
        </dl>

        {tips.length > 0 && (
          <div className="border-t border-border pt-4 md:col-span-2">
            <h3 className="text-base">Things to try</h3>
            <ul className="mt-2 grid gap-3 lg:grid-cols-3 lg:gap-6">
              {tips.map((tip) => (
                <li key={tip} className="border-l-2 border-border-strong pl-3">
                  {tip}
                </li>
              ))}
            </ul>
            <DashboardLink to={helpRoute('troubleshooting')} className="mt-2">
              Read the troubleshooting guide
            </DashboardLink>
          </div>
        )}
      </div>
    </Card>
  );
}
