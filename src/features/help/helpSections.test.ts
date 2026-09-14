import { helpRoute } from '@/app/routes';
import {
  HELP_SECTIONS,
  HELP_SECTION_IDS,
  getHelpSection,
  helpHeadingId,
  isHelpSectionId,
  targetIdFromHash,
} from './helpSections';

describe('help sections', () => {
  it('keeps the public section ids, in reading order', () => {
    expect(HELP_SECTION_IDS).toEqual([
      'getting-started',
      'commands',
      'practising',
      'accessibility',
      'troubleshooting',
      'limitations',
      'privacy',
      'contact',
    ]);
    expect(HELP_SECTIONS.map((section) => section.id)).toEqual(HELP_SECTION_IDS);
  });

  it('gives every section a distinct title', () => {
    const titles = HELP_SECTIONS.map((section) => section.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(getHelpSection('limitations').title).toBe('Project limitations');
    expect(getHelpSection('troubleshooting').title).toBe('Troubleshooting');
  });

  it('matches the deep links other screens build with helpRoute', () => {
    expect(helpRoute('troubleshooting')).toBe('/dashboard/help#troubleshooting');
    expect(isHelpSectionId('troubleshooting')).toBe(true);
    expect(isHelpSectionId('limitations')).toBe(true);
    expect(isHelpSectionId('faq')).toBe(false);
    expect(isHelpSectionId(42)).toBe(false);
  });

  it('derives heading ids from section ids', () => {
    expect(helpHeadingId('privacy')).toBe('privacy-heading');
  });

  describe('targetIdFromHash', () => {
    const known = ['troubleshooting', 'ring disconnected'];

    it('returns a known id with or without the leading #', () => {
      expect(targetIdFromHash('#troubleshooting', known)).toBe('troubleshooting');
      expect(targetIdFromHash('troubleshooting', known)).toBe('troubleshooting');
    });

    it('decodes percent-encoded hashes', () => {
      expect(targetIdFromHash('#ring%20disconnected', known)).toBe('ring disconnected');
    });

    it('returns null for empty, unknown or malformed hashes', () => {
      expect(targetIdFromHash('', known)).toBeNull();
      expect(targetIdFromHash('#', known)).toBeNull();
      expect(targetIdFromHash('#page-title', known)).toBeNull();
      expect(targetIdFromHash('#%E0%A4%A', known)).toBeNull();
    });
  });
});
