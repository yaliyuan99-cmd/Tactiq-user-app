export * from './types';
export { AuthProvider, useAuth, useIsSignedIn, type AuthContextValue, type AuthProviderProps } from './AuthProvider';
export { createAuthService } from './createAuthService';
export {
  DEMO_MESSAGES,
  GUEST_DISPLAY_NAME,
  GUEST_EMAIL,
  LocalDemoAuthService,
  type LocalAccountRecord,
  type LocalSessionRecord,
} from './LocalDemoAuthService';
export {
  mapSupabaseUser,
  RESET_PASSWORD_PATH,
  SupabaseAuthService,
  type SupabaseAuthLike,
  type SupabaseSessionLike,
  type SupabaseUserLike,
} from './SupabaseAuthService';
export { mapSupabaseError, SUPABASE_MESSAGES, type SupabaseErrorLike } from './supabaseErrors';
export { DISPLAY_NAME_MAX_LENGTH, isValidEmail, MESSAGES as AUTH_MESSAGES, normaliseEmail, toAuthError } from './validation';
