import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Logo } from './Logo';

describe('Logo', () => {
  it('is a home link named "Tactiq home" when given a destination', () => {
    render(
      <MemoryRouter>
        <Logo to="/" />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Tactiq home' });
    expect(link).toHaveAttribute('href', '/');
    expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('is plain text without a destination', () => {
    render(<Logo size="sm" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Tactiq')).toBeInTheDocument();
  });
});
