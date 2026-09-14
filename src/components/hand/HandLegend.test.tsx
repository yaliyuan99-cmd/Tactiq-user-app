import { render, screen } from '@testing-library/react';
import { HandLegend } from './HandLegend';

describe('HandLegend', () => {
  it('explains every marking in words', () => {
    render(<HandLegend />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Fixed command')).toBeInTheDocument();
    expect(screen.getByText('Shortcut you can customise')).toBeInTheDocument();
    expect(screen.getByText('Dashed ring: hold five seconds for Emergency')).toBeInTheDocument();
  });

  it('adds target and detected markings on request', () => {
    render(<HandLegend showStates />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Solid ring: target')).toBeInTheDocument();
  });
});
