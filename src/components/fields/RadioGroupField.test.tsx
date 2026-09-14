import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroupField } from './RadioGroupField';

type HandChoice = 'left' | 'right';

function Harness() {
  const [value, setValue] = useState<HandChoice>('right');
  return (
    <RadioGroupField<HandChoice>
      label="Which hand wears the ring?"
      hint="The hand map mirrors to match."
      value={value}
      onChange={setValue}
      options={[
        { value: 'right', label: 'Right hand', description: 'Thumb on the left of the drawing.' },
        { value: 'left', label: 'Left hand', description: 'Thumb on the right of the drawing.' },
      ]}
    />
  );
}

describe('RadioGroupField', () => {
  it('groups native radios under a legend with option descriptions', async () => {
    render(<Harness />);
    const group = screen.getByRole('group', { name: 'Which hand wears the ring?' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group).toHaveAccessibleDescription('The hand map mirrors to match.');
    const right = screen.getByRole('radio', { name: 'Right hand' });
    const left = screen.getByRole('radio', { name: 'Left hand' });
    expect(right).toBeChecked();
    expect(left).toHaveAccessibleDescription('Thumb on the right of the drawing.');
    await userEvent.click(left);
    expect(left).toBeChecked();
    expect(right).not.toBeChecked();
    expect(right).toHaveAttribute('name', left.getAttribute('name') ?? '');
  });

  it('shows an error', () => {
    render(
      <RadioGroupField label="Theme" value={null} onChange={() => {}} error="Choose a theme." options={[{ value: 'light', label: 'Light' }]} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a theme.');
  });
});
