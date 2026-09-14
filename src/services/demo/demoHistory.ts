/**
 * Sample activity for Demo Mode: about a week of simulated simulator practice, so the
 * dashboard and history screens have something honest to show on first run.
 * Every record is marked `seeded: true` and `evidence: 'simulated'`. The set
 * is deterministic — the same seed and the same "now" always give the same
 * records — and never includes an emergency.
 */
import { resolveCommand, type CommandToken } from '@/domain/commands';
import { CONTACT_KEYS, siblingContact, type ContactKey } from '@/domain/contacts';
import { getLesson, type LessonId } from '@/domain/lessons';
import type { GestureEvent, GestureEventMode, GestureEventSource, GestureOutcome } from '@/domain/models';
import { daysAgo, startOfDay } from '@/lib/time';
import { mulberry32, pick, randomInt, type Random } from './prng';

export const DEMO_HISTORY_SEED = 0x7ac71c;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Past-day sessions fall between 08:00 and 21:00 local time. */
const DAY_WINDOW_START_MS = 8 * HOUR_MS;
const DAY_WINDOW_END_MS = 21 * HOUR_MS;
/** Today's sessions finish at least this long before "now" when there is room. */
const TODAY_MARGIN_MS = 5 * MINUTE_MS;
/** Early in the morning, today's sessions go in this stretch before "now" (never before midnight). */
const TODAY_FALLBACK_MS = 3 * HOUR_MS;
const MISMATCH_CHANCE = 0.12;

type DemoLessonId = Extract<LessonId, 'squeeze_to_activate' | 'confirm_and_back' | 'next_previous_read'>;
type DemoSession = { readonly kind: 'lesson'; readonly lessonId: DemoLessonId } | { readonly kind: 'guided' | 'free' };

interface SessionPlan {
  readonly daysAgo: number;
  readonly session: DemoSession;
}

/**
 * A believable first week of simulator practice. Deliberately no lesson
 * records: training progress starts at zero in Demo Mode, and history must
 * never claim a lesson was practised when the Train page shows it untouched.
 */
export const DEMO_SCHEDULE: readonly SessionPlan[] = [
  { daysAgo: 6, session: { kind: 'guided' } },
  { daysAgo: 5, session: { kind: 'guided' } },
  { daysAgo: 5, session: { kind: 'free' } },
  { daysAgo: 4, session: { kind: 'guided' } },
  { daysAgo: 3, session: { kind: 'free' } },
  { daysAgo: 2, session: { kind: 'free' } },
  { daysAgo: 2, session: { kind: 'guided' } },
  { daysAgo: 1, session: { kind: 'guided' } },
  { daysAgo: 0, session: { kind: 'guided' } },
];

interface Draft {
  source: GestureEventSource;
  mode: GestureEventMode;
  targetContact: ContactKey | null;
  detectedContact: ContactKey | null;
  token: CommandToken | null;
  durationMs: number;
  outcome: GestureOutcome;
  lessonId?: LessonId;
  /** Gap before this event within its session (0 for the first). */
  gapMs: number;
  isTap: boolean;
}

interface DraftSession {
  readonly daysAgo: number;
  /** Where in its slot the session starts, 0–1. */
  readonly startFraction: number;
  readonly drafts: Draft[];
}

function tapToken(contact: ContactKey): CommandToken | null {
  return resolveCommand(contact, 'tap')?.token ?? null;
}

/** Every draft consumes the same four random numbers, so outcomes never depend on the clock. */
function tapDraft(
  random: Random,
  base: Pick<Draft, 'source' | 'mode' | 'lessonId'>,
  target: ContactKey | null,
  index: number,
): Draft {
  const gap = randomInt(random, 9_000, 40_000);
  const freeContact = pick(random, CONTACT_KEYS);
  const missRoll = random();
  const durationMs = randomInt(random, 120, 420);
  const miss = target !== null && missRoll < MISMATCH_CHANCE;
  const detected = target === null ? freeContact : miss ? siblingContact(target) : target;
  return {
    ...base,
    targetContact: target,
    detectedContact: detected,
    token: tapToken(detected),
    durationMs,
    outcome: miss ? 'mismatch' : 'recognised',
    gapMs: index === 0 ? 0 : gap,
    isTap: true,
  };
}

