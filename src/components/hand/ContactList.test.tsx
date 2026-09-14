import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resolveCommand } from '@/domain/commands';
import { type ContactKey } from '@/domain/contacts';
import { ContactList } from './ContactList';

const commandName = (contact: ContactKey) => resolveCommand(contact, 'tap')?.label ?? '';

describe('ContactList', () => {
  it('renders eight full-width buttons named "point — command"', () => {
    render(<ContactList labelFor={commandName} caption="Contact points" />);
    const list = screen.getByRole('list', { name: 'Contact points' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons).toHaveLength(8);
    expect(buttons[0]).toHaveAccessibleName('Index fingertip — Confirm');
    expect(buttons[7]).toHaveAccessibleName('Pinky finger base — Shortcut 2');
    expect(buttons[0]?.className).toContain('w-full');
  });

  it('shares the press semantics of the hand map', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    render(<ContactList labelFor={commandName} onPressStart={onPressStart} onPressEnd={onPressEnd} />);
    const button = screen.getByRole('button', { name: 'Pinky fingertip — Shortcut 1' });
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.keyDown(button, { key: ' ', repeat: true });
    fireEvent.keyUp(button, { key: ' ' });
    expect(onPressStart).toHaveBeenCalledTimes(1);
    expect(onPressEnd).toHaveBeenCalledTimes(1);
    expect(onPressEnd).toHaveBeenCalledWith('pinky_tip');
  });

  it('ends a keyboard press when focus leaves mid-press', () => {
    const onPressEnd = vi.fn();
    render(<ContactList onPressStart={() => {}} onPressEnd={onPressEnd} />);
    const button = screen.getByRole('button', { name: 'Ring fingertip' });
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.blur(button);
    expect(onPressEnd).toHaveBeenCalledWith('ring_tip');
  });

  it('shows active, target, misread and the hold ring for the pinky tip', () => {
    render(
      <ContactList
        labelFor={commandName}
        activeContact="pinky_tip"
        targetContact="index_tip"
        detectedContact="index_base"
        holdProgress={0.2}
        holdArmed={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Pinky fingertip — Shortcut 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Index fingertip — Confirm, target' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index finger base — Dismiss / Back, detected here' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Five-second hold' })).toHaveAttribute(
      'aria-valuetext',
      '1 of 5 seconds',
    );
  });

  it('fires onActivate without press handlers', async () => {
    const onActivate = vi.fn();
    render(<ContactList onActivate={onActivate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Middle fingertip' }));
    expect(onActivate).toHaveBeenCalledWith('middle_tip');
  });

  it('renders plain rows when not interactive', () => {
    render(<ContactList interactive={false} labelFor={commandName} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByText('Ring finger base — Previous')).toBeInTheDocument();
  });
});
