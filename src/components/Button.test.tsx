import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Check } from 'lucide-react';
import { Button } from './Button';

describe('Button', () => {
  it('renders a real button of type button with primary styling by default', () => {
    render(<Button>Save changes</Button>);
    const button = screen.getByRole('button', { name: 'Save changes' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('target-44');
  });

  it('applies variant, size and full-width classes', () => {
    render(
      <Button variant="danger" size="lg" fullWidth>
        Delete account
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete account' });
    expect(button.className).toContain('bg-destructive');
    expect(button.className).toContain('min-h-14');
    expect(button.className).toContain('w-full');
  });

  it('hides icons from assistive technology and keeps the text as the name', () => {
    render(<Button leadingIcon={<Check className="h-4 w-4" />}>Confirm</Button>);
    const button = screen.getByRole('button', { name: 'Confirm' });
    expect(button.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
  });

  it('marks a busy button aria-disabled and aria-busy, never disabled, and ignores clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Saving
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).not.toHaveAttribute('disabled');
    button.focus();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
    expect(button.querySelector('svg.animate-spin')).not.toBeNull();
  });

  it('does not submit a form while busy', () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent)}>
        <Button type="submit" busy>
          Send
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onClick when idle', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Next</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
