import { render } from '@testing-library/react';
import { RingMark } from './RingMark';

describe('RingMark', () => {
  it('is decorative: two bars, hidden from assistive technology', () => {
    const { container } = render(<RingMark size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '24');
    expect(container.querySelectorAll('rect')).toHaveLength(2);
  });
});
