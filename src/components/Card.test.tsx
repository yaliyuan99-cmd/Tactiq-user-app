import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('labels the section with its heading', () => {
    render(
      <Card heading="Calibration" eyebrow="Simulated" actions={<button type="button">Start</button>}>
        <p>Not calibrated yet.</p>
      </Card>,
    );
    const region = screen.getByRole('region', { name: 'Calibration' });
    expect(screen.getByRole('heading', { level: 2, name: 'Calibration' })).toBeInTheDocument();
    expect(region).toHaveTextContent('Simulated');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('supports a level-3 heading and the article element', () => {
    const { container } = render(
      <Card as="article" heading="Lesson 2" headingLevel={3}>
        Confirm and Back
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Lesson 2' })).toBeInTheDocument();
    const article = container.querySelector('article');
    expect(article).toHaveAttribute('aria-labelledby');
  });

  it('has no label when there is no heading', () => {
    const { container } = render(<Card as="div">Plain content</Card>);
    const div = container.firstElementChild;
    expect(div).not.toHaveAttribute('aria-labelledby');
    expect(div?.className).toContain('rounded-lg');
  });
});
