import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resolveCommand } from '@/domain/commands';
import { CONTACT_POINTS, type ContactKey } from '@/domain/contacts';
import { CONTACT_COORDINATES, HAND_VIEWBOX_WIDTH } from './geometry';
import { HandMap } from './HandMap';

const commandName = (contact: ContactKey) => resolveCommand(contact, 'tap')?.label ?? '';

const RIGHT_NAMES = [
  'Index fingertip, Confirm',
  'Index finger base, Dismiss / Back',
  'Middle fingertip, Undo',
  'Middle finger base, Next',
  'Ring fingertip, Read / Repeat',
  'Ring finger base, Previous',
  'Pinky fingertip, Shortcut 1',
  'Pinky finger base, Shortcut 2',
];

describe('HandMap', () => {
  it('renders eight named buttons for the right hand', () => {
    render(<HandMap hand="right" labelFor={commandName} caption="Right hand, palm view" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(RIGHT_NAMES);
    buttons.forEach((b) => {
      expect(b).toHaveAttribute('type', 'button');
      expect(b.className).toContain('min-w-[44px]');
      expect(b.className).toContain('min-h-[44px]');
      expect(b.className).toContain('rounded-full');
    });
    expect(screen.getByRole('figure', { name: 'Right hand, palm view' })).toBeInTheDocument();
    const index = screen.getByRole('button', { name: 'Index fingertip, Confirm' });
    expect(index.style.left).toBe('36%');
  });

  it('mirrors the drawing and the points for the left hand', () => {
    const { container } = render(<HandMap hand="left" />);
    expect(screen.getByRole('figure', { name: 'Left hand contact map' })).toBeInTheDocument();
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(CONTACT_POINTS.map((p) => p.label));
    expect(screen.getByRole('button', { name: 'Index fingertip' }).style.left).toBe('64%');
    expect(container.querySelector('svg > g')?.getAttribute('transform')).toBe('translate(300 0) scale(-1 1)');
  });

  it('styles fixed and shortcut points differently and rings the emergency point', () => {
    render(<HandMap hand="right" />);
    expect(screen.getByRole('button', { name: 'Index fingertip' }).className).toContain('bg-card');
    const pinkyTip = screen.getByRole('button', { name: 'Pinky fingertip' });
    expect(pinkyTip.className).toContain('bg-primary');
    expect(pinkyTip.querySelector('[data-emergency-ring]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Pinky finger base' }).querySelector('[data-emergency-ring]')).toBeNull();
  });

  it('calls press handlers once for Enter or Space, ignoring key repeats', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    render(<HandMap hand="right" onPressStart={onPressStart} onPressEnd={onPressEnd} />);
    const button = screen.getByRole('button', { name: 'Middle finger base' });
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    expect(onPressStart).toHaveBeenCalledTimes(1);
    expect(onPressStart).toHaveBeenCalledWith('middle_base');
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(onPressEnd).toHaveBeenCalledTimes(1);
    expect(onPressEnd).toHaveBeenCalledWith('middle_base');

    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.keyUp(button, { key: ' ' });
    expect(onPressStart).toHaveBeenCalledTimes(2);
    expect(onPressEnd).toHaveBeenCalledTimes(2);
  });

  it('handles pointer presses without a duplicate press from the follow-up click', async () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    render(<HandMap hand="right" onPressStart={onPressStart} onPressEnd={onPressEnd} />);
    const button = screen.getByRole('button', { name: 'Ring fingertip' });
    fireEvent.pointerDown(button, { pointerId: 3, button: 0 });
    expect(onPressStart).toHaveBeenCalledWith('ring_tip');
    fireEvent.pointerUp(button, { pointerId: 3, button: 0 });
    fireEvent.click(button);
    expect(onPressStart).toHaveBeenCalledTimes(1);
    expect(onPressEnd).toHaveBeenCalledTimes(1);

    await userEvent.pointer({ keys: '[MouseLeft]', target: screen.getByRole('button', { name: 'Index fingertip' }) });
    expect(onPressStart).toHaveBeenLastCalledWith('index_tip');
    expect(onPressEnd).toHaveBeenLastCalledWith('index_tip');
    expect(onPressStart).toHaveBeenCalledTimes(2);
  });

  it('ends a pointer press on cancel and ignores secondary buttons', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    render(<HandMap hand="right" onPressStart={onPressStart} onPressEnd={onPressEnd} />);
    const button = screen.getByRole('button', { name: 'Pinky fingertip' });
    fireEvent.pointerDown(button, { pointerId: 1, button: 2 });
    expect(onPressStart).not.toHaveBeenCalled();
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, pointerType: 'touch' });
    fireEvent.pointerCancel(button, { pointerId: 1 });
    expect(onPressEnd).toHaveBeenCalledWith('pinky_tip');
  });

  it('treats a lone click (screen reader activation) as an instant tap', () => {
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    render(<HandMap hand="right" onPressStart={onPressStart} onPressEnd={onPressEnd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Index finger base' }));
    expect(onPressStart).toHaveBeenCalledWith('index_base');
    expect(onPressEnd).toHaveBeenCalledWith('index_base');
  });

  it('fires onActivate on click when there are no press handlers', async () => {
    const onActivate = vi.fn();
    render(<HandMap hand="right" onActivate={onActivate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ring finger base' }));
    expect(onActivate).toHaveBeenCalledWith('ring_base');
  });

  it('marks the active point pressed and draws the hold ring', () => {
    render(<HandMap hand="right" activeContact="pinky_tip" holdProgress={0.5} holdArmed holdLabel="Emergency hold" />);
    expect(screen.getByRole('button', { name: 'Pinky fingertip' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Index fingertip' })).toHaveAttribute('aria-pressed', 'false');
    const ring = screen.getByRole('progressbar', { name: 'Emergency hold' });
    expect(ring).toHaveAttribute('aria-valuetext', '2.5 of 5 seconds, armed');
    expect(within(ring).getByText('Armed')).toBeInTheDocument();
  });

  it('shows the target and a misread with text, not colour alone', () => {
    render(<HandMap hand="right" labelFor={commandName} targetContact="middle_tip" detectedContact="middle_base" showLegend />);
    const target = screen.getByRole('button', { name: 'Middle fingertip, Undo, target' });
    expect(target.querySelector('[data-target-ring]')).not.toBeNull();
    const detected = screen.getByRole('button', { name: 'Middle finger base, Next, detected here' });
    expect(detected.querySelector('[data-detected-ring]')?.className).toContain('border-dashed');
    expect(screen.getByText('Detected here')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Dashed red ring: detected here')).toBeInTheDocument();
  });

  it('does not flag a detection that matches the target', () => {
    render(<HandMap hand="right" targetContact="ring_tip" detectedContact="ring_tip" />);
    expect(screen.getByRole('button', { name: 'Ring fingertip, target' })).toBeInTheDocument();
    expect(screen.queryByText('Detected here')).toBeNull();
  });

  it('adds the flash class to the confirmed point', () => {
    render(<HandMap hand="right" flashContact="index_tip" />);
    expect(screen.getByRole('button', { name: 'Index fingertip' })).toHaveClass('contact-flash');
  });

  it('ignores presses when disabled but stays focusable', () => {
    const onPressStart = vi.fn();
    render(<HandMap hand="right" disabled onPressStart={onPressStart} />);
    const button = screen.getByRole('button', { name: 'Index fingertip' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('disabled');
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.pointerDown(button, { pointerId: 1, button: 0 });
    fireEvent.click(button);
    expect(onPressStart).not.toHaveBeenCalled();
  });

  it('keeps interactive points at a fixed 44px minimum, not scaled with the figure', () => {
    render(<HandMap hand="right" size="sm" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
    buttons.forEach((b) => {
      expect(b).toHaveClass('h-[44px]', 'w-[44px]', 'min-h-[44px]', 'min-w-[44px]');
      expect(b.className).not.toContain('clamp(');
      expect(b).not.toHaveClass('aspect-square');
    });
  });

  it('pins the narrowest figure its fixed 44px points fit in, which callers must honour', () => {
    const keys = Object.keys(CONTACT_COORDINATES) as (keyof typeof CONTACT_COORDINATES)[];
    let closest = Number.POSITIVE_INFINITY;
    keys.forEach((a, i) =>
      keys.slice(i + 1).forEach((b) => {
        closest = Math.min(
          closest,
          Math.hypot(
            CONTACT_COORDINATES[a].cx - CONTACT_COORDINATES[b].cx,
            CONTACT_COORDINATES[a].cy - CONTACT_COORDINATES[b].cy,
          ),
        );
      }),
    );
    // Ring and pinky finger bases, the closest pair, in the drawing's 300 units.
    expect(closest).toBeCloseTo(36.88, 2);

    const minFigureWidth = Math.ceil((44 * HAND_VIEWBOX_WIDTH) / closest);
    expect(minFigureWidth).toBe(358);

    /** How much two neighbouring 44px points overlap at this figure width; 0 or less is clear. */
    const overlap = (figureWidth: number) => 44 - (closest * figureWidth) / HAND_VIEWBOX_WIDTH;
    expect(overlap(minFigureWidth)).toBeLessThanOrEqual(0);
    expect(overlap(408)).toBeLessThanOrEqual(0);
    // Phone widths leave the figure around 300-340px, where a tap meant for
    // "Ring finger base, Previous" could land on "Pinky finger base, Shortcut 2";
    // a caller with this little room must render ContactList instead.
    expect(overlap(301)).toBeGreaterThan(0);
    expect(overlap(340)).toBeGreaterThan(0);
  });

  it('sizes decorative points relative to the figure so neighbours never overlap at a 280px container', () => {
    const { container } = render(<HandMap hand="right" interactive={false} size="sm" />);
    const points = Array.from(container.querySelectorAll<HTMLElement>('[data-contact]'));
    expect(points).toHaveLength(8);
    points.forEach((point) => {
      expect(point).toHaveClass('aspect-square', 'rounded-full');
      expect(point.className).toMatch(/\bw-\[clamp\(\d+px,\d+%,\d+px\)\]/);
      expect(point.className).not.toMatch(/(^|\s)(min-)?[wh]-\[44px\]/);
    });
    // Colours, shapes and the emergency ring are unchanged.
    const pinkyTip = container.querySelector<HTMLElement>('[data-contact="pinky_tip"]');
    expect(pinkyTip).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(pinkyTip?.querySelector('[data-emergency-ring]')?.className).toContain('border-dashed');
    expect(container.querySelector('[data-contact="index_tip"]')).toHaveClass('bg-card', 'border-foreground');

    const [, min, percent, max] = /w-\[clamp\((\d+)px,(\d+)%,(\d+)px\)\]/.exec(points[0]?.className ?? '')?.map(Number) ?? [];
    if (min === undefined || percent === undefined || max === undefined) throw new Error('No relative size class');
    expect(min).toBeLessThan(44);
    expect(max).toBeLessThan(44);

    // Emergency points carry a dashed ring 5px outside the point (-inset-[5px]).
    const ringOutset = (key: string) =>
      container.querySelector(`[data-contact="${key}"] [data-emergency-ring]`) ? 5 : 0;
    const keys = Object.keys(CONTACT_COORDINATES) as (keyof typeof CONTACT_COORDINATES)[];

    for (const figureWidth of [280, 340, 408, 476]) {
      const scale = figureWidth / HAND_VIEWBOX_WIDTH;
      const diameter = Math.min(max, Math.max(min, (figureWidth * percent) / 100));
      let smallestGap = Number.POSITIVE_INFINITY;
      keys.forEach((a, i) => {
        keys.slice(i + 1).forEach((b) => {
          const distance = Math.hypot(
            CONTACT_COORDINATES[a].cx - CONTACT_COORDINATES[b].cx,
            CONTACT_COORDINATES[a].cy - CONTACT_COORDINATES[b].cy,
          );
          const gap = distance * scale - diameter - ringOutset(a) - ringOutset(b);
          smallestGap = Math.min(smallestGap, gap);
        });
      });
      expect(smallestGap, `gap between the closest points at ${figureWidth}px`).toBeGreaterThanOrEqual(4);
    }
  });

  it('renders no buttons when not interactive, but keeps the text alternative', () => {
    const { container } = render(<HandMap hand="right" interactive={false} labelFor={commandName} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelectorAll('[data-contact]')).toHaveLength(8);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(within(list).getByText('Pinky fingertip: Shortcut 1')).toBeInTheDocument();
    expect(screen.getByText(/thumb on the left/)).toBeInTheDocument();
  });

  it('hides the drawing from assistive technology', () => {
    const { container } = render(<HandMap hand="right" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('svg line')).toHaveLength(2);
  });
});
