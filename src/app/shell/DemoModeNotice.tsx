import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useDevice } from '@/services/device/DeviceProvider';

export const DEMO_MODE_NOTICE = 'Demo Mode — you are using a simulated ring. Nothing here is a hardware measurement.';

/** One calm line under the top bar while the simulated ring is in use. */
export function DemoModeNotice() {
  const { state } = useDevice();
  if (state.mode !== 'demo') return null;
  return (
    <div className="border-b border-border bg-muted">
      <p className="mx-auto w-full max-w-5xl px-4 py-2 text-sm leading-snug text-foreground sm:px-6">
        <FlaskConical
          className="mr-1.5 inline-block h-4 w-4 shrink-0 align-[-0.2em] text-status-simulation"
          aria-hidden="true"
        />
        {DEMO_MODE_NOTICE}{' '}
        <Link
          to={ROUTES.connect}
          className="-my-2 inline-block whitespace-nowrap py-2 font-medium text-foreground underline decoration-1 underline-offset-2"
        >
          Change<span className="sr-only"> device mode</span>
        </Link>
      </p>
    </div>
  );
}
