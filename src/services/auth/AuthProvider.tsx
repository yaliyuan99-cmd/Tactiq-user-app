/* STUB — replaced by the auth implementation. Do not import in tests until then. */
import { type ReactNode } from 'react';
import type { AuthMode, AuthService, AuthUser, PasswordResetRequestResult, SignInInput, SignUpInput } from './types';

export interface AuthContextValue {
  readonly user: AuthUser | null;
  /** True until the stored session has been checked. */
  readonly loading: boolean;
  readonly mode: AuthMode;
  readonly service: AuthService;
  readonly signIn: (input: SignInInput) => Promise<AuthUser>;
  readonly signUp: (input: SignUpInput) => Promise<AuthUser>;
  readonly signOut: () => Promise<void>;
  readonly continueAsGuest: () => Promise<AuthUser>;
  readonly requestPasswordReset: (email: string) => Promise<PasswordResetRequestResult>;
  readonly completePasswordReset: (newPassword: string) => Promise<void>;
  readonly updateProfile: (patch: { displayName?: string }) => Promise<AuthUser>;
  readonly deleteAccount: () => Promise<void>;
}

export function AuthProvider(_props: { service?: AuthService; children: ReactNode }): JSX.Element {
  throw new Error('AuthProvider is not implemented yet');
}

export function useAuth(): AuthContextValue {
  throw new Error('useAuth is not implemented yet');
}
