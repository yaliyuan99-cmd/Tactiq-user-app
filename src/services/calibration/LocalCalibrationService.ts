/**
 * The calibration profile kept on this device (one profile at a time).
 *
 * Two things keep what is stored trustworthy and bounded: a tap whose
 * reported length could not have come from a press is refused rather than
 * recorded, and the samples list is capped (see `capSamples`) so repeated
 * runs cannot grow storage without end.
 */
import type { CalibrationProfile, CalibrationSample, CalibrationSummary, Hand } from '@/domain/models';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';
import { createId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import { ChangeNotifier, type Unsubscribe } from '@/services/useSubscription';
import {
  calibrationCoverage,
  capSamples,
  isCalibrationProfile,
  judgeCalibrationSample,
  sampleLimit,
  storableReason,
  summariseCalibration,
} from './calibrationRules';
import type { CalibrationSampleInput, CalibrationSampleResult, CalibrationService } from './types';

/**
 * One run prompts eight points and gives each a few tries, so it adds far
 * fewer than this many samples. Head-room above the cap for a run in
 * progress; see `boundedSamples`.
 */
const RUN_HEADROOM_SAMPLES = 80;

function withCappedSamples(profile: CalibrationProfile): CalibrationProfile {
  const samples = capSamples(profile.samples, profile.samplesRequiredPerContact);
  return samples === profile.samples ? profile : { ...profile, samples };
}

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
      // A stored list longer than the cap (an older profile, or edited storage) is
      // trimmed on the way in. No run is in progress at load, so nothing is re-indexed.
      this.cache = isCalibrationProfile(raw) ? withCappedSamples(raw) : null;
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
   *
   * A tap whose reported length is impossible (negative, or not a number)
   * is not recorded at all: it is not a press, so it must not sit in the
   * profile as evidence. The caller is told it did not count.
   */
  recordSample(input: CalibrationSampleInput): CalibrationSampleResult {
    const profile = this.get();
    if (!profile || (profile.status !== 'in_progress' && profile.status !== 'incomplete')) {
      throw new Error('Start calibration before recording taps.');
    }
    const judgement = judgeCalibrationSample(input);
    if (judgement.reason === 'impossible_duration') {
      return { accepted: false, profile };
    }
    const reason = storableReason(judgement.reason);
    const sample: CalibrationSample = {
      contact: input.contact,
      recordedAt: input.at ?? nowIso(),
      durationMs: input.durationMs,
      detectedContact: input.detectedContact,
      accepted: judgement.accepted,
      ...(reason ? { reason } : {}),
    };
    const samples = this.boundedSamples(profile, sample);
    const next = this.save({ ...profile, status: 'in_progress', samples });
    return { accepted: judgement.accepted, ...(reason ? { reason } : {}), profile: next };
  }

  complete(): CalibrationProfile {
    const profile = this.get();
    if (!profile) throw new Error('There is no calibration to finish.');
    const covered = calibrationCoverage(profile).every((c) => !c.needsRepeat);
    // The run is over, so this is the moment to trim: coverage is unchanged by it.
    return this.save(withCappedSamples({ ...profile, status: covered ? 'complete' : 'incomplete', completedAt: nowIso() }));
  }

  pause(): CalibrationProfile | null {
    const profile = this.get();
    if (!profile || profile.status !== 'in_progress') return profile;
    return this.save(withCappedSamples({ ...profile, status: 'incomplete' }));
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

  /**
   * The samples list with this tap added, trimmed only if it has grown past
   * the cap plus a whole run's head-room. A run in progress is indexed by
   * position in this list (CalibrationRun.sampleOffset), so mid-run trimming
   * would mis-count that run's tries; the cap is normally applied when the
   * run ends, in `complete` and `pause`. The head-room is larger than any one
   * run, so this hard limit only engages if a device floods the page.
   */
  private boundedSamples(profile: CalibrationProfile, sample: CalibrationSample): readonly CalibrationSample[] {
    const samples = [...profile.samples, sample];
    const hardLimit = sampleLimit(profile.samplesRequiredPerContact) + RUN_HEADROOM_SAMPLES;
    return samples.length > hardLimit ? capSamples(samples, profile.samplesRequiredPerContact) : samples;
  }

  private save(profile: CalibrationProfile): CalibrationProfile {
    this.lastWrite = this.notifier.quietly(() => this.storage.set(STORAGE_KEYS.calibration, profile));
    this.cache = profile;
    this.notifier.emit();
    return profile;
  }
}

