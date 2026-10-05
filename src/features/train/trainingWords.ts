/** Words for lessons: status and actions on the Train page, titles, and the run summary sentence. Pure. */
import { getCommand } from '@/domain/commands';
import type { Lesson, LessonStep } from '@/domain/lessons';
import type { LessonStatus } from '@/domain/models';
import type { StepRecord } from './lessonRun';

export type LessonStatusLabel = 'Not started' | 'In progress' | 'Completed';
export type LessonActionLabel = 'Start' | 'Continue' | 'Practise again';

export function lessonStatusLabel(status: LessonStatus): LessonStatusLabel {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'complete':
      return 'Completed';
  }
}

export function lessonActionLabel(status: LessonStatus): LessonActionLabel {
  switch (status) {
    case 'not_started':
      return 'Start';
    case 'in_progress':
      return 'Continue';
    case 'complete':
      return 'Practise again';
  }
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

/** "a, b and c" */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * What a retry on a step is called in the summary sentence. These are
 * sentences a screen reader reads straight out, so commands appear under their
 * spoken labels ("Dismiss or Back"), never with the display slash.
 */
export function stepName(step: LessonStep): string {
  switch (step.kind) {
    case 'squeeze':
      return 'the squeeze';
    case 'tap':
      return getCommand(step.token).spokenLabel;
    case 'hold':
      return step.expect === 'cancel' ? 'cancelling the hold' : 'the full hold';
  }
}

function summaryLead(lesson: Lesson): string {
  const kinds = new Set(lesson.steps.map((step) => step.kind));
  if (kinds.size === 1 && kinds.has('squeeze')) return 'You opened the command window at every step';
  if (kinds.has('hold')) return 'You completed every hold step';
  return 'You found every point';
}

/** "You found every point, with one retry on Previous." — built from the run's retries, in step order. */
export function runSummarySentence(lesson: Lesson, records: readonly StepRecord[]): string {
  const retries = new Map<string, number>();
  lesson.steps.forEach((step, index) => {
    const record = records[index];
    const missed = record ? Math.max(0, record.attempts - record.correct) : 0;
    if (missed === 0) return;
    const name = stepName(step);
    retries.set(name, (retries.get(name) ?? 0) + missed);
  });
  const lead = summaryLead(lesson);
  if (retries.size === 0) return `${lead}, with no retries.`;
  const parts = [...retries].map(([name, count]) => `${countWord(count)} ${count === 1 ? 'retry' : 'retries'} on ${name}`);
  return `${lead}, with ${joinWithAnd(parts)}.`;
}

/** "Lesson 2: Confirm and Back" — the page title and the lesson heading. */
export function lessonTitle(lesson: Lesson): string {
  return `Lesson ${lesson.number}: ${lesson.title}`;
}

/** "Confirm and Dismiss or Back", or null for a lesson that teaches no command. Spoken labels: it is a sentence, read aloud. */
export function teachesPhrase(lesson: Lesson): string | null {
  if (lesson.teaches.length === 0) return null;
  return joinWithAnd(lesson.teaches.map((token) => getCommand(token).spokenLabel));
}
