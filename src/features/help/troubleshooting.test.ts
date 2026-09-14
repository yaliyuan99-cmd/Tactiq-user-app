import { ROUTES } from '@/app/routes';
import { DEVICE_NAME } from '@/domain/protocol';
import { HELP_SECTION_IDS } from './helpSections';
import { TROUBLESHOOTING_ENTRIES, TROUBLESHOOTING_ENTRY_IDS } from './troubleshooting';

const ROUTE_PATHS: readonly string[] = Object.values(ROUTES);

describe('troubleshooting entries', () => {
  it('answers the eight problems, in order', () => {
    expect(TROUBLESHOOTING_ENTRIES.map((entry) => entry.question)).toEqual([
      'My browser says Bluetooth is unavailable',
      'The Bluetooth window shows no ring',
      'I denied Bluetooth permission',
      'The ring disconnected',
      'Commands are not recognised',
      'The emergency hold does not complete',
      'I cannot hear announcements',
      'My progress disappeared',
    ]);
  });

  it('uses unique ids that never collide with section ids', () => {
    expect(new Set(TROUBLESHOOTING_ENTRY_IDS).size).toBe(TROUBLESHOOTING_ENTRY_IDS.length);
    for (const id of TROUBLESHOOTING_ENTRY_IDS) {
      expect(HELP_SECTION_IDS as readonly string[]).not.toContain(id);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('gives every entry something to try and links only to app routes', () => {
    for (const entry of TROUBLESHOOTING_ENTRIES) {
      expect(entry.intro.length).toBeGreaterThan(0);
      expect(entry.steps.length).toBeGreaterThan(0);
      expect(entry.links.length).toBeGreaterThan(0);
      for (const link of entry.links) {
        const path = link.to.split('#')[0] ?? '';
        const isLesson = path.startsWith(`${ROUTES.train}/`);
        expect(isLesson || ROUTE_PATHS.includes(path)).toBe(true);
      }
    }
  });

  it('covers the specific advice for each problem', () => {
    const byId = new Map(TROUBLESHOOTING_ENTRIES.map((entry) => [entry.id, entry.steps.join(' ')] as const));
    expect(byId.get('bluetooth-unavailable')).toMatch(/Chrome/);
    expect(byId.get('bluetooth-unavailable')).toMatch(/Safari, Firefox and every browser on iPhone and iPad/);
    expect(byId.get('bluetooth-unavailable')).toMatch(/https:\/\//);
    expect(byId.get('no-ring-in-bluetooth-window')).toContain(DEVICE_NAME);
    expect(byId.get('ring-disconnected')).toMatch(/Forget this ring/);
    expect(byId.get('commands-not-recognised')).toMatch(/Squeeze first/);
    expect(byId.get('commands-not-recognised')).toMatch(/List view/);
    expect(byId.get('emergency-hold-incomplete')).toMatch(/full five seconds/);
    expect(byId.get('cannot-hear-announcements')).toMatch(/Audio announcements/);
    expect(byId.get('progress-disappeared')).toMatch(/Private or incognito/);
  });

  it('orders only the permission steps, which must be followed in sequence', () => {
    expect(TROUBLESHOOTING_ENTRIES.filter((entry) => entry.ordered).map((entry) => entry.id)).toEqual([
      'bluetooth-permission-denied',
    ]);
  });

  it('never implies the emergency simulation contacts anyone', () => {
    const emergency = TROUBLESHOOTING_ENTRIES.find((entry) => entry.id === 'emergency-hold-incomplete');
    expect(emergency?.note).toBe('The hold is a simulation. Completing it never sends an emergency message or contacts anyone.');
  });
});
