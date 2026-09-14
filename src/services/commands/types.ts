import type { ShortcutMapping } from '@/domain/commands';
import type { CommandMapping } from '@/domain/models';

export interface CommandMappingService {
  get(): CommandMapping;
  /** Only the two shortcut slots can change; anything else is rejected. */
  set(shortcuts: ShortcutMapping): CommandMapping;
  restoreDefaults(): CommandMapping;
  isDefault(): boolean;
  /**
   * Whether the last change was persisted. False in private browsing or when
   * storage is full: the change still applies for this session, but will not
   * be there after a reload. True before any change has been made.
   */
  lastWriteSucceeded(): boolean;
  subscribe(listener: () => void): () => void;
}
