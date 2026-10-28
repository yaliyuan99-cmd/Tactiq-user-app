import { modeSentence, showsDevicePill } from './modeNote';

describe('modeSentence', () => {
  it('says what a demonstration is, and that nothing is saved to an account', () => {
    const sentence = modeSentence('demo', 'demo');
    expect(sentence).toContain('demonstration');
    expect(sentence).toContain('not saved to an account');
    expect(sentence).toContain('simulated');
  });

  it('names the simulated ring in the account, without claiming a measurement', () => {
    expect(modeSentence('account', 'demo')).toBe('Simulated ring. Nothing in the app is a hardware measurement.');
  });

  it('calls a connected ring an unvalidated bench prototype', () => {
    expect(modeSentence('account', 'connected')).toBe(
      'A bench prototype is connected. Its readings come from unvalidated hardware.',
    );
  });

  it('says the screens are simulated while nothing is connected', () => {
    for (const status of ['disconnected', 'unsupported', 'permission_denied', 'error'] as const) {
      expect(modeSentence('account', status)).toBe('No ring is connected, so everything on screen is simulated.');
    }
  });

  it('says what is on screen while a connection is being made', () => {
    for (const status of ['scanning', 'connecting', 'reconnecting'] as const) {
      expect(modeSentence('account', status)).toContain('everything on screen is simulated');
    }
  });
});

describe('showsDevicePill', () => {
  it('always shows the pill in the account', () => {
    expect(showsDevicePill('account', 'demo')).toBe(true);
    expect(showsDevicePill('account', 'disconnected')).toBe(true);
  });

  it('leaves the simulated-ring pill out of the demonstration, where it would only repeat the badge', () => {
    expect(showsDevicePill('demo', 'demo')).toBe(false);
  });

  it('shows the pill in the demonstration once a prototype is involved', () => {
    expect(showsDevicePill('demo', 'connected')).toBe(true);
    expect(showsDevicePill('demo', 'error')).toBe(true);
  });
});
