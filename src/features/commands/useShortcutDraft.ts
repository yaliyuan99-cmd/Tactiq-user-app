import { useCallback, useState } from 'react';
import { type ShortcutActionId, type ShortcutMapping, type ShortcutToken } from '@/domain/commands';
import type { CommandMapping } from '@/domain/models';
import { useCommandMapping } from '@/services/ServicesProvider';
import type { CommandMappingService } from '@/services/commands/types';
import {
  applyChoice,
  canRestoreDefaults,
  diffShortcuts,
  normaliseDraft,
  resolveDraft,
  type ShortcutChange,
} from './shortcutDraft';

export interface SaveOutcome {
  readonly mapping: CommandMapping;
  /** False when the browser refused to store the change (private browsing, full storage). */
  readonly persisted: boolean;
}

export interface ShortcutDraftState {
  /** What is saved now. Re-read on every render, so saves from elsewhere show up. */
  readonly saved: CommandMapping;
  /** What the editor shows: the draft, or the saved mapping when there is no draft. */
  readonly current: ShortcutMapping;
  readonly changes: readonly ShortcutChange[];
  readonly dirty: boolean;
  readonly canRestore: boolean;
  readonly choose: (token: ShortcutToken, action: ShortcutActionId) => void;
  readonly discard: () => void;
  /** Saves the draft through the command mapping service. Throws if the service rejects it. */
  readonly save: () => SaveOutcome;
  readonly restoreDefaults: () => SaveOutcome;
}

/** The local service reports failed writes; the shared contract does not require it. */
function lastWriteSucceeded(service: CommandMappingService): boolean {
  const candidate = service as CommandMappingService & { lastWriteSucceeded?: unknown };
  return typeof candidate.lastWriteSucceeded === 'function' ? candidate.lastWriteSucceeded() !== false : true;
}

/** Draft shortcut choices, kept apart from the saved mapping until the user saves. */
export function useShortcutDraft(): ShortcutDraftState {
  const service = useCommandMapping();
  const saved = service.get();
  const [draft, setDraft] = useState<ShortcutMapping | null>(null);

  const current = resolveDraft(saved.shortcuts, draft);
  const changes = diffShortcuts(saved.shortcuts, draft);

  const choose = useCallback(
    (token: ShortcutToken, action: ShortcutActionId) => {
      setDraft((previous) => {
        const base = service.get().shortcuts;
        return normaliseDraft(base, applyChoice(resolveDraft(base, previous), token, action));
      });
    },
    [service],
  );

  const discard = useCallback(() => setDraft(null), []);

  const save = (): SaveOutcome => {
    const mapping = service.set(current);
    setDraft(null);
    return { mapping, persisted: lastWriteSucceeded(service) };
  };

  const restoreDefaults = (): SaveOutcome => {
    const mapping = service.restoreDefaults();
    setDraft(null);
    return { mapping, persisted: lastWriteSucceeded(service) };
  };

  return {
    saved,
    current,
    changes,
    dirty: changes.length > 0,
    canRestore: canRestoreDefaults(saved.shortcuts, draft),
    choose,
    discard,
    save,
    restoreDefaults,
  };
}
