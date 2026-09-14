import { useEffect } from 'react';

export const TITLE_SUFFIX = ' · Tactiq';

/** Sets the document title as "<title> · Tactiq". Pass '' for the bare product name. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title}${TITLE_SUFFIX}` : 'Tactiq';
  }, [title]);
}
