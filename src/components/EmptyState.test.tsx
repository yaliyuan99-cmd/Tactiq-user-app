import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title, body, icon and action', () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="No activity yet"
        body="Practise in the simulator and your attempts appear here."
        action={<button type="button">Open simulator</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'No activity yet' })).toBeInTheDocument();
    expect(screen.getByText(/attempts appear here/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open simulator' })).toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('accepts an icon element and a lower heading level', () => {
    render(<EmptyState icon={<Inbox aria-hidden="true" />} title="Nothing here" body="Empty." headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Nothing here' })).toBeInTheDocument();
  });
});
