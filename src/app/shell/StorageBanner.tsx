import { useEffect, useRef } from 'react';
import { Callout } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { useCanPersist } from '@/services/ServicesProvider';
import { WRITES_BLOCKED_NOTE } from '@/services/storage/StorageAdapter';

/**
 * Shows a note while the browser is refusing to save anything — private
 * browsing, a full quota, site data blocked. Reads still work, so the session
 * is usable; what is lost is everything done from now on, which is why this is
 * said once in the shell rather than on the one screen that noticed.
 *
 * The change is announced through the shared live region (the callout itself
 * is not a live region, so nothing is read twice), the same way OfflineBanner
 * does it.
 */
export function StorageBanner() {
  const canPersist = useCanPersist();
  const { announce } = useFeedback();
  const previous = useRef(canPersist);

  useEffect(() => {
    if (previous.current === canPersist) return;
    previous.current = canPersist;
    if (!canPersist) announce(WRITES_BLOCKED_NOTE);
  }, [canPersist, announce]);

  if (canPersist) return null;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
      <Callout kind="warning" title="Changes are not being saved">
        {WRITES_BLOCKED_NOTE}
      </Callout>
    </div>
  );
}
