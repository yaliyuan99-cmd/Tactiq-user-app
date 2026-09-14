import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes value, range and text', () => {
    render(<ProgressBar value={3} max={8} label="Points calibrated" />);
    const bar = screen.getByRole('progressbar', { name: 'Points calibrated' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '8');
    expect(bar).toHaveAttribute('aria-valuetext', '3 of 8');
    expect(screen.getByText('3 of 8')).toBeInTheDocument();
  });

  it('clamps out-of-range values and can hide the visible text', () => {
    render(<ProgressBar value={12} max={5} label="Lessons" showValueText={false} />);
    const bar = screen.getByRole('progressbar', { name: 'Lessons' });
    expect(bar).toHaveAttribute('aria-valuenow', '5');
    expect(screen.queryByText('5 of 5')).toBeNull();
  });

  it('accepts custom value text', () => {
    render(<ProgressBar value={2} max={5} label="Lessons complete" valueText="2 of 5 lessons" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '2 of 5 lessons');
  });
});
