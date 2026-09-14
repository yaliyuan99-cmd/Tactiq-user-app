/** Test helpers for the Settings page. Not used by the running app. */
import { type ReactElement } from 'react';
import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import { act, renderApp, screen, type RenderAppOptions, type RenderAppResult } from '@/test/renderApp';
import SettingsPage from '../SettingsPage';

export const SIGN_IN_STUB = 'Sign-in screen';

/**
 * Renders `ui` (the whole page by default) at /dashboard/settings, with a
 * stub sign-in route to land on, and lets the provider stack settle.
 */
export async function renderSettings(
  options: RenderAppOptions = {},
  ui: ReactElement = <SettingsPage />,
): Promise<RenderAppResult> {
  const result = renderApp(
    <Routes>
      <Route path={ROUTES.settings} element={ui} />
      <Route path={ROUTES.signIn} element={<h1>{SIGN_IN_STUB}</h1>} />
    </Routes>,
    { route: ROUTES.settings, ...options },
  );
  await act(async () => {});
  return result;
}

export function politeRegion(): HTMLElement {
  return screen.getByTestId('live-region-polite');
}

export function sectionRegion(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

class FakeUtterance {
  rate = 1;
  lang = '';
  constructor(readonly text: string) {}
}

/** Installs a fake speechSynthesis. Call before rendering; call `removeBrowserFeedback` afterwards. */
export function installSpeech() {
  const synth = { speak: vi.fn<(utterance: FakeUtterance) => void>(), cancel: vi.fn() };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  return synth;
}

export function installVibration(result = true) {
  const vibrate = vi.fn(() => result);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate });
  return vibrate;
}

export function removeBrowserFeedback(): void {
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
  Reflect.deleteProperty(navigator, 'vibrate');
}
