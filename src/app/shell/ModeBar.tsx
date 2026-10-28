import { Eye } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import { DeviceStatusLink } from './DeviceStatusLink';
import { modeSentence, showsDevicePill } from './modeNote';
import { useShellSection } from './ShellSection';

/**
 * One persistent row under the top bar: the current mode as a pill that opens
 * the connection screen, and the single sentence that says what is real.
 *
 * This is the app's only simulation disclaimer. Pages and cards do not repeat
 * it, so a screen reader user hears it once per visit rather than once per
 * card. It is not a live region: the connection screen announces changes.
 */
export function ModeBar() {
  const section = useShellSection();
  const { state } = useDevice();
  const view = describeDeviceState(state);
  const demo = section.id === 'demo';

  return (
    <div className="border-b border-border bg-muted">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:px-6">
        {demo && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-2.5 py-1 text-sm font-medium leading-none">
            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
            Demonstration
          </span>
        )}
        {showsDevicePill(section.id, view.kind) && <DeviceStatusLink />}
        <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">{modeSentence(section.id, view.kind)}</p>
        {demo && (
          <ButtonLink to={ROUTES.signUp} size="sm" variant="secondary" className="shrink-0">
            Create a profile
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
