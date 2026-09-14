import { render, screen } from '@testing-library/react';
import { EvidenceLabel } from './EvidenceLabel';

describe('EvidenceLabel', () => {
  it.each([
    ['simulated', 'Simulated', 'text-status-simulation'],
    ['design_target', 'Design target', 'text-status-target'],
    ['design_intent', 'Design intent', 'text-status-future'],
    ['not_available', 'Not yet available', 'text-status-future'],
    ['measured', 'Measured', 'text-status-confirmed'],
  ] as const)('shows %s as text with an icon', (kind, text, tone) => {
    const { container } = render(<EvidenceLabel kind={kind} />);
    const label = screen.getByText(text);
    expect(label).toBeInTheDocument();
    const root = container.firstElementChild;
    expect(root?.className).toContain(tone);
    expect(root?.className).toContain('font-mono-label');
    expect(root?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('appends detail after an em dash', () => {
    render(<EvidenceLabel kind="simulated" detail="practice only" />);
    expect(screen.getByText('Simulated — practice only')).toBeInTheDocument();
  });
});
