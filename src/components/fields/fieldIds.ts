import { useId, type ReactNode } from 'react';

export interface FieldIds {
  readonly id: string;
  readonly hintId: string | undefined;
  readonly errorId: string | undefined;
  /** Space-separated hint then error ids, or undefined when neither is shown. */
  readonly describedBy: string | undefined;
}

export function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== '';
}

/** Stable ids for a control and its hint / error, wired for aria-describedby. */
export function useFieldIds(explicitId: string | undefined, hint: ReactNode, error: ReactNode): FieldIds {
  const generated = useId();
  const id = explicitId ?? `field-${generated.replace(/:/g, '')}`;
  const hintId = hasContent(hint) ? `${id}-hint` : undefined;
  const errorId = hasContent(error) ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { id, hintId, errorId, describedBy };
}

export const CONTROL_CLASSES =
  'block w-full min-h-12 rounded-md border border-input bg-input-background px-3 py-2.5 text-foreground ' +
  'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive';
