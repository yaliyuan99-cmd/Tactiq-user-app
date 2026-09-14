import { TITLE_SUFFIX } from '@/lib/usePageTitle';

/** "Train · Tactiq" → "Train". A bare "Tactiq" is returned unchanged. */
export function pageTitleFromDocumentTitle(documentTitle: string): string {
  const trimmed = documentTitle.trim();
  const suffix = TITLE_SUFFIX.trim();
  if (trimmed !== suffix && trimmed.endsWith(suffix)) {
    return trimmed.slice(0, trimmed.length - suffix.length).trim();
  }
  return trimmed;
}

/** The element a location hash points at, or null ("#a%20b" → id "a b"). */
export function hashTarget(hash: string, root: Document = document): HTMLElement | null {
  if (!hash || hash === '#') return null;
  let id = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    id = decodeURIComponent(id);
  } catch {}
  return id ? root.getElementById(id) : null;
}
