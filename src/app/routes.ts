/**
 * Every route in one place. Screens link with these constants, never string
 * literals.
 *
 * "/" is the public product page, reachable signed in and signed out. The
 * account screens are mounted twice: under "/dashboard" for a signed-in
 * account, and under "/demo" as a guest demonstration that saves nothing to an
 * account. ROUTES holds the canonical /dashboard spelling; the mapping between
 * the two bases lives in routing/sections.ts.
 */
export const ROUTES = {
  root: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  onboarding: '/onboarding',
  dashboard: '/dashboard',
  connect: '/dashboard/connect',
  calibrate: '/dashboard/calibrate',
  train: '/dashboard/train',
  simulator: '/dashboard/simulator',
  commands: '/dashboard/commands',
  history: '/dashboard/history',
  settings: '/dashboard/settings',
  help: '/dashboard/help',
  demo: '/demo',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** A single lesson inside Practice → Learn. */
export function lessonRoute(lessonId: string): string {
  return `${ROUTES.train}/${lessonId}`;
}

/** Deep link into Help at a section id. */
export function helpRoute(sectionId?: string): string {
  return sectionId ? `${ROUTES.help}#${sectionId}` : ROUTES.help;
}
