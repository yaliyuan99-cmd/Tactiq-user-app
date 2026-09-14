import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('keeps content in the accessibility tree with the sr-only class', () => {
    render(
      <button type="button">
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>,
    );
    const button = screen.getByRole('button', { name: 'Close dialog' });
    expect(button.querySelector('.sr-only')).not.toBeNull();
  });

  it('renders as a div when asked', () => {
    const { container } = render(<VisuallyHidden as="div">Text alternative</VisuallyHidden>);
    expect(container.querySelector('div.sr-only')).toHaveTextContent('Text alternative');
  });
});
