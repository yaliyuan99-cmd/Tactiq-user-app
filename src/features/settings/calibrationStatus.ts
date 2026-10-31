/** Plain-language wording for the calibration summary shown in Settings. */
import type { CalibrationStatus, CalibrationSummary, Hand } from '@/domain/models';
import { plural } from './settingsOptions';

export function calibrationStatusText(summary: CalibrationSummary): string {
  switch (summary.status) {
    case 'not_started':
      return 'Not calibrated yet';
    case 'in_progress': {
      const done = summary.coverage.filter((point) => !point.needsRepeat).length;
      return `In progress: ${done} of ${plural(summary.coverage.length, 'point')} done`;
    }
    case 'complete':
      return 'Complete';
    case 'incomplete': {
      const count = summary.pointsNeedingRepeat.length;
      return `Incomplete: ${plural(count, 'point')} ${count === 1 ? 'needs' : 'need'} repeating`;
    }
  }
}

export function calibrationActionLabel(status: CalibrationStatus): 'Calibrate now' | 'Recalibrate' {
  return status === 'not_started' ? 'Calibrate now' : 'Recalibrate';
}

/** True when a stored calibration was made for the other hand. */
export function calibratedForOtherHand(summary: CalibrationSummary, hand: Hand): boolean {
  return summary.hand !== null && summary.hand !== hand;
}

/**
 * True when a stored calibration was recorded against a different ring than
 * the one connected now.
 *
 * Only ever true for a measured profile: a simulated one has no device, and
 * calling that a mismatch would nag every Demo Mode user. A finished
 * calibration from another ring is not wrong, but it is not about this one,
 * and reading simply "Complete" invites the user to believe otherwise.
 */
export function calibratedOnOtherRing(summary: CalibrationSummary, connectedDeviceId: string | null): boolean {
  if (summary.evidence !== 'measured' || summary.deviceId === null) return false;
  return connectedDeviceId !== null && connectedDeviceId !== summary.deviceId;
}
