import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectField } from './SelectField';

describe('SelectField', () => {
  it('renders a native select with options and a label', async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Shortcut 1"
        hint="Brief tap on the pinky fingertip."
        options={[
          { value: 'play_pause', label: 'Play or pause media' },
          { value: 'announce_time', label: 'Announce the time' },
        ]}
        defaultValue="play_pause"
        onChange={(event) => onChange(event.target.value)}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Shortcut 1' });
    expect(select).toHaveAccessibleDescription('Brief tap on the pinky fingertip.');
    await userEvent.selectOptions(select, 'announce_time');
    expect(onChange).toHaveBeenCalledWith('announce_time');
  });

  it('flags an error', () => {
    render(<SelectField label="Hand" error="Choose a hand." options={[{ value: '', label: 'Choose' }]} />);
    expect(screen.getByRole('combobox', { name: 'Hand' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a hand.');
  });
});
