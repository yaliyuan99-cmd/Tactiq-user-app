/**
 * Guided practice: which command to ask for next, how to say it, and what an
 * attempt means for that target. Pure: no React, no services.
 */
import { COMMANDS, getCommand, type CommandToken, type ShortcutMapping } from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { describeRingResult, type RingResult } from '@/features/practice/ringResults';
import type { FeedbackKind } from '@/services/feedback/types';

/** Returns a number in [0, 1), like Math.random. Injectable so tests can choose targets. */
export type RandomSource = () => number;

/** How long a correct answer stays on screen before the next target appears. */
export const ADVANCE_DELAY_MS = 700;

/** The eight tap commands, in contact order. Emergency is added only when the user asks for it. */
export const GUIDED_TAP_TARGETS: readonly CommandToken[] = COMMANDS.filter((command) => command.interaction === 'tap').map(
  (command) => command.token,
);

export function guidedTargetPool(includeEmergency: boolean): readonly CommandToken[] {
  return includeEmergency ? [...GUIDED_TAP_TARGETS, 'emergency'] : GUIDED_TAP_TARGETS;
}

/** A random target from the pool that is never the same as the previous one. */
export function pickGuidedTarget(
  previous: CommandToken | null,
  includeEmergency: boolean,
  random: RandomSource = Math.random,
): CommandToken {
  const candidates = guidedTargetPool(includeEmergency).filter((token) => token !== previous);
  const value = random();
  const unit = Number.isFinite(value) ? Math.max(0, value) : 0;
  const index = Math.min(candidates.length - 1, Math.floor(unit * candidates.length));
  return candidates[index] ?? GUIDED_TAP_TARGETS[0] ?? 'confirm';
}

/** The contact the user is asked to use for a target. */
export function contactForTarget(target: CommandToken): ContactKey {
  return getCommand(target).contact;
}

export interface TargetWords {
  /** "Next", or the display label "Dismiss / Back" */
  readonly command: string;
  /** "Next", or "Dismiss or Back": the label as it is read aloud, never with a slash. */
  readonly spokenCommand: string;
  /** "middle finger base", or "hold the pinky fingertip for five seconds" */
  readonly where: string;
  /** "Next — middle finger base" */
  readonly visible: string;
  /** "Next, middle finger base" (a comma reads better aloud than a dash) */
  readonly spoken: string;
}

function place(contact: ContactKey): string {
  return getContact(contact).label.toLowerCase();
}

export function describeTarget(target: CommandToken): TargetWords {
  const command = getCommand(target);
  let where = place(command.contact);
  if (command.interaction === 'hold_5s') where = `hold the ${where} for five seconds`;
  else if (command.contact === 'pinky_tip') where = `${where}, brief tap`;
  return {
    command: command.label,
    spokenCommand: command.spokenLabel,
    where,
    visible: `${command.label} — ${where}`,
    spoken: `${command.spokenLabel}, ${where}`,
  };
}

/** Announced by "Repeat the prompt" and when guided practice is chosen. */
export function promptAnnouncement(target: CommandToken): string {
  return `Your target: ${describeTarget(target).spoken}.`;
}

/** Announced when a new target replaces the current one (skip, or after a correct answer). */
export function newTargetAnnouncement(target: CommandToken): string {
  return `New target: ${describeTarget(target).spoken}.`;
}

export type GuidedVerdict = 'correct' | 'wrong' | 'not_recognised';

export interface GuidedEvaluation {
  readonly verdict: GuidedVerdict;
  /** On-screen feedback in the prompt card, with the display labels. */
  readonly visibleMessage: string;
  /**
   * Said instead of the ring's own words, in the same moment and under the
   * same feedback kind, so it replaces them rather than following them. Never
   * contains a slash. Null when the ring's announcement already says
   * everything (a dropped press or a cancelled hold), so nothing is announced
   * twice.
   */
  readonly announcement: string | null;
  /** The ring's own feedback kind for this result; the guided words are sent under it. */
  readonly feedbackKind: FeedbackKind;
  /** Where the attempt landed when it was not the target, for the map. */
  readonly detectedContact: ContactKey | null;
  /** The Result column of the session log. */
  readonly logWords: string;
}

/** What one ring result means for the current target, in words. */
export function evaluateGuided(target: CommandToken, result: RingResult, mapping: ShortcutMapping): GuidedEvaluation {
  const words = describeTarget(target);
  const tryAgain = (command: string) => `Try again: ${command}, ${words.where}.`;
  const description = describeRingResult(result, mapping);

  if (result.kind === 'command' || result.kind === 'emergency') {
    const token: CommandToken = result.kind === 'command' ? result.token : 'emergency';
    const command = getCommand(token);
    if (token === target) {
      const correct = (label: string) =>
        token === 'emergency' ? `Correct: Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE}` : `Correct: ${label}.`;
      return {
        verdict: 'correct',
        visibleMessage: correct(command.label),
        announcement: correct(command.spokenLabel),
        feedbackKind: description.feedbackKind,
        detectedContact: null,
        logWords: 'Correct',
      };
    }
    const wrong = (label: string, retryLabel: string) =>
      token === 'emergency'
        ? `Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE} That was not the target. ${tryAgain(retryLabel)}`
        : `That was ${label}, on the ${place(result.contact)}. ${tryAgain(retryLabel)}`;
    return {
      verdict: 'wrong',
      visibleMessage: wrong(command.label, words.command),
      announcement: wrong(command.spokenLabel, words.spokenCommand),
      feedbackKind: description.feedbackKind,
      detectedContact: result.contact,
      logWords: `Not the target: ${command.label}`,
    };
  }

  return {
    verdict: 'not_recognised',
    visibleMessage: `${description.visibleMessage} ${tryAgain(words.command)}`,
    announcement: null,
    feedbackKind: description.feedbackKind,
    detectedContact: null,
    logWords: description.shortLabel,
  };
}

/** The announcement after a correct answer: the verdict, then the next target. */
export function correctAnnouncement(evaluation: GuidedEvaluation, next: CommandToken): string | null {
  if (!evaluation.announcement) return null;
  return `${evaluation.announcement} ${newTargetAnnouncement(next)}`;
}

export interface GuidedScore {
  readonly attempts: number;
  readonly correct: number;
}

export const EMPTY_SCORE: GuidedScore = { attempts: 0, correct: 0 };

export function addToScore(score: GuidedScore, verdict: GuidedVerdict): GuidedScore {
  return { attempts: score.attempts + 1, correct: score.correct + (verdict === 'correct' ? 1 : 0) };
}

/** "This session: 7 of 9 correct" */
export function scoreLine(score: GuidedScore): string {
  if (score.attempts === 0) return 'This session: no attempts yet';
  return `This session: ${score.correct} of ${score.attempts} correct`;
}
