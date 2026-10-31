import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/models';
import { FeedbackProvider } from '@/services/feedback/FeedbackProvider';
import { PreferencesProvider } from '@/services/preferences/PreferencesProvider';
import { writePreferences } from '@/services/preferences/storedPreferences';
import { MemoryStorageAdapter, type StorageAdapter } from '@/services/storage/StorageAdapter';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper' | 'queries'> {
  /** Initial router location. Defaults to "/". */
  readonly route?: string;
  /** Defaults to a fresh MemoryStorageAdapter. */
  readonly storage?: StorageAdapter;
  /** Seeded into storage (merged over the defaults) before the first render. */
  readonly preferences?: Partial<UserPreferences>;
}

export type RenderWithProvidersResult = RenderResult & { readonly storage: StorageAdapter };

/** Renders inside MemoryRouter → PreferencesProvider → FeedbackProvider. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', storage = new MemoryStorageAdapter(), preferences, ...options }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  if (preferences) {
    // Through the app's own writer, so each half lands under the key the app
    // reads it from. The whole object under the device-wide key is the shape a
    // pre-profiles build leaves, which is no longer adopted silently.
    writePreferences(storage, { ...DEFAULT_PREFERENCES, ...preferences, version: 1 });
  }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <PreferencesProvider storage={storage}>
          <FeedbackProvider>{children}</FeedbackProvider>
        </PreferencesProvider>
      </MemoryRouter>
    );
  }
  const renderOptions: Omit<RenderOptions, 'queries'> = { ...options, wrapper: Wrapper };
  const result: RenderResult = render(ui, renderOptions);
  return { ...result, storage };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
