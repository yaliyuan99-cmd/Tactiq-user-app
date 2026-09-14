import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from './ButtonLink';

describe('ButtonLink', () => {
  it('renders a router link styled as a button', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/training" variant="secondary" trailingIcon={<ArrowRight className="h-4 w-4" />}>
          Start training
        </ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Start training' });
    expect(link).toHaveAttribute('href', '/training');
    expect(link.className).toContain('border-border-strong');
    expect(link.className).toContain('target-44');
  });
});
