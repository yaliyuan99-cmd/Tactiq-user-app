import { render, screen } from '@testing-library/react';
import { Callout } from './Callout';

describe('Callout', () => {
  it('renders a title, body and icon with the given role', () => {
    const { container } = render(
      <Callout kind="warning" title="Simulation only" role="note">
        No emergency message is ever sent from this app.
      </Callout>,
    );
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Simulation only');
    expect(note).toHaveTextContent('No emergency message is ever sent from this app.');
    expect(note.className).toContain('border-l-4');
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('adds a spoken prefix when there is no title', () => {
    render(
      <Callout kind="danger" role="alert">
        Bluetooth permission was refused.
      </Callout>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Important: Bluetooth permission was refused.');
  });

  it('has no role by default', () => {
    render(<Callout kind="success">Saved.</Callout>);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Saved.')).toBeInTheDocument();
  });
});
