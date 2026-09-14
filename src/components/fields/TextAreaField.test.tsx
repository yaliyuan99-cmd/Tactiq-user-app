import { render, screen } from '@testing-library/react';
import { TextAreaField } from './TextAreaField';

describe('TextAreaField', () => {
  it('labels, describes and flags the textarea', () => {
    render(<TextAreaField label="Notes" hint="Optional." error="Keep notes under 500 characters." />);
    const textarea = screen.getByRole('textbox', { name: 'Notes' });
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAccessibleDescription('Optional. Keep notes under 500 characters.');
  });
});
