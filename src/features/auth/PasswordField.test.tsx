import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('hides the password until the toggle is pressed, by keyboard', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" autoComplete="current-password" defaultValue="secret-words" />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('aria-controls', input.id);
    expect(toggle.className).toContain('target-44');

    toggle.focus();
    await user.keyboard('{Enter}');
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAccessibleName('Show password');

    await user.keyboard(' ');
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('wires the hint and error to the input', () => {
    render(
      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error="Use at least 8 characters."
        toggleLabel="Show new password"
      />,
    );
    const input = screen.getByLabelText('New password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('At least 8 characters. Use at least 8 characters.');
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 8 characters.');
    expect(screen.getByRole('button', { name: 'Show new password' })).toBeInTheDocument();
  });
});
