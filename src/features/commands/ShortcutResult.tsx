import { Callout } from '@/components';

export type ShortcutResultState =
  | { readonly kind: 'saved' | 'restored'; readonly summary: readonly string[]; readonly persisted: boolean }
  | { readonly kind: 'error'; readonly message: string }
  /** Save was activated with no pending changes. */
  | { readonly kind: 'nothing'; readonly message: string };

export const NOT_PERSISTED_NOTE = 'This browser did not store them, so they last only until you close this page.';

/** The outcome of the last save or restore, with the values now in effect. */
export function ShortcutResult({ result }: { result: ShortcutResultState }) {
  if (result.kind === 'error') {
    return (
      <Callout kind="danger" role="alert" title="Shortcuts not saved">
        {result.message}
      </Callout>
    );
  }
  if (result.kind === 'nothing') {
    return (
      <Callout kind="info" role="status" title="Nothing to save">
        {result.message}
      </Callout>
    );
  }
  return (
    <Callout kind="success" role="status" title={result.kind === 'saved' ? 'Shortcuts saved' : 'Default shortcuts restored'}>
      <ul className="grid gap-0.5">
        {result.summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {!result.persisted && <p className="mt-2">{NOT_PERSISTED_NOTE}</p>}
    </Callout>
  );
}
