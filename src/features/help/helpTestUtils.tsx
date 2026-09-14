import { type ReactElement } from 'react';
import { ROUTES } from '@/app/routes';
import { act, renderApp, type RenderAppOptions, type RenderAppResult } from '@/test/renderApp';
import HelpPage from './HelpPage';

/** Renders Help (or `ui`) in the full provider stack and lets the stack finish restoring the session. */
export async function renderHelpPage(options: RenderAppOptions = {}, ui: ReactElement = <HelpPage />): Promise<RenderAppResult> {
  const result = renderApp(ui, { route: ROUTES.help, ...options });
  await act(async () => {});
  return result;
}
