import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

function Harness({ withInitialFocus = false }: { withInitialFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Edit shortcut
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Shortcut 1"
        description="Choose what a brief tap on the pinky fingertip does."
        initialFocusRef={withInitialFocus ? saveRef : undefined}
      >
        <label>
          Nickname <input />
        </label>
        <button type="button" ref={saveRef} onClick={() => setOpen(false)}>
          Save
        </button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('is a labelled, described modal dialog that takes focus', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit shortcut' }));
    const dialog = screen.getByRole('dialog', { name: 'Shortcut 1' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Choose what a brief tap on the pinky fingertip does.');
    expect(screen.getByRole('textbox', { name: 'Nickname' })).toHaveFocus();
  });

  it('honours initialFocusRef', async () => {
    render(<Harness withInitialFocus />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit shortcut' }));
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    render(<Harness withInitialFocus />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit shortcut' }));
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByRole('button', { name: 'Close' });
    expect(save).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(save).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('textbox', { name: 'Nickname' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the opener', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Edit shortcut' });
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('closes from the close button and the backdrop', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit shortcut' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Edit shortcut' }));
    const backdrop = document.querySelector('[data-dialog-backdrop]');
    expect(backdrop).not.toBeNull();
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides the rest of the page and locks scrolling while open, keeping live regions exposed', async () => {
    const liveRegions = document.createElement('div');
    liveRegions.setAttribute('data-live-announcer', '');
    document.body.appendChild(liveRegions);
    const { container } = render(<Harness />);
    const appRoot = container;
    await userEvent.click(screen.getByRole('button', { name: 'Edit shortcut' }));
    expect(appRoot).toHaveAttribute('aria-hidden', 'true');
    expect(liveRegions).not.toHaveAttribute('aria-hidden');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.queryByRole('button', { name: 'Edit shortcut' })).toBeNull();

    await userEvent.keyboard('{Escape}');
    expect(appRoot).not.toHaveAttribute('aria-hidden');
    expect(document.body.style.overflow).toBe('');
    liveRegions.remove();
  });

  it('only the top dialog responds to Escape when nested', async () => {
    function Nested() {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(false);
      return (
        <Dialog open={outer} onClose={() => setOuter(false)} title="Outer">
          <button type="button" onClick={() => setInner(true)}>
            Open inner
          </button>
          <Dialog open={inner} onClose={() => setInner(false)} title="Inner">
            <p>Inner content</p>
          </Dialog>
        </Dialog>
      );
    }
    render(<Nested />);
    await userEvent.click(screen.getByRole('button', { name: 'Open inner' }));
    expect(screen.getByRole('dialog', { name: 'Inner' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
  });
});
