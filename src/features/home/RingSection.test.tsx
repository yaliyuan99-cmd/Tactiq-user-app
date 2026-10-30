import { RING_PARTS } from '@/domain/ringParts';
import { SPREAD_STEPS, spreadValueText } from '@/components/product';
import { fireEvent, renderApp, screen, userEvent, waitFor, within } from '@/test/renderApp';
import { RingSection } from './RingSection';

const slider = () => screen.getByRole('slider', { name: 'Exploded view' });
const partsList = () => screen.getByRole('list', { name: 'Parts' });
const diagram = () => screen.getByRole('group', { name: /parts, numbered 1 to 10/i });

function setup() {
  const user = userEvent.setup();
  renderApp(<RingSection />, { signedIn: false });
  return { user };
}

describe('RingSection: what it claims', () => {
  it('labels every part as design intent, never as something that was built', () => {
    setup();
    // The whole section rests on this: no ring exists. A part shown without
    // that label would be the page's first overclaim.
    const detail = screen.getByRole('region', { name: /Outer shell/ });
    expect(within(detail).getByText(/Design intent — not built/)).toBeInTheDocument();
    for (const part of RING_PARTS) expect(part.evidence).toBe('design_intent');
  });

  it('keeps the designed sensing and the bench rig as two separate stories', () => {
    setup();
    expect(screen.getByText(/checked in simulation only/i)).toBeInTheDocument();
    expect(screen.getByText(/flex sensors, force-sensitive resistors and an IMU/i)).toBeInTheDocument();
  });

  it('says what the bench rig actually has for the selected part', async () => {
    const { user } = setup();
    await user.click(within(partsList()).getByRole('button', { name: /Magnetometer 1/ }));
    const detail = screen.getByRole('region', { name: /Magnetometer 1/ });
    expect(within(detail).getByText(/Not fitted — a different sensor stands in/)).toBeInTheDocument();
    expect(within(detail).getByText(/No magnetometer is fitted/)).toBeInTheDocument();
  });

  it('writes out every part in words, for everyone, not behind a toggle', () => {
    setup();
    const alternative = screen.getByRole('region', { name: 'Every part in words' });
    for (const part of RING_PARTS) {
      expect(within(alternative).getByText(new RegExp(`${part.index}\\. ${part.name}`))).toBeInTheDocument();
    }
  });
});

describe('RingSection: the diagram is operable', () => {
  it('draws the ten parts as real buttons, not as shapes only a mouse can reach', () => {
    setup();
    const badges = within(diagram()).getAllByRole('button');
    expect(badges).toHaveLength(RING_PARTS.length);
    // Each one names its part in full: "03" alone tells a screen reader nothing.
    expect(badges.map((badge) => badge.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining(['Part 1 of 10, Outer shell', 'Part 10 of 10, Passive thumb magnet']),
    );
  });

  it('hides the drawing itself from assistive technology, since the buttons carry it', () => {
    const { container } = renderApp(<RingSection />, { signedIn: false });
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('is one tab stop, with the arrow keys moving between parts', async () => {
    const { user } = setup();
    const badges = within(diagram()).getAllByRole('button');
    // Roving tabindex: only the selected badge is tabbable, so Tab does not
    // have to be pressed ten times to get past the diagram.
    expect(badges.filter((badge) => badge.getAttribute('tabindex') === '0')).toHaveLength(1);

    badges[0]?.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('region', { name: /Inner carrier/ })).toBeInTheDocument());
    await user.keyboard('{End}');
    await waitFor(() => expect(screen.getByRole('region', { name: /Passive thumb magnet/ })).toBeInTheDocument());
    await user.keyboard('{Home}');
    await waitFor(() => expect(screen.getByRole('region', { name: /Outer shell/ })).toBeInTheDocument());
  });

  it('shows the selection in both the diagram and the list, from either one', async () => {
    const { user } = setup();
    await user.click(within(partsList()).getByRole('button', { name: /Haptic actuator/ }));
    expect(within(diagram()).getByRole('button', { name: /Haptic actuator/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(diagram()).getByRole('button', { name: /Squeeze sensor/ }));
    expect(within(partsList()).getByRole('button', { name: /Squeeze sensor/ })).toHaveAttribute('aria-pressed', 'true');
    // Exactly one part is selected at a time, in each view.
    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(2);
  });
});

describe('RingSection: the slider', () => {
  it('is a real slider with a visible label and eleven stops', () => {
    setup();
    expect(slider()).toHaveAttribute('type', 'range');
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', String(SPREAD_STEPS));
    expect(slider()).toHaveAttribute('step', '1');
  });

  // jsdom does not implement keyboard stepping on a range input, so the value
  // is set the way Testing Library recommends for one. Real arrow-key stepping
  // is the browser's own behaviour on a native input, which is most of why
  // this is a native input.
  it('says what the drawing looks like, not a bare number', async () => {
    setup();
    expect(slider()).toHaveAttribute('aria-valuetext', spreadValueText(0));
    expect(spreadValueText(0)).toMatch(/^Assembled\./);

    fireEvent.change(slider(), { target: { value: '1' } });
    await waitFor(() => expect(slider()).toHaveAttribute('aria-valuetext', spreadValueText(1)));

    fireEvent.change(slider(), { target: { value: String(SPREAD_STEPS) } });
    await waitFor(() => expect(slider()).toHaveAttribute('aria-valuetext', spreadValueText(SPREAD_STEPS)));
    expect(spreadValueText(SPREAD_STEPS)).toMatch(/^Fully exploded\./);
  });

  it('tells the user the drawing is decorative, so nothing is lost by leaving it alone', () => {
    setup();
    expect(slider()).toHaveAccessibleDescription(/The drawing is decorative/);
  });

  it('does not change which part is selected', async () => {
    const { user } = setup();
    await user.click(within(partsList()).getByRole('button', { name: /Power system/ }));
    fireEvent.change(slider(), { target: { value: String(SPREAD_STEPS) } });
    // Moving the parts apart is a view change, not a selection change.
    expect(screen.getByRole('region', { name: /Power system/ })).toBeInTheDocument();
  });
});
