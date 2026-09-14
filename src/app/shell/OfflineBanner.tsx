import { useEffect, useRef } from 'react';
import { Callout } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { useOnlineStatus } from './useOnlineStatus';

export const OFFLINE_MESSAGE = 'You are offline. Demo Mode keeps working in this browser.';
export const BACK_ONLINE_MESSAGE = 'You are back online.';

/**
 * Shows a note while the browser reports no connection. The change is
 * announced once through the shared live region (the callout itself is not a
 * live region, so nothing is read twice).
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { announce } = useFeedback();
  const previous = useRef(online);

  useEffect(() => {
    if (previous.current === online) return;
    previous.current = online;
    announce(online ? BACK_ONLINE_MESSAGE : OFFLINE_MESSAGE);
  }, [online, announce]);

  if (online) return null;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
      <Callout kind="info">{OFFLINE_MESSAGE}</Callout>
    </div>
  );
}
