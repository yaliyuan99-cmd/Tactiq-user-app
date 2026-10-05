import { render, screen } from '@testing-library/react';
import { evidenceSentence } from './evidenceInView';
import { EvidenceTag } from './EvidenceTag';

describe('EvidenceTag', () => {
  it('says Measured, naming the bench prototype, when the records in view came from a ring', () => {
    render(<EvidenceTag evidence="measured" />);
    expect(screen.getByText('Measured — on an unvalidated bench prototype')).toBeInTheDocument();
  });

  it('says Simulated for simulated records, and names the ring records in a mixed view', () => {
    const { unmount } = render(<EvidenceTag evidence="simulated" />);
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    unmount();

    render(<EvidenceTag evidence="mixed" />);
    expect(screen.getByText('Simulated — includes some Measured ring records')).toBeInTheDocument();
  });

  it('says Sample when every record in view is a Demo Mode sample', () => {
    render(<EvidenceTag evidence="simulated" allSamples />);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('Simulated')).not.toBeInTheDocument();
  });
});

describe('evidenceSentence', () => {
  it('never calls ring records simulated', () => {
    expect(evidenceSentence('measured')).toBe(
      'Every figure here was recorded on a connected bench ring, which has not been validated.',
    );
    expect(evidenceSentence('mixed')).toMatch(/mix practice with the simulated ring and readings from a connected bench ring/);
    expect(evidenceSentence('simulated')).toBe('Every figure here comes from practice with the simulated ring in this app.');
    expect(evidenceSentence(null)).toMatch(/simulated ring/);
  });

  it('attributes a sample-only view to the samples', () => {
    expect(evidenceSentence('simulated', true)).toBe(
      'Every figure here comes from sample records added for Demo Mode, not from your own practice.',
    );
  });
});
