/**
 * One line per activity record for the dashboard. Every record describes
 * practice in this app, and a completed emergency hold always carries the
 * simulation notice.
 */
import { getCommand } from '@/domain/commands';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { getLesson } from '@/domain/lessons';
import type { GestureEvent } from '@/domain/models';
import { intendedToken } from '@/services/history/summarise';

/** How many records the dashboard lists. */
export const RECENT_ACTIVITY_LIMIT = 5;

type ActivityFields = Pick<GestureEvent, 'outcome' | 'token' | 'targetContact' | 'lessonId'>;

function commandName(token: GestureEvent['token']): string | null {
  return token ? getCommand(token).label : null;
}

/** What happened, in words: "Confirm recognised", "Aimed for Next, detected Previous", … */
export function describeActivity(event: ActivityFields): string {
  const intended = commandName(intendedToken(event));
  const detected = commandName(event.token);
  switch (event.outcome) {
    case 'recognised':
      return detected ? `${detected} recognised` : 'Squeeze recognised';
    case 'mismatch':
      if (intended && detected) return `Aimed for ${intended}, detected ${detected}`;
      return intended ? `Aimed for ${intended}, detected something else` : 'Not the command asked for';
    case 'rejected_duration':
      return intended ? `${intended}: press too long, ignored` : 'Press too long, ignored';
    case 'window_closed':
      return intended ? `${intended}: the command window had closed` : 'Tap after the command window closed';
    case 'emergency':
      return `Emergency hold completed. ${EMERGENCY_SIMULATION_NOTICE}`;
    case 'emergency_cancelled':
      return 'Emergency hold cancelled before five seconds';
  }
}

/** Where the record came from: "Simulator, guided practice", "Lesson 2", "Calibration", "Bluetooth ring". */
export function activitySourceText(event: Pick<GestureEvent, 'source' | 'mode' | 'lessonId'>): string {
  switch (event.source) {
    case 'simulator':
      return event.mode === 'free' ? 'Simulator, free practice' : 'Simulator, guided practice';
    case 'training':
      return event.lessonId ? `Lesson ${getLesson(event.lessonId).number}` : 'Training';
    case 'calibration':
      return 'Calibration';
    case 'device':
      return 'Bluetooth ring';
  }
}

export type ActivityLabel = 'Sample' | 'Simulated' | 'Measured';

/** Sample records first, then the record's own evidence. */
export function activityLabel(event: Pick<GestureEvent, 'seeded' | 'evidence'>): ActivityLabel {
  if (event.seeded) return 'Sample';
  return event.evidence === 'measured' ? 'Measured' : 'Simulated';
}
