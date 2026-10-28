/**
 * Saving practice to activity history. Evidence is never chosen by the
 * caller: it is "simulated" in Demo Mode and "measured" only when a hardware
 * ring is connected.
 *
 * What a record counts towards follows from the context the caller passes:
 * `targetContact` and `targetToken` mark a press as an attempt at something
 * that was asked for, and only those reach an accuracy figure (see
 * `services/history/classify.ts`). A free-practice record passes neither, and
 * `useRecordSqueeze` writes an activation record, which is never an attempt.
 */
import { useCallback } from 'react';
import type { GestureEvent } from '@/domain/models';
import { useDevice } from '@/services/device/DeviceProvider';
import { useServices } from '@/services/ServicesProvider';
import type { RingResult } from './ringResults';
import { evidenceForDevice, squeezeGestureEvent, toGestureEvent, type RecordContext } from './toGestureEvent';

export type RecordResult = (result: RingResult, context: RecordContext) => GestureEvent;
export type RecordSqueeze = (context: RecordContext, at?: number) => GestureEvent;

/**
 * Returns `record(result, context)`, which appends the result to history and
 * returns the saved event. Pass `targetContact` and, whenever the exercise
 * knows the command it asked for, `targetToken` too: a command is recorded as
 * recognised only when it matches both, so a brief pinky tap during an
 * Emergency target is a mismatch rather than a success.
 */
export function useRecordResult(): RecordResult {
  const { history } = useServices();
  const { state } = useDevice();
  const evidence = evidenceForDevice(state);
  return useCallback<RecordResult>(
    (result, context) => history.append(toGestureEvent(result, { ...context, evidence })),
    [history, evidence],
  );
}

/**
 * Returns `recordSqueeze(context)`, for lessons that practise opening the
 * command window. It saves an activation record: no contact, no command, and
 * never counted as a command attempt or a success.
 */
export function useRecordSqueeze(): RecordSqueeze {
  const { history } = useServices();
  const { state } = useDevice();
  const evidence = evidenceForDevice(state);
  return useCallback<RecordSqueeze>(
    (context, at) => history.append(squeezeGestureEvent({ ...context, evidence }, at)),
    [history, evidence],
  );
}
