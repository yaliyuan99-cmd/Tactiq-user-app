import { describe, expect, it } from 'vitest';
import { applyCommand, INITIAL_PHONE, PHONE_ITEMS } from './tryItModel';

describe('applyCommand', () => {
  it('moves focus and stops at both ends of the list', () => {
    const next = applyCommand(INITIAL_PHONE, 'next', null);
    expect(next.state.focus).toBe(1);
    expect(applyCommand(INITIAL_PHONE, 'previous', null).spoken).toMatch(/Top of list/);
    const last = { ...INITIAL_PHONE, focus: PHONE_ITEMS.length - 1 };
    expect(applyCommand(last, 'next', null).state.focus).toBe(PHONE_ITEMS.length - 1);
  });

  it('opens, reads and closes the focused item', () => {
    const opened = applyCommand(INITIAL_PHONE, 'confirm', null);
    expect(opened.state.open).toBe(0);
    expect(applyCommand(opened.state, 'read', null).spoken).toBe(PHONE_ITEMS[0]?.detail);
    expect(applyCommand(opened.state, 'back', null).state.open).toBeNull();
  });

  it('undo restores the previous state, and says so when there is none', () => {
    const moved = applyCommand(INITIAL_PHONE, 'next', null);
    expect(applyCommand(moved.state, 'undo', INITIAL_PHONE).state).toEqual(INITIAL_PHONE);
    expect(applyCommand(INITIAL_PHONE, 'undo', null).spoken).toBe('Nothing to undo.');
  });

  it('never implies an emergency message was sent', () => {
    expect(applyCommand(INITIAL_PHONE, 'emergency', null).spoken).toMatch(/No emergency message was sent/);
  });
});
