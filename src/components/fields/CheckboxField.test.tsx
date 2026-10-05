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

  it('puts the 44px area inside the label, so the whole row toggles the box once', async () => {
    render(<CheckboxField label="Include the five-second emergency hold" hint="Simulated." />);
    const checkbox = screen.getByRole('checkbox');
    // The 44 px box is a real label control, not a span that only looks like a target.
    const area = checkbox.closest('label');
    expect(area).not.toBeNull();
    expect(area).toHaveAttribute('for', checkbox.id);
    expect(area?.querySelector('.target-44')).not.toBeNull();
    expect(screen.getByText('Include the five-second emergency hold').closest('label')).toBe(area);

    // One label around box and text: a click anywhere in it toggles exactly once.
    await userEvent.click(area as HTMLLabelElement);
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // The hint is outside the label, so it stays a description rather than part of the name.
    expect(checkbox).toHaveAccessibleName('Include the five-second emergency hold');
    expect(checkbox).toHaveAccessibleDescription('Simulated.');
  });

  it('flags an error', () => {
    render(<CheckboxField label="I understand this is a simulation" error="Tick this box to continue." />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Tick this box to continue.');
  });
});
