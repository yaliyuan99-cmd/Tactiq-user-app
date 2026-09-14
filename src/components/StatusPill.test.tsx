import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it.each([
    ['demo', 'Demo Mode'],
    ['disconnected', 'Disconnected'],
    ['connecting', 'Connecting…'],
    ['connected', 'Connected'],
    ['reconnecting', 'Reconnecting…'],
    ['unsupported', 'Bluetooth unavailable'],
    ['permission_denied', 'Permission needed'],
    ['error', 'Error'],
    ['scanning', 'Searching…'],
  ] as const)('renders %s as icon + text', (status, text) => {
    const { container } = render(<StatusPill status={status} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('is a status role only when asked', () => {
    const { rerender } = render(<StatusPill status="connected" />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<StatusPill status="connected" role="status" label="Connected to Tactiq Ring" />);
    expect(screen.getByRole('status')).toHaveTextContent('Connected to Tactiq Ring');
  });
});
