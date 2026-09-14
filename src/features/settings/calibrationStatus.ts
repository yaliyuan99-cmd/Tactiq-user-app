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
