import { useState } from 'react';
import { renderWithProviders, screen, userEvent } from '@/test/render';
import type { PracticeView } from './practiceView';
import { ViewSwitch } from './ViewSwitch';

function Harness({ onChange }: { onChange: (view: PracticeView) => void }) {
  const [view, setView] = useState<PracticeView>('hand');
  return (
    <ViewSwitch
      value={view}
      onChange={(next) => {
        onChange(next);
        setView(next);
      }}
    />
  );
}

describe('ViewSwitch', () => {
  it('is a labelled group of two radios with the current view checked', () => {
    renderWithProviders(<ViewSwitch value="list" onChange={() => undefined} className="mt-4" />);
    const group = screen.getByRole('group', { name: 'Show the contact points as' });
    expect(group).toHaveClass('mt-4');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'List view' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Hand view' })).not.toBeChecked();
  });

  it('changes view with a click or the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    expect(onChange).toHaveBeenLastCalledWith('list');
    expect(screen.getByRole('radio', { name: 'List view' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('hand');
    expect(screen.getByRole('radio', { name: 'Hand view' })).toBeChecked();
  });
});
