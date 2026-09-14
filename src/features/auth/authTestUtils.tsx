/** Test-only helpers: a fake Supabase-mode AuthService and a renderer that injects it into the real provider stack. */
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AppProviders } from '@/app/AppProviders';
import type { AuthService, AuthUser } from '@/services/auth/types';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { AuthTestRoutes } from './AuthTestRoutes';

export const SUPABASE_TEST_USER: AuthUser = {
  id: 'supabase_user',
  email: 'robin@example.com',
  displayName: 'Robin',
  createdAt: '2026-09-01T09:00:00.000Z',
  provider: 'supabase',
};

/** Every method is a vi.fn with a successful default; override per test with mockRejectedValueOnce and friends. */
export function createFakeSupabaseAuth(sessionUser: AuthUser | null = null) {
  return {
    mode: 'supabase' as const,
    getSession: vi.fn<AuthService['getSession']>(async () => sessionUser),
    onChange: vi.fn<AuthService['onChange']>(() => () => {}),
    signIn: vi.fn<AuthService['signIn']>(async () => SUPABASE_TEST_USER),
    signUp: vi.fn<AuthService['signUp']>(async () => SUPABASE_TEST_USER),
    signOut: vi.fn<AuthService['signOut']>(async () => {}),
    continueAsGuest: vi.fn<AuthService['continueAsGuest']>(async () => SUPABASE_TEST_USER),
    requestPasswordReset: vi.fn<AuthService['requestPasswordReset']>(async () => ({
      delivered: true,
      message: 'If that email has an account, a reset link is on its way.',
    })),
    completePasswordReset: vi.fn<AuthService['completePasswordReset']>(async () => {}),
    updateProfile: vi.fn<AuthService['updateProfile']>(async () => SUPABASE_TEST_USER),
    deleteAccount: vi.fn<AuthService['deleteAccount']>(async () => {}),
  } satisfies AuthService;
}

/** Renders the auth routes at `route` inside AppProviders with the given auth service. */
export function renderWithAuthService(service: AuthService, route: string): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders storage={new MemoryStorageAdapter()} authService={service}>
        <AuthTestRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}
