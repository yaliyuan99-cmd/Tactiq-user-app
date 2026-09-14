import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxField } from './CheckboxField';

describe('CheckboxField', () => {
  it('toggles via its label and is described by its hint', async () => {
    render(<CheckboxField label="Include sample records" hint="Seeded examples, clearly marked." />);
    const checkbox = screen.getByRole('checkbox', { name: 'Include sample records' });
    expect(checkbox).toHaveAccessibleDescription('Seeded examples, clearly marked.');
    expect(checkbox).not.toBeChecked();
    await userEvent.click(screen.getByText('Include sample records'));
    expect(checkbox).toBeChecked();
  });

  it('flags an error', () => {
    render(<CheckboxField label="I understand this is a simulation" error="Tick this box to continue." />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Tick this box to continue.');
  });
});
