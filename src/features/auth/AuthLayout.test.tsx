import { renderWithProviders, screen, within } from '@/test/render';
import { PageHeader } from '@/components';
import { AUTH_ILLUSTRATION_CAPTION, AUTH_PROTOTYPE_LINE, AuthLayout } from './AuthLayout';
import { DEMO_MODE_NOTE, DemoModeNote } from './AuthParts';

describe('AuthLayout', () => {
  it('shows the logo, the prototype disclaimer, a non-interactive hand and the page content', () => {
    renderWithProviders(
      <AuthLayout>
        <PageHeader title="Sign in" />
      </AuthLayout>,
    );
    expect(screen.getByText('Tactiq')).toBeInTheDocument();
    expect(screen.getByText(AUTH_PROTOTYPE_LINE)).toBe(screen.getByText('A student research prototype. No finished ring exists yet.'));
    const figure = screen.getByRole('figure', { name: AUTH_ILLUSTRATION_CAPTION });
    expect(within(figure).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toHaveAttribute('id', 'page-title');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('main')).toBeNull();
  });
});

describe('DemoModeNote', () => {
  it('is a note titled Demo Mode with the privacy explanation', () => {
    renderWithProviders(<DemoModeNote />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Demo Mode');
    expect(note).toHaveTextContent(DEMO_MODE_NOTE);
    expect(DEMO_MODE_NOTE).toBe(
      'Profiles are stored in this browser only. No password is stored or checked, so anyone using this browser can open them.',
    );
  });
});
