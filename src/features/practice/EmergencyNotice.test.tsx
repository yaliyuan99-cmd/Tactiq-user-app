import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { renderWithProviders, screen, within } from '@/test/render';
import { EmergencyNotice } from './EmergencyNotice';

describe('EmergencyNotice', () => {
  it('states that it is a simulation and that nobody was contacted', () => {
    renderWithProviders(<EmergencyNotice className="mt-2" />);
    const notice = screen.getAllByRole('status').find((el) => el.getAttribute('data-kind') === 'warning');
    expect(notice).toBeDefined();
    if (!notice) return;
    expect(notice).toHaveClass('mt-2');
    expect(within(notice).getByText('Simulation only')).toBeInTheDocument();
    expect(within(notice).getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    expect(
      within(notice).getByText(
        'In the design, the phone would hand over to its own emergency pathway. This app never contacts anyone.',
      ),
    ).toBeInTheDocument();
  });
});
