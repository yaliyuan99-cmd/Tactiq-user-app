/**
 * Pure helpers for the route guards: where a signed-out visitor is sent, where
 * a signed-in visitor goes after an auth screen, and which paths skip the
 * onboarding gate. Kept free of React so they can be unit tested.
 */
import { ROUTES } from '@/app/routes';

/** Query parameter that carries the page a signed-out visitor asked for. */
export const NEXT_PARAM = 'next';

/** Screens a signed-in user never needs; `next` never points back at them. */
const AUTH_ONLY_PATHS: readonly string[] = [ROUTES.signIn, ROUTES.signUp, ROUTES.forgotPassword];

/** Paths reachable before onboarding is finished, so help is never locked behind setup. */
const ONBOARDING_EXEMPT_PATHS: readonly string[] = [ROUTES.help];

const SAFE_BASE = 'https://tactiq.invalid';

export interface LocationLike {
  readonly pathname: string;
  readonly search: string;
  readonly hash?: string;
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Lower-cases and removes a trailing slash, so "/Dashboard/Train/" compares equal to ROUTES.train. */
export function normalisePathname(pathname: string): string {
  const lower = pathname.toLowerCase();
  return lower.length > 1 && lower.endsWith('/') ? lower.replace(/\/+$/, '') || '/' : lower;
}

/** "/sign-in?next=<path+search+hash>" for the page the visitor tried to open. */
export function signInRedirectPath({ pathname, search, hash = '' }: LocationLike): string {
  const requested = `${pathname}${search}${hash}`;
  if (!requested || requested === ROUTES.root) return ROUTES.signIn;
  return `${ROUTES.signIn}?${NEXT_PARAM}=${encodeURIComponent(requested)}`;
}

/**
 * The in-app destination named by `?next=`, or `fallback` when it is missing
 * or unsafe. Only same-origin paths are accepted (no "//host", no schemes, no
 * control characters), and auth-only screens are refused to avoid loops.
 */
export function safeNextPath(search: string, fallback: string = ROUTES.dashboard): string {
  const raw = new URLSearchParams(search).get(NEXT_PARAM);
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (hasControlCharacter(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, SAFE_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== SAFE_BASE) return fallback;
  if (AUTH_ONLY_PATHS.includes(normalisePathname(url.pathname))) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** True for dashboard paths that stay reachable while onboarding is incomplete. */
export function isOnboardingExempt(pathname: string): boolean {
  const path = normalisePathname(pathname);
  return ONBOARDING_EXEMPT_PATHS.some((exempt) => path === exempt || path.startsWith(`${exempt}/`));
}

/** Router state passed to the sign-in screen after a deliberate sign-out. */
export interface SignedOutLocationState {
  readonly signedOut: true;
}

export function isSignedOutLocationState(state: unknown): state is SignedOutLocationState {
  return typeof state === 'object' && state !== null && (state as { signedOut?: unknown }).signedOut === true;
}
