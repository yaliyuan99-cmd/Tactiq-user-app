import { COMMANDS, SHORTCUT_ACTIONS, getCommand, getShortcutAction } from './commands';
import { hapticPhrase } from './haptics';

describe('command labels', () => {
  it('gives every command a spoken label with no slash for a screen reader to read out', () => {
    for (const command of COMMANDS) {
      expect(command.spokenLabel).not.toMatch(/[/]/);
      expect(command.spokenLabel.length).toBeGreaterThan(0);
    }
    expect(getCommand('back').spokenLabel).toBe('Dismiss or Back');
    expect(getCommand('read').spokenLabel).toBe('Read or Repeat');
    expect(getCommand('confirm').spokenLabel).toBe(getCommand('confirm').label);
  });
});

describe('command feedback', () => {
  it('describes each command’s haptic with the shared wording for its haptic class', () => {
    for (const command of COMMANDS) {
      expect(command.feedback.haptic.toLowerCase()).toContain(hapticPhrase(command.hapticClass));
    }
    expect(getCommand('confirm').feedback.haptic).toBe('One firm click when a command is accepted. This is the “confirm” haptic class.');
  });

  it('quotes no haptic duration, because the research material fixes none', () => {
    for (const command of COMMANDS) {
      expect(command.feedback.haptic).not.toMatch(/\d/);
    }
    expect(getCommand('emergency').feedback.haptic).toBe(
      'A distinct arming pulse at two seconds, then a long alert when the hold reaches five seconds. Releasing early cancels with no pulse.',
    );
  });
});

describe('shortcut actions', () => {
  it('says torch, not flashlight, in every piece of copy', () => {
    for (const action of SHORTCUT_ACTIONS) {
      expect(`${action.label} ${action.description} ${action.simulatedOutcome}`).not.toMatch(/flashlight/i);
    }
    expect(getShortcutAction('toggle_flashlight').label).toBe('Turn the torch on or off');
    expect(getShortcutAction('toggle_flashlight').simulatedOutcome).toBe('Torch on.');
  });
});
