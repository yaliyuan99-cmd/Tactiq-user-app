/**
 * The ten designed parts of the Tactiq ring.
 *
 * NOTHING HERE DESCRIBES MANUFACTURED HARDWARE. No ring has been built, so
 * every part carries the `design_intent` evidence label without exception.
 *
 * The finer and more important distinction is `benchStatus`. The three
 * magnetometers and the passive thumb magnet are the sensing architecture from
 * the research paper, checked in simulation only; the bench firmware that
 * exists today senses with flex sensors, force-sensitive resistors and an IMU —
 * different components reading different physics. The two must never be
 * presented as the same thing, so each part says which it is rather than
 * letting the page blend them into one story.
 *
 * No dimension, mass, battery capacity, part number, material or tolerance
 * appears here, because none has ever been measured or specified. A figure that
 * is not already in `@/domain` does not belong on this page.
 */
import type { EvidenceSource } from './evidence';

export const RING_PART_IDS = [
  'outer_shell',
  'inner_carrier',
  'magnetometer_1',
  'magnetometer_2',
  'magnetometer_3',
  'squeeze_sensor',
  'haptic_actuator',
  'controller',
  'power_system',
  'thumb_magnet',
] as const;

export type RingPartId = (typeof RING_PART_IDS)[number];

export function isRingPartId(value: unknown): value is RingPartId {
  return typeof value === 'string' && (RING_PART_IDS as readonly string[]).includes(value);
}

/** Where a part is worn. The thumb magnet is not part of the ring at all. */
export type Placement = 'ring' | 'thumb';

/**
 * How a designed part relates to the bench rig that actually exists. This is
 * the honesty axis of the whole section: `substituted` means the designed part
 * is absent and something else does the job with different physics.
 */
export type BenchStatus = 'present' | 'substituted' | 'absent';

export const BENCH_STATUS_TEXT: Readonly<Record<BenchStatus, string>> = {
  present: 'Has a counterpart on the bench rig',
  substituted: 'Not fitted — a different sensor stands in',
  absent: 'Nothing on the bench rig corresponds to it',
};

/** How each part is drawn: a whole band of material, or a discrete block. */
export type PartShape = 'shell_band' | 'carrier_band' | 'block';

export interface RingPart {
  readonly id: RingPartId;
  /** 1-based number, used as the label on the diagram and in the parts list. */
  readonly index: number;
  readonly name: string;
  /** One line naming the part's job, for the always-present text alternative. */
  readonly role: string;
  /** What it does and why it is there. */
  readonly description: string;
  readonly evidence: EvidenceSource;
  readonly placement: Placement;
  readonly shape: PartShape;
  readonly benchStatus: BenchStatus;
  /** What the bench firmware actually has, in plain words. */
  readonly benchNote: string;
  /** Position on the band, in degrees clockwise from the top of the diagram. */
  readonly angleDeg: number;
  /** How far the part travels outwards when the view is fully exploded. */
  readonly explodeTravel: number;
}

