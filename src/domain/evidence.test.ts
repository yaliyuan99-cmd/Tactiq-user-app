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
