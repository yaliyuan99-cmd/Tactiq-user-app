/**
 * Routes each ring result for the current mode: guided results are judged
 * (and saved with the target command and contact), every result is saved to
 * activity history and added to the session log, and free practice remembers
 * the last command for "What would happen".
 */
import { useCallback, useState } from 'react';
import type { CommandToken, ShortcutMapping } from '@/domain/commands';
import type { RingResult } from '@/features/practice/ringResults';
import { useRecordResult } from '@/features/practice/useRecordResult';
import { contactForTarget } from './guided';
import { addLogEntry, freeResultWords, logEntryFor, type SessionLogEntry } from './sessionLog';
import type { SimulatorMode } from './simulatorMode';
import type { GuidedPractice } from './useGuidedPractice';

export interface SimulatorSession {
  /** Newest first, at most eight. */
  readonly log: readonly SessionLogEntry[];
  /** The last command recognised in free practice (Emergency included), or null. */
  readonly lastCommand: CommandToken | null;
  /** Pass to useRing's onResult. */
  readonly onResult: (result: RingResult) => void;
  /** Empties the session log only; activity history is untouched. */
  readonly clearLog: () => void;
}

export interface UseSimulatorSessionOptions {
  readonly mode: SimulatorMode;
  readonly guided: Pick<GuidedPractice, 'handleResult'>;
  readonly mapping: ShortcutMapping;
}

export function useSimulatorSession({ mode, guided, mapping }: UseSimulatorSessionOptions): SimulatorSession {
  const record = useRecordResult();
  const [log, setLog] = useState<readonly SessionLogEntry[]>([]);
  const [lastCommand, setLastCommand] = useState<CommandToken | null>(null);

  const onResult = (result: RingResult) => {
    if (mode === 'guided') {
      const { target, evaluation } = guided.handleResult(result);
      // The target command as well as its contact: the pinky fingertip carries Shortcut 1 and Emergency,
      // so a brief tap there while Emergency is the target is recorded as a mismatch.
      const saved = record(result, {
        source: 'simulator',
        mode: 'guided',
        targetContact: contactForTarget(target),
        targetToken: target,
      });
      setLog((previous) => addLogEntry(previous, logEntryFor(saved, target, evaluation.logWords)));
      return;
    }
    const saved = record(result, { source: 'simulator', mode: 'free' });
    setLog((previous) => addLogEntry(previous, logEntryFor(saved, null, freeResultWords(result, mapping))));
    if (result.kind === 'command') setLastCommand(result.token);
    else if (result.kind === 'emergency') setLastCommand('emergency');
  };

  const clearLog = useCallback(() => setLog([]), []);

  return { log, lastCommand, onResult, clearLog };
}
