import { CONTACT_KEYS } from '@/domain/contacts';
import { CONTACT_COORDINATES, HAND_OUTLINE, contactPosition } from './geometry';

describe('hand geometry', () => {
  it('has a coordinate for every contact point', () => {
    for (const key of CONTACT_KEYS) expect(CONTACT_COORDINATES[key]).toBeDefined();
  });

  it('keeps the website drawing: wrist, palm, four fingers and a rotated thumb', () => {
    expect(HAND_OUTLINE.map((r) => r.id)).toEqual(['wrist', 'palm', 'index', 'middle', 'ring', 'pinky', 'thumb']);
    expect(HAND_OUTLINE.find((r) => r.id === 'thumb')?.transform).toBe('rotate(-35 95 290)');
  });

  it('positions points as percentages and mirrors x for the left hand', () => {
    expect(contactPosition('index_tip', 'right')).toEqual({ x: 108, y: 112, left: '36%', top: '28%' });
    expect(contactPosition('index_tip', 'left')).toEqual({ x: 192, y: 112, left: '64%', top: '28%' });
    expect(contactPosition('pinky_base', 'left').x).toBe(72);
  });
});