export const RING_PARTS: readonly RingPart[] = [
  {
    id: 'outer_shell',
    index: 1,
    name: 'Outer shell',
    role: 'The sealed outer band you see, grip and squeeze.',
    description:
      'The moulded outer band. It carries the surface you squeeze, seals the electronics against sweat and knocks, and is the part that would be sized to the wearer’s finger. It is drawn lifting away first because it is the only part a wearer ever touches.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'shell_band',
    benchStatus: 'absent',
    benchNote: 'The research rig is not a ring. There is no shell, and nothing has been worn on a finger.',
    angleDeg: 0,
    explodeTravel: 0,
  },
  {
    id: 'inner_carrier',
    index: 2,
    name: 'Inner carrier',
    role: 'Rigid sleeve that holds every part at a known angle and spacing.',
    description:
      'A rigid inner sleeve holding each part at a fixed angle and distance from the others. This is not packaging: the sensing design only works if the three magnetometers keep an exactly known geometry, so the carrier is what makes the position maths possible at all.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'carrier_band',
    benchStatus: 'absent',
    benchNote: 'The bench sensors are mounted on a breadboard harness, not in a fixed ring geometry.',
    angleDeg: 0,
    explodeTravel: 0,
  },
  {
    id: 'magnetometer_1',
    index: 3,
    name: 'Magnetometer 1',
    role: 'Sensing channel 1 of 3, on the thumb side of the band.',
    description:
      'One of three magnetometers spaced 120° apart around the band, sitting on the thumb side. It reports how strongly, and from which direction, it feels the passive magnet worn on the thumb. Reading the thumb magnetically means no camera and no microphone are ever involved.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'substituted',
    benchNote:
      'No magnetometer is fitted. The bench firmware senses with flex sensors, force-sensitive resistors and an IMU, which is different physics from the design in the paper.',
    angleDeg: 90,
    explodeTravel: 62,
  },
  {
    id: 'magnetometer_2',
    index: 4,
    name: 'Magnetometer 2',
    role: 'Sensing channel 2 of 3, 120° around the band.',
    description:
      'The second of the three-channel sensing triad. Three separated readings are needed because one sensor alone cannot tell a weak magnet nearby from a strong magnet far away; the differences between the channels are what carry the thumb’s position.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'substituted',
    benchNote: 'No magnetometer is fitted. The bench firmware senses with flex sensors, force-sensitive resistors and an IMU instead.',
    angleDeg: 210,
    explodeTravel: 62,
  },
  {
    id: 'magnetometer_3',
    index: 5,
    name: 'Magnetometer 3',
    role: 'Sensing channel 3 of 3, completing the triad.',
    description:
      'The third channel completes the ring of sensors, so that no direction around the hand is a blind spot. The paper solves the thumb’s position from all three channels together; that solution has been checked in simulation only, never against a fitted sensor.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'substituted',
    benchNote: 'No magnetometer is fitted. The bench firmware senses with flex sensors, force-sensitive resistors and an IMU instead.',
    angleDeg: 330,
    explodeTravel: 62,
  },
  {
    id: 'squeeze_sensor',
    index: 6,
    name: 'Squeeze sensor',
    role: 'Detects the deliberate squeeze that opens the command window.',
    description:
      'Detects the deliberate squeeze that opens a short command window. Every command is gated behind it, which is what stops an ordinary brush of the thumb against a finger from firing anything. If this part fails closed the ring simply does nothing, which is the safe direction to fail in.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'present',
    benchNote:
      'A force-sensitive resistor on the bench rig plays this part, so the gate itself is the one piece of the interaction with a working stand-in.',
    angleDeg: 150,
    explodeTravel: 46,
  },
  {
    id: 'haptic_actuator',
    index: 7,
    name: 'Haptic actuator',
    role: 'Vibration confirming the ring heard you, without speech.',
    description:
      'A small vibration motor that answers “did that register?” on the hand itself, rather than adding a second voice for the wearer to listen past. It confirms only that the ring accepted a command — never that the phone carried the action out, because the ring cannot know that.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'absent',
    benchNote: 'The bench rig has no haptic output of any kind.',
    angleDeg: 30,
    explodeTravel: 46,
  },
  {
    id: 'controller',
    index: 8,
    name: 'MCU and BLE controller',
    role: 'Runs recognition on the ring; sends only the accepted command.',
    description:
      'The microcontroller that turns sensor channels into a decision, and the Bluetooth Low Energy radio that carries the result. Recognition finishing here is the whole privacy claim: only an accepted command token leaves the ring, so raw sensor data never reaches a phone or a server.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'present',
    benchNote: 'A development microcontroller runs the bench firmware and speaks the same command protocol this app reads.',
    angleDeg: 250,
    explodeTravel: 54,
  },
  {
    id: 'power_system',
    index: 9,
    name: 'Power system',
    role: 'Battery, charging contacts and regulation.',
    description:
      'Battery, charging contacts and voltage regulation. No run-time figure is claimed here, because none has been measured: the research firmware reports a fixed battery percentage, which this app treats as a placeholder rather than a reading.',
    evidence: 'design_intent',
    placement: 'ring',
    shape: 'block',
    benchStatus: 'absent',
    benchNote:
      'The bench rig is powered from its development board. Its reported battery percentage is a fixed placeholder, not a measurement.',
    angleDeg: 290,
    explodeTravel: 54,
  },
  {
    id: 'thumb_magnet',
    index: 10,
    name: 'Passive thumb magnet',
    role: 'Worn on the thumb, not on the ring. No battery, no radio.',
    description:
      'A small permanent magnet worn on the thumb. It is passive: nothing to charge, nothing to pair, nothing that can transmit. It simply gives the magnetometers something to find. It is drawn away from the ring because it is worn away from the ring — a second worn item, not a ring part.',
    evidence: 'design_intent',
    placement: 'thumb',
    shape: 'block',
    benchStatus: 'absent',
    benchNote: 'Nothing is worn on the thumb for the bench rig; it senses the finger itself.',
    angleDeg: 0,
    explodeTravel: 0,
  },
];

const BY_ID = new Map<RingPartId, RingPart>(RING_PARTS.map((part) => [part.id, part]));

export function getRingPart(id: RingPartId): RingPart {
  const part = BY_ID.get(id);
  if (!part) throw new Error(`Unknown ring part: ${id}`);
  return part;
}

/** The parts drawn as discrete blocks around the band, in diagram order. */
export const BAND_PARTS: readonly RingPart[] = RING_PARTS.filter(
  (part) => part.placement === 'ring' && part.shape === 'block',
);

/**
 * The two sensing stories, kept as data so the wording is tested rather than
 * buried in a component. Removing either half would leave the page implying
 * that the designed sensing has been built, which it has not.
 */
export const SENSING_STORIES: readonly { readonly heading: string; readonly body: string }[] = [
  {
    heading: 'What the paper designs',
    body: 'Three magnetometers and a passive magnet worn on the thumb. This architecture has been checked in simulation only. No magnetometer has ever been fitted to anything.',
  },
  {
    heading: 'What the bench rig does',
    body: 'The firmware that exists today senses with flex sensors, force-sensitive resistors and an IMU — different components reading different physics. Where the two disagree, this page says so on the part itself.',
  },
];
