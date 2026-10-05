import { DESIGN_TARGETS, EMERGENCY_SIMULATION_NOTICE, EVIDENCE } from './evidence';

describe('EVIDENCE', () => {
  it('labels every evidence source', () => {
    expect(Object.fromEntries(Object.entries(EVIDENCE).map(([key, info]) => [key, info.label]))).toEqual({
      simulated: 'Simulated',
      measured: 'Measured',
      design_target: 'Design target',
      design_intent: 'Design intent',
      not_available: 'Not yet available',
    });
  });

  it('describes Measured as early readings from the unvalidated bench prototype', () => {
    expect(EVIDENCE.measured.description).toBe(
      'Recorded from a connected Tactiq bench prototype. The prototype has not been validated, so treat these as early bench readings, not proven performance.',
    );
    expect(EVIDENCE.measured.description).not.toMatch(/Nothing currently holds this status/);
  });

  it('keeps design targets and the emergency notice honest', () => {
    expect(EVIDENCE.design_target.description).toBe('A threshold fixed before testing. Not an achieved result.');
    expect(DESIGN_TARGETS.length).toBeGreaterThan(0);
    expect(EMERGENCY_SIMULATION_NOTICE).toBe('Simulation only — no emergency message was sent.');
  });
});

describe('DESIGN_TARGETS', () => {
  it('holds only thresholds fixed before testing, not firmware placeholders or forecasts', () => {
    expect(DESIGN_TARGETS.map((target) => target.id)).not.toContain('gate_hold');
    for (const target of DESIGN_TARGETS) {
      expect(target.target).not.toMatch(/placeholder|expected to settle/i);
    }
  });

  it('says that this app’s calibration routine takes longer than the 30-second target', () => {
    const calibration = DESIGN_TARGETS.find((target) => target.id === 'calibration_time');
    expect(calibration?.target).toBe(
      'About 30 seconds per user. This app’s practice routine asks for 24 taps and takes longer than the target.',
    );
  });
});
