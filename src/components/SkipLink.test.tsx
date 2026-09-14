import { fireEvent, render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('links to the main content and moves focus there', () => {
    render(
      <>
        <SkipLink />
        <main id="main-content">Content</main>
      </>,
    );
    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveClass('skip-link');
    fireEvent.click(link);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(main).toHaveFocus();
  });

  it('supports a custom target', () => {
    render(<SkipLink targetId="lesson" label="Skip to lesson" />);
    expect(screen.getByRole('link', { name: 'Skip to lesson' })).toHaveAttribute('href', '#lesson');
  });
});
