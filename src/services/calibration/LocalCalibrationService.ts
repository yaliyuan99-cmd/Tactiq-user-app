/**
 * The calibration profile kept on this device (one profile at a time).
 */
import type { CalibrationProfile, CalibrationSample, CalibrationSummary, Hand } from '@/domain/models';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';
import { createId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { ChangeNotifier, type Unsubscribe } from '@/services/useSubscription';
import { calibrationCoverage, isCalibrationProfile, judgeCalibrationSample, summariseCalibration } from './calibrationRules';
import type { CalibrationSampleInput, CalibrationSampleResult, CalibrationService } from './types';

export class LocalCalibrationService implements CalibrationService {
  /** undefined = not loaded yet; null = no profile. */
  private cache: CalibrationProfile | null | undefined = undefined;
  private lastWrite = true;
  private readonly notifier: ChangeNotifier;

  constructor(private readonly storage: StorageAdapter) {
    this.notifier = new ChangeNotifier(storage, [STORAGE_KEYS.calibration], () => {
      this.cache = undefined;
    });
  }

  readonly subscribe = (listener: () => void): Unsubscribe => this.notifier.subscribe(listener);

  get(): CalibrationProfile | null {
    if (this.cache === undefined) {
      const raw = this.storage.get<unknown>(STORAGE_KEYS.calibration);
      this.cache = isCalibrationProfile(raw) ? raw : null;
    }
    return this.cache;
  }

  summary(): CalibrationSummary {
    return summariseCalibration(this.get());
  }

  start(options: {
    hand: Hand;
    samplesPerContact?: number;
    deviceId?: string | null;
    evidence?: 'simulated' | 'measured';
  }): CalibrationProfile {
    const samplesPerContact = options.samplesPerContact ?? CALIBRATION_SAMPLES_PER_CONTACT;
    if (!Number.isInteger(samplesPerContact) || samplesPerContact < 1) {
      throw new Error('Taps per contact point must be a whole number of at least 1.');
    }
    const profile: CalibrationProfile = {
      id: createId('cal'),
      hand: options.hand,
      status: 'in_progress',
      startedAt: nowIso(),
      completedAt: null,
      samplesRequiredPerContact: samplesPerContact,
      samples: [],
      evidence: options.evidence ?? 'simulated',
      deviceId: options.deviceId ?? null,
    };
    return this.save(profile);
  }

  /**
   * Records one prompted tap. A paused ('incomplete') profile resumes, so
   * points needing a repeat can be redone without starting over.
   */
  recordSample(input: CalibrationSampleInput): CalibrationSampleResult {
    const profile = this.get();
    if (!profile || (profile.status !== 'in_progress' && profile.status !== 'incomplete')) {
      throw new Error('Start calibration before recording taps.');
    }
    const judgement = judgeCalibrationSample(input);
    const sample: CalibrationSample = {
      contact: input.contact,
      recordedAt: input.at ?? nowIso(),
      durationMs: input.durationMs,
      detectedContact: input.detectedContact,
      accepted: judgement.accepted,
      ...(judgement.reason ? { reason: judgement.reason } : {}),
    };
    const next = this.save({ ...profile, status: 'in_progress', samples: [...profile.samples, sample] });
    return { ...judgement, profile: next };
  }

  complete(): CalibrationProfile {
    const profile = this.get();
    if (!profile) throw new Error('There is no calibration to finish.');
    const covered = calibrationCoverage(profile).every((c) => !c.needsRepeat);
    return this.save({ ...profile, status: covered ? 'complete' : 'incomplete', completedAt: nowIso() });
  }

  pause(): CalibrationProfile | null {
    const profile = this.get();
    if (!profile || profile.status !== 'in_progress') return profile;
    return this.save({ ...profile, status: 'incomplete' });
  }

  reset(): void {
    this.notifier.quietly(() => this.storage.remove(STORAGE_KEYS.calibration));
    this.cache = null;
    this.lastWrite = true;
    this.notifier.emit();
  }

  /** Whether the last change was persisted (false in private browsing or when storage is full). */
  lastWriteSucceeded(): boolean {
    return this.lastWrite;
  }

  dispose(): void {
    this.notifier.dispose();
  }

  private save(profile: CalibrationProfile): CalibrationProfile {
    this.lastWrite = this.notifier.quietly(() => this.storage.set(STORAGE_KEYS.calibration, profile));
    this.cache = profile;
    this.notifier.emit();
    return profile;
  }
}
