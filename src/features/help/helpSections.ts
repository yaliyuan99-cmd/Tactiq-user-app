/**
 * The Help page's sections, in reading order. Other screens deep-link with
 * helpRoute('<id>'), so these ids are a public contract: never rename one.
 */

export const HELP_SECTION_IDS = [
  'getting-started',
  'commands',
  'practising',
  'accessibility',
  'troubleshooting',
  'limitations',
  'privacy',
  'contact',
] as const;

export type HelpSectionId = (typeof HELP_SECTION_IDS)[number];

/** The id of the "On this page" card, so every section can link back to it. */
export const HELP_CONTENTS_ID = 'help-contents';

export interface HelpSectionInfo {
  readonly id: HelpSectionId;
  /** The section's h2 and its link text in the contents list. */
  readonly title: string;
}

const TITLES: Readonly<Record<HelpSectionId, string>> = {
  'getting-started': 'Getting started',
  commands: 'The nine commands',
  practising: 'Practising',
  accessibility: 'Accessibility',
  troubleshooting: 'Troubleshooting',
  limitations: 'Project limitations',
  privacy: 'Privacy and your data',
  contact: 'Contact',
};

export const HELP_SECTIONS: readonly HelpSectionInfo[] = HELP_SECTION_IDS.map((id) => ({ id, title: TITLES[id] }));

export function getHelpSection(id: HelpSectionId): HelpSectionInfo {
  return { id, title: TITLES[id] };
}

export function isHelpSectionId(value: unknown): value is HelpSectionId {
  return typeof value === 'string' && (HELP_SECTION_IDS as readonly string[]).includes(value);
}

/** The id of a section's h2, used for aria-labelledby and as the in-page focus target. */
export function helpHeadingId(id: HelpSectionId): string {
  return `${id}-heading`;
}

/**
 * The known element id a location hash points at, or null.
 * "#troubleshooting" → "troubleshooting"; unknown, empty or malformed hashes → null.
 */
export function targetIdFromHash(hash: string, knownIds: readonly string[]): string | null {
  if (!hash) return null;
  let id = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  return id && knownIds.includes(id) ? id : null;
}
