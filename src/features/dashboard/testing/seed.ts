/** Storage seeding for dashboard tests: real local services writing to the storage renderApp will read. */
import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import type { LessonId } from '@/domain/lessons';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import { createServices, type AppServices } from '@/services/ServicesProvider';
import { MemoryStorageAdapter, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { profileStorage } from '@/test/renderApp';

/** Preferences for a user who finished setup, so the next step moves past "Resume setup". */
export const SETUP_FINISHED = { onboardingCompleted: true, onboardingStep: ONBOARDING_LAST_STEP } as const;

/**
 * A store seeded the way the running app would have written it: calibration,
 * lessons and shortcuts belong to the signed-in profile, so the services do
 * the seeding through that profile's view of the store (see
 * `profileStorage`). The whole store is returned, because that is what
 * `renderApp` takes.
 */
export function seededStorage(seed: (services: AppServices) => void): StorageAdapter {
  const storage = new MemoryStorageAdapter();
  seed(createServices(profileStorage(storage)));
  return storage;
}

/** Calibrates the given points with enough accepted taps, then finishes (complete or incomplete). */
export function calibrate(services: AppServices, points: readonly ContactKey[] = CONTACT_KEYS, finish = true): void {
  services.calibration.start({ hand: 'right' });
  for (const contact of points) {
    for (let i = 0; i < 3; i += 1) services.calibration.recordSample({ contact, detectedContact: contact, durationMs: 200 });
  }
  if (finish) services.calibration.complete();
}

/** Runs a lesson to completion with the given number of correct and wrong attempts. */
export function completeLesson(services: AppServices, lessonId: LessonId, correct: number, wrong = 0): void {
  services.training.startRun(lessonId);
  for (let i = 0; i < correct; i += 1) services.training.recordAttempt(lessonId, { correct: true });
  for (let i = 0; i < wrong; i += 1) services.training.recordAttempt(lessonId, { correct: false });
  services.training.completeRun(lessonId);
}
