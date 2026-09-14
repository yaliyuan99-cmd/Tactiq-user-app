import { render, screen } from '@testing-library/react';
import { HoldRing } from './HoldRing';

describe('HoldRing', () => {
  it('reports seconds held out of five', () => {
    render(<HoldRing progress={0.48} armed={false} label="Emergency hold" />);
    const ring = screen.getByRole('progressbar', { name: 'Emergency hold' });
    expect(ring).toHaveAttribute('aria-valuetext', '2.4 of 5 seconds');
    expect(ring).toHaveAttribute('aria-valuenow', '2.4');
    expect(ring).toHaveAttribute('aria-valuemax', '5');
    expect(screen.queryByText('Armed')).toBeNull();
  });

  it('shows an Armed badge and changes the stroke when armed', () => {
    const { container } = render(<HoldRing progress={0.5} armed label="Emergency hold" />);
    expect(screen.getByText('Armed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '2.5 of 5 seconds, armed');
    const circles = container.querySelectorAll('circle');
    expect(circles[1]?.getAttribute('class')).toContain('stroke-primary');
  });

  it('clamps progress', () => {
    render(<HoldRing progress={4} armed={false} label="Hold" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '5 of 5 seconds');
  });
});
