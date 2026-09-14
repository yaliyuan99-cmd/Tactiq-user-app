import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';

describe('TextField', () => {
  it('associates the label and describes the input with its hint', () => {
    render(<TextField label="Email" hint="We only use this to sign you in." type="email" autoComplete="email" required />);
    const input = screen.getByRole('textbox', { name: /Email/ });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('We only use this to sign you in.');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('(required)')).toBeInTheDocument();
  });

  it('marks the input invalid and announces the error, described after the hint', () => {
    render(<TextField label="Email" hint="Your sign-in address." error="Enter an email address, like name@example.com." />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const [hintId, errorId] = describedBy.split(' ');
    expect(document.getElementById(hintId ?? '')).toHaveTextContent('Your sign-in address.');
    expect(document.getElementById(errorId ?? '')).toHaveTextContent('Enter an email address');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an email address, like name@example.com.');
  });

  it('has no describedby without hint or error, and accepts typing', async () => {
    render(<TextField label="Display name" />);
    const input = screen.getByRole('textbox', { name: 'Display name' });
    expect(input).not.toHaveAttribute('aria-describedby');
    await userEvent.type(input, 'Sam');
    expect(input).toHaveValue('Sam');
  });

  it('uses an explicit id when given', () => {
    render(<TextField id="signin-email" label="Email" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'signin-email');
  });
});
