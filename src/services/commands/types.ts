import type { ShortcutMapping } from '@/domain/commands';
import type { CommandMapping } from '@/domain/models';

export interface CommandMappingService {
  get(): CommandMapping;
  /** Only the two shortcut slots can change; anything else is rejected. */
  set(shortcuts: ShortcutMapping): CommandMapping;
  restoreDefaults(): CommandMapping;
  isDefault(): boolean;
  subscribe(listener: () => void): () => void;
}
