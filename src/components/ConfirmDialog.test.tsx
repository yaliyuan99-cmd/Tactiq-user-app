import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

function Harness({ onConfirm, typeToConfirm }: { onConfirm: () => void; typeToConfirm?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete history
      </button>
      <ConfirmDialog
        open={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        title="Delete all activity?"
        description="This removes every simulated attempt from this browser."
        confirmLabel="Delete activity"
        destructive
        typeToConfirm={typeToConfirm}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('focuses Cancel for destructive actions and confirms on click', async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete history' }));
    expect(screen.getByRole('dialog', { name: 'Delete all activity?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Delete activity' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps confirm aria-disabled until the phrase is typed', async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} typeToConfirm="DELETE" />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete history' }));
    const input = screen.getByRole('textbox', { name: 'Type “DELETE” to confirm' });
    expect(input).toHaveFocus();
    const confirm = screen.getByRole('button', { name: 'Delete activity' });
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    expect(confirm).not.toHaveAttribute('disabled');

    await userEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.type(input, 'DEL{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Type “DELETE” exactly to continue.');

    await userEvent.type(input, 'ETE');
    expect(confirm).not.toHaveAttribute('aria-disabled');
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('resets the typed phrase when reopened and cancels on Escape', async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} typeToConfirm="reset" />);
    const opener = screen.getByRole('button', { name: 'Delete history' });
    await userEvent.click(opener);
    await userEvent.type(screen.getByRole('textbox'), 'reset');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
