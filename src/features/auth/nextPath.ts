import { ROUTES } from '@/app/routes';

/** Pages that make no sense to return to once someone is signed in. */
const AUTH_PATHS: ReadonlySet<string> = new Set([
  ROUTES.signIn,
  ROUTES.signUp,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
]);

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Where to go after signing in, from the `next` query parameter.
 *
 * Only paths inside this app are followed: the value must start with a single
 * "/" (so "//evil.example" and "/\evil.example", which browsers treat as other
 * sites, are refused), contain no control characters, and not point back at a
 * sign-in page. Anything else falls back to the dashboard.
 */
export function resolveNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return ROUTES.dashboard;
  if (next.includes('\\') || hasControlCharacter(next)) return ROUTES.dashboard;
  const pathname = next.split(/[?#]/, 1)[0] ?? '';
  const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (AUTH_PATHS.has(withoutTrailingSlash)) return ROUTES.dashboard;
  return next;
}

/** The sign-in route that returns to `path` afterwards, e.g. for a signed-out visitor to a dashboard page. */
export function signInRouteWithNext(path: string): string {
  const next = resolveNextPath(path);
  return next === ROUTES.dashboard ? ROUTES.signIn : `${ROUTES.signIn}?next=${encodeURIComponent(next)}`;
}
