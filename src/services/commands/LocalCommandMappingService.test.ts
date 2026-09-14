import { DEFAULT_SHORTCUT_MAPPING, type ShortcutMapping } from '@/domain/commands';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { LocalCommandMappingService, SHORTCUTS_ONLY_MESSAGE, isValidShortcutMapping } from './LocalCommandMappingService';
import type { CommandMappingService } from './types';

const NOW = new Date('2026-09-15T04:30:00.000Z');

describe('LocalCommandMappingService', () => {
  let storage: MemoryStorageAdapter;
  let commands: LocalCommandMappingService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    storage = new MemoryStorageAdapter();
    commands = new LocalCommandMappingService(storage);
  });

  afterEach(() => {
    commands.dispose();
    vi.useRealTimers();
  });

  it('returns the defaults, never changed, when nothing is stored', () => {
    expect(commands.get()).toEqual({ version: 1, shortcuts: DEFAULT_SHORTCUT_MAPPING, updatedAt: null });
    expect(commands.isDefault()).toBe(true);
  });

  it('saves both shortcuts with the time of the change', () => {
    const saved = commands.set({ quick_action_1: 'toggle_flashlight', quick_action_2: 'unassigned' });
    expect(saved).toEqual({
      version: 1,
      shortcuts: { quick_action_1: 'toggle_flashlight', quick_action_2: 'unassigned' },
      updatedAt: NOW.toISOString(),
    });
    expect(storage.get(STORAGE_KEYS.commandMapping)).toEqual(saved);
    expect(commands.isDefault()).toBe(false);
    expect(new LocalCommandMappingService(storage).get()).toEqual(saved);
  });

  it.each([
    ['a fixed command', { quick_action_1: 'play_pause', quick_action_2: 'announce_time', confirm: 'play_pause' }],
    ['Emergency', { quick_action_1: 'play_pause', quick_action_2: 'announce_time', emergency: 'unassigned' }],
    ['a missing slot', { quick_action_1: 'play_pause' }],
    ['an unknown action', { quick_action_1: 'call_mum', quick_action_2: 'announce_time' }],
    ['a non-object', null],
  ])('refuses %s', (_label, value) => {
    expect(() => commands.set(value as unknown as ShortcutMapping)).toThrow(SHORTCUTS_ONLY_MESSAGE);
    expect(SHORTCUTS_ONLY_MESSAGE).toBe('Only Shortcut 1 and Shortcut 2 can be changed.');
    expect(commands.get().updatedAt).toBeNull();
  });

  it('restores the defaults', () => {
    commands.set({ quick_action_1: 'open_assistant', quick_action_2: 'start_voice_memo' });
    const restored = commands.restoreDefaults();
    expect(restored).toEqual({ version: 1, shortcuts: DEFAULT_SHORTCUT_MAPPING, updatedAt: NOW.toISOString() });
    expect(commands.isDefault()).toBe(true);
  });

  it('falls back to defaults when stored data is malformed', () => {
    storage.set(STORAGE_KEYS.commandMapping, { version: 1, shortcuts: { quick_action_1: 'nope' }, updatedAt: 'x' });
    expect(commands.get()).toEqual({ version: 1, shortcuts: DEFAULT_SHORTCUT_MAPPING, updatedAt: null });
  });

  it('validates mappings as a pure check', () => {
    expect(isValidShortcutMapping({ quick_action_2: 'play_pause', quick_action_1: 'unassigned' })).toBe(true);
    expect(isValidShortcutMapping([])).toBe(false);
  });

  it('notifies on changes, including outside changes to its key', () => {
    const listener = vi.fn();
    commands.subscribe(listener);
    commands.set({ quick_action_1: 'announce_time', quick_action_2: 'play_pause' });
    commands.restoreDefaults();
    expect(listener).toHaveBeenCalledTimes(2);
    storage.set(STORAGE_KEYS.commandMapping, {
      version: 1,
      shortcuts: { quick_action_1: 'read_notifications', quick_action_2: 'play_pause' },
      updatedAt: NOW.toISOString(),
    });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(commands.get().shortcuts.quick_action_1).toBe('read_notifications');
  });

  it('reports failed writes', () => {
    vi.spyOn(storage, 'set').mockReturnValue(false);
    commands.set({ quick_action_1: 'announce_time', quick_action_2: 'play_pause' });
    expect(commands.lastWriteSucceeded()).toBe(false);
    expect(commands.get().shortcuts.quick_action_1).toBe('announce_time');
  });

  it('exposes lastWriteSucceeded through the CommandMappingService contract', () => {
    const service: CommandMappingService = commands;
    expect(service.lastWriteSucceeded()).toBe(true);

    const set = vi.spyOn(storage, 'set').mockReturnValue(false);
    service.restoreDefaults();
    expect(service.lastWriteSucceeded()).toBe(false);

    set.mockRestore();
    service.set({ quick_action_1: 'unassigned', quick_action_2: 'unassigned' });
    expect(service.lastWriteSucceeded()).toBe(true);
  });
});