function squeezeDraft(random: Random, lessonId: LessonId, index: number): Draft {
  const gap = randomInt(random, 9_000, 40_000);
  random();
  random();
  const durationMs = randomInt(random, 160, 420);
  return {
    source: 'training',
    mode: 'lesson',
    lessonId,
    targetContact: null,
    detectedContact: null,
    token: null,
    durationMs,
    outcome: 'recognised',
    gapMs: index === 0 ? 0 : gap,
    isTap: false,
  };
}

function draftSession(random: Random, plan: SessionPlan): DraftSession {
  const startFraction = random();
  const { session } = plan;
  let drafts: Draft[];
  if (session.kind === 'lesson') {
    const base = { source: 'training', mode: 'lesson', lessonId: session.lessonId } as const;
    drafts = getLesson(session.lessonId).steps.map((step, i) =>
      step.kind === 'tap' ? tapDraft(random, base, step.contact, i) : squeezeDraft(random, session.lessonId, i),
    );
  } else {
    const count = randomInt(random, 5, 7);
    const base = { source: 'simulator', mode: session.kind } as const;
    drafts = Array.from({ length: count }, (_, i) =>
      tapDraft(random, base, session.kind === 'guided' ? pick(random, CONTACT_KEYS) : null, i),
    );
  }
  return { daysAgo: plan.daysAgo, startFraction, drafts };
}

/** Turns 2–4 recognised taps into presses that were too long to be a tap. */
function addRejectedPresses(random: Random, sessions: readonly DraftSession[]): void {
  const candidates = sessions.flatMap((s) => s.drafts).filter((d) => d.isTap && d.outcome === 'recognised');
  const count = Math.min(candidates.length, randomInt(random, 2, 4));
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(random() * (candidates.length - i));
    const chosen = candidates[j];
    const swap = candidates[i];
    if (!chosen || !swap) continue;
    candidates[j] = swap;
    candidates[i] = chosen;
    chosen.outcome = 'rejected_duration';
    chosen.token = null;
    chosen.durationMs = randomInt(random, 600, 1400);
  }
}

function spanOf(session: DraftSession): number {
  return session.drafts.reduce((sum, d) => sum + d.gapMs, 0);
}

/** Generates the sample records, oldest first. Pure: no storage, no clock reads. */
export function generateDemoEvents(now: Date, seed: number = DEMO_HISTORY_SEED): GestureEvent[] {
  const random = mulberry32(seed);
  const sessions = DEMO_SCHEDULE.map((plan) => draftSession(random, plan));
  addRejectedPresses(random, sessions);

  const nowMs = now.getTime();
  const events: GestureEvent[] = [];
  const days = [...new Set(sessions.map((s) => s.daysAgo))].sort((a, b) => b - a);

  for (const day of days) {
    const daySessions = sessions.filter((s) => s.daysAgo === day);
    const dayStart = startOfDay(daysAgo(day, now)).getTime();
    const totalSpan = daySessions.reduce((sum, s) => sum + spanOf(s), 0);
    let windowStart = dayStart + DAY_WINDOW_START_MS;
    let windowEnd = dayStart + DAY_WINDOW_END_MS;
    if (day === 0) {
      windowEnd = Math.min(windowEnd, nowMs - TODAY_MARGIN_MS);
      if (windowEnd - windowStart < totalSpan) {
        // Too early in the day for the usual window: use the last few hours of today instead.
        windowStart = Math.max(dayStart, nowMs - TODAY_FALLBACK_MS);
        windowEnd = nowMs;
      }
    }
    const slotMs = Math.max(0, windowEnd - windowStart) / daySessions.length;

    daySessions.forEach((session, slot) => {
      const span = spanOf(session);
      const scale = span > slotMs ? slotMs / Math.max(span, 1) : 1;
      const start = windowStart + slot * slotMs + session.startFraction * (slotMs - span * scale);
      let elapsed = 0;
      for (const draft of session.drafts) {
        elapsed += draft.gapMs * scale;
        const at = Math.min(Math.round(start + elapsed), nowMs);
        events.push({
          id: `demo_${String(events.length + 1).padStart(3, '0')}`,
          at: new Date(at).toISOString(),
          source: draft.source,
          mode: draft.mode,
          targetContact: draft.targetContact,
          detectedContact: draft.detectedContact,
          token: draft.token,
          durationMs: draft.durationMs,
          outcome: draft.outcome,
          evidence: 'simulated',
          seeded: true,
          ...(draft.lessonId ? { lessonId: draft.lessonId } : {}),
        });
      }
    });
  }
  return events;
}
