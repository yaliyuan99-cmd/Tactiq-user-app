import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HELP_CONTENTS_ID, HELP_SECTION_IDS, targetIdFromHash } from './helpSections';
import { openDetailsById, openSectionDisclosure, scrollToId } from './revealTarget';
import { TROUBLESHOOTING_ENTRY_IDS } from './troubleshooting';

/** Every id on the Help page an address hash may point at. */
export const HELP_TARGET_IDS: readonly string[] = [HELP_CONTENTS_ID, ...HELP_SECTION_IDS, ...TROUBLESHOOTING_ENTRY_IDS];

/**
 * Follows the address hash on the Help page.
 *
 * - Whenever the hash names a troubleshooting answer, that answer opens, and a
 *   hash naming a collapsible section opens that section.
 * - When the page first renders with a hash, the target scrolls into view
 *   (instantly when reduced motion is on). The page is code-split, so the
 *   browser's own jump to the fragment happened before the content existed.
 *   Focus is left alone: the app shell decides focus after navigation.
 */
export function useHelpHashTarget(): void {
  const { hash } = useLocation();
  const { prefersReducedMotion } = usePreferences();
  const initial = useRef({ hash, reduced: prefersReducedMotion });

  useEffect(() => {
    const id = targetIdFromHash(hash, HELP_TARGET_IDS);
    if (!id) return;
    openDetailsById(id);
    openSectionDisclosure(id);
  }, [hash]);

  useEffect(() => {
    const { hash: initialHash, reduced } = initial.current;
    const id = targetIdFromHash(initialHash, HELP_TARGET_IDS);
    if (id) scrollToId(id, reduced ? 'auto' : 'smooth');
  }, []);
}
