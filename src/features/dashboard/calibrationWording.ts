/**
 * Calibration status in words for the dashboard. With the simulated ring
 * calibration is a guided practice routine, and the evidence label says so.
 */
import { CONTACT_KEYS, getContact } from '@/domain/contacts';
import type { CalibrationSummary } from '@/domain/models';
import { formatRelative } from '@/lib/time';
import { joinWithAnd } from './text';

/** Points with enough accepted taps. */
export function calibratedPointCount(summary: Pick<CalibrationSummary, 'coverage'>): number {
  return summary.coverage.filter((c) => !c.needsRepeat).length;
}

/**
 * "Not calibrated", "In progress — 3 of 8 points done", "Complete", or
 * "Needs repeating: Index fingertip and Ring finger base".
 */
export function calibrationStatusText(summary: Pick<CalibrationSummary, 'status' | 'coverage' | 'pointsNeedingRepeat'>): string {
  switch (summary.status) {
    case 'not_started':
      return 'Not calibrated';
    case 'in_progress':
      return `In progress — ${calibratedPointCount(summary)} of ${CONTACT_KEYS.length} points done`;
    case 'complete':
      return 'Complete';
    case 'incomplete': {
      const points = summary.pointsNeedingRepeat;
      if (points.length === 0) return 'Not finished';
      if (points.length === CONTACT_KEYS.length) return `Needs repeating: all ${CONTACT_KEYS.length} points`;
      return `Needs repeating: ${joinWithAnd(points.map((p) => getContact(p).label))}`;
    }
  }
}

export function calibrationLastPerformedText(summary: Pick<CalibrationSummary, 'lastPerformedAt'>, now: Date): string {
  return summary.lastPerformedAt ? formatRelative(summary.lastPerformedAt, now) : 'Never';
}

/** "Recalibrate" once a calibration is complete, otherwise "Calibrate". */
export function calibrationLinkText(summary: Pick<CalibrationSummary, 'status'>): 'Calibrate' | 'Recalibrate' {
  return summary.status === 'complete' ? 'Recalibrate' : 'Calibrate';
}
