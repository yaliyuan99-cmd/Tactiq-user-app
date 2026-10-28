/**
 * The activity-history API other slices use. Everything here is pure; the
 * service is imported from './LocalHistoryService' so Demo Mode sample data
 * never ends up in a screen's bundle.
 */
export {
  ACTIVATION_LABEL,
  ACTIVATION_NOTE,
  DROPPED_OUTCOMES,
  EMERGENCY_OUTCOMES,
  classifyEvent,
  eventKind,
  hasKnownTarget,
  intendedToken,
  isAccuracyAttempt,
  isAccuracySuccess,
  isActivation,
  isContactPrompt,
  isDropped,
  type ClassifiableEvent,
  type TargetedEvent,
} from './classify';

export {
  GESTURE_EVENT_MODES,
  GESTURE_EVENT_SOURCES,
  GESTURE_OUTCOMES,
  HISTORY_CAP,
  capHistory,
  eventTime,
  isGestureEvent,
  sortChronologically,
} from './events';

export {
  HISTORY_CSV_COLUMNS,
  HISTORY_EXPORT_FORMAT,
  HISTORY_EXPORT_NOTE_SIMULATED,
  HISTORY_EXPORT_NOTE_WITH_MEASURED,
  HISTORY_EXPORT_VERSION,
  csvField,
  describeExportScope,
  eventsToCsv,
  eventsToJson,
  historyExportNote,
  wholeHistoryScope,
  type HistoryCsvColumn,
  type HistoryExport,
} from './export';

export { filterEvents, isAttempt, isNarrowingFilter, rangeStart, summariseEvents } from './summarise';

export type { ExportScope, HistoryFilter, HistoryService, NewGestureEvent, SampleScope } from './types';
