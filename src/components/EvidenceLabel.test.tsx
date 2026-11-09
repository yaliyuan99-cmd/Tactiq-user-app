import { render, screen } from '@testing-library/react';
import { EvidenceLabel } from './EvidenceLabel';

describe('EvidenceLabel', () => {
  it.each([
    // Each kind is a different mark (highlighter, ink box, dashed pencil, red box), not only a different colour.
    ['simulated', 'Simulated', 'bg-[var(--highlight)]'],
    ['design_target', 'Design target', 'border-dashed'],
    ['design_intent', 'Design intent', 'border-dashed'],
    ['not_available', 'Not yet available', 'border-destructive'],
    ['measured', 'Measured', 'border-foreground'],
  ] as const)('shows %s as text with an icon and its own mark', (kind, text, mark) => {
    const { container } = render(<EvidenceLabel kind={kind} />);
    const label = screen.getByText(text);
    expect(label).toBeInTheDocument();
    const root = container.firstElementChild;
    expect(root?.className).toContain(mark);
    expect(root?.className).toContain('font-mono-label');
    expect(root?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('appends detail after an em dash', () => {
    render(<EvidenceLabel kind="simulated" detail="practice only" />);
    expect(screen.getByText('Simulated — practice only')).toBeInTheDocument();
  });
});
