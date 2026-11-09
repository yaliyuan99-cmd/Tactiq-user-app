import { useCallback, useState } from 'react';
import type { CommandToken } from '@/domain/commands';
import { applyCommand, INITIAL_PHONE, type PhoneState } from './tryItModel';

export interface PhoneDemo {
  readonly phone: PhoneState;
  /** What the phone's screen reader would say after the last command, or null before the first. */
  readonly spoken: string | null;
  readonly run: (token: CommandToken) => void;
}

/** A pretend phone that follows commands, with one step of undo. */
export function usePhoneDemo(): PhoneDemo {
  const [state, setState] = useState<{ phone: PhoneState; undo: PhoneState | null; spoken: string | null }>({
    phone: INITIAL_PHONE,
    undo: null,
    spoken: null,
  });
  const run = useCallback((token: CommandToken) => {
    setState((current) => {
      const result = applyCommand(current.phone, token, current.undo);
      return { phone: result.state, undo: token === 'undo' ? null : current.phone, spoken: result.spoken };
    });
  }, []);
  return { phone: state.phone, spoken: state.spoken, run };
}
