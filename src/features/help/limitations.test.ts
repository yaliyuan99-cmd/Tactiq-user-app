import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';
import { LIMITATIONS } from './limitations';

function allText(): string {
  return LIMITATIONS.map((l) => [l.title, l.detail, l.quote ?? '', l.after ?? ''].join(' ')).join(' ');
}

describe('project limitations', () => {
  it('states each limitation plainly', () => {
    expect(LIMITATIONS.map((l) => l.title)).toEqual([
      'No finished wearable ring exists.',
      'The bench firmware has never run on a finished ring.',
      'No physical performance has been validated.',
      'No result in this app shows how a finished ring would perform.',
      'Design targets are not achievements.',
      'The app never shows a ring battery level.',
      'Shortcuts and Undo depend on the phone.',
      'The Emergency command in this app never contacts anyone.',
      'An iPhone route would be limited.',
    ]);
  });

  it('quotes the emergency notice and the battery note verbatim', () => {
    expect(LIMITATIONS.find((l) => l.id === 'emergency')?.quote).toBe(EMERGENCY_SIMULATION_NOTICE);
    expect(LIMITATIONS.find((l) => l.id === 'battery')?.quote).toBe(BATTERY_UNAVAILABLE_NOTE);
  });

  it('labels simulated results, design targets and the iPhone design intent', () => {
    expect(LIMITATIONS.find((l) => l.id === 'simulated')?.evidence).toBe('simulated');
    expect(LIMITATIONS.find((l) => l.id === 'design-targets')?.evidence).toBe('design_target');
    expect(LIMITATIONS.find((l) => l.id === 'iphone')?.evidence).toBe('design_intent');
  });

  it('never states a battery percentage or claims a validated result', () => {
    const text = allText();
    expect(text).not.toMatch(/\d\s*%/);
    expect(text).not.toMatch(/\b(proven|validated accuracy|achieved)\b/i);
  });

  it('says the emergency handover is not guaranteed', () => {
    expect(LIMITATIONS.find((l) => l.id === 'emergency')?.after).toMatch(/not guaranteed/);
  });
});
