import { useCallback, useEffect, useRef, useState } from 'react';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { isPongEvent } from './connectLogic';

export type PingPhase = 'idle' | 'waiting' | 'replied';

export const PING_WAITING_TEXT = 'No reply yet';
export const PING_REPLIED_TEXT = 'Ring replied';

export interface PingCheck {
  readonly phase: PingPhase;
  readonly send: () => Promise<void>;
}

/**
 * Sends PING and listens for the ring's `STA,pong` line. It waits without a
 * deadline: "No reply yet" stays accurate however long the reply takes.
 */
export function usePingCheck(): PingCheck {
  const { ping, subscribe } = useDevice();
  const { announce } = useFeedback();
  const [phase, setPhase] = useState<PingPhase>('idle');
  const waiting = useRef(false);

  useEffect(
    () =>
      subscribe((event) => {
        if (!waiting.current || !isPongEvent(event)) return;
        waiting.current = false;
        setPhase('replied');
        announce(`${PING_REPLIED_TEXT}.`);
      }),
    [subscribe, announce],
  );

  const send = useCallback(async () => {
    waiting.current = true;
    setPhase('waiting');
    announce(`Test ping sent. ${PING_WAITING_TEXT}.`);
    await ping();
  }, [ping, announce]);

  return { phase, send };
}
