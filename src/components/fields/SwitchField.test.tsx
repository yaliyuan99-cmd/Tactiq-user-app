import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwitchField } from './SwitchField';

function Harness({ onChange }: { onChange?: (checked: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <SwitchField
      label="Audio announcements"
      description="Speak announcements aloud."
      checked={checked}
      onChange={(next) => {
        setChecked(next);
        onChange?.(next);
      }}
    />
  );
}

describe('SwitchField', () => {
  it('is a switch named by its label with visible on/off text', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Audio announcements' });
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAccessibleDescription('Speak announcements aloud.');
    expect(toggle).toHaveTextContent('Off');
    expect(toggle.className).toContain('target-44');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveTextContent('On');
    expect(onChange).toHaveBeenLastCalledWith(true);

    toggle.focus();
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('supports the onCheckedChange alias and disabled state', async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(<SwitchField label="Haptics" checked onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Haptics' }));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    rerender(<SwitchField label="Haptics" checked onCheckedChange={onCheckedChange} disabled />);
    await userEvent.click(screen.getByRole('switch', { name: 'Haptics' }));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });
});
