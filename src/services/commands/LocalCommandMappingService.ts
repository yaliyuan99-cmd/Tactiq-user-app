/**
 * Shortcut assignments kept on this device. Only Shortcut 1 and Shortcut 2
 * can change; the seven fixed commands and Emergency are never stored here,
 * so they cannot be remapped.
 */
import {
  DEFAULT_SHORTCUT_MAPPING,
  SHORTCUT_TOKENS,
  isShortcutActionId,
  type ShortcutMapping,
} from '@/domain/commands';
import type { CommandMapping } from '@/domain/models';
import { nowIso } from '@/lib/time';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { ChangeNotifier, type Unsubscribe } from '@/services/useSubscription';
import type { CommandMappingService } from './types';

export const SHORTCUTS_ONLY_MESSAGE = 'Only Shortcut 1 and Shortcut 2 can be changed.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Exactly the two shortcut keys, each with a known shortcut action. */
export function isValidShortcutMapping(value: unknown): value is ShortcutMapping {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [...SHORTCUT_TOKENS].sort();
  return (
    keys.length === expected.length &&
    keys.every((key, i) => key === expected[i]) &&
    SHORTCUT_TOKENS.every((token) => isShortcutActionId(value[token]))
  );
}

export function defaultCommandMapping(): CommandMapping {
  return { version: 1, shortcuts: { ...DEFAULT_SHORTCUT_MAPPING }, updatedAt: null };
}

function readMapping(raw: unknown): CommandMapping | null {
  if (!isRecord(raw) || !isValidShortcutMapping(raw.shortcuts)) return null;
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
  const { quick_action_1, quick_action_2 } = raw.shortcuts;
  return { version: 1, shortcuts: { quick_action_1, quick_action_2 }, updatedAt };
}

export class LocalCommandMappingService implements CommandMappingService {
  private cache: CommandMapping | null = null;
  private lastWrite = true;
  private readonly notifier: ChangeNotifier;

  constructor(private readonly storage: StorageAdapter) {
    this.notifier = new ChangeNotifier(storage, [STORAGE_KEYS.commandMapping], () => {
      this.cache = null;
    });
  }

  readonly subscribe = (listener: () => void): Unsubscribe => this.notifier.subscribe(listener);

  get(): CommandMapping {
    if (!this.cache) {
      this.cache = readMapping(this.storage.get<unknown>(STORAGE_KEYS.commandMapping)) ?? defaultCommandMapping();
    }
    return this.cache;
  }

  /** Throws when anything other than the two shortcut slots, or an unknown action, is passed. */
  set(shortcuts: ShortcutMapping): CommandMapping {
    if (!isValidShortcutMapping(shortcuts)) throw new Error(SHORTCUTS_ONLY_MESSAGE);
    return this.save({
      version: 1,
      shortcuts: { quick_action_1: shortcuts.quick_action_1, quick_action_2: shortcuts.quick_action_2 },
      updatedAt: nowIso(),
    });
  }

  /** Stores the default assignments, stamped with the time they were restored. */
  restoreDefaults(): CommandMapping {
    return this.save({ ...defaultCommandMapping(), updatedAt: nowIso() });
  }

  isDefault(): boolean {
    const { shortcuts } = this.get();
    return SHORTCUT_TOKENS.every((token) => shortcuts[token] === DEFAULT_SHORTCUT_MAPPING[token]);
  }

  /** Whether the last change was persisted (false in private browsing or when storage is full). */
  lastWriteSucceeded(): boolean {
    return this.lastWrite;
  }

  dispose(): void {
    this.notifier.dispose();
  }

  private save(mapping: CommandMapping): CommandMapping {
    this.lastWrite = this.notifier.quietly(() => this.storage.set(STORAGE_KEYS.commandMapping, mapping));
    this.cache = mapping;
    this.notifier.emit();
    return mapping;
  }
}
