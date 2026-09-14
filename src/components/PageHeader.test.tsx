import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the single h1 with id page-title', () => {
    render(<PageHeader eyebrow="Practice" title="Simulator" lede="Try each command without a ring." actions={<a href="/help">Help</a>} />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Simulator' });
    expect(heading).toHaveAttribute('id', 'page-title');
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Try each command without a ring.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });
});
