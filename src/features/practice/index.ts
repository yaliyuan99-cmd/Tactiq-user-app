/**
 * Practice core — the shared layer that turns the ring (the simulated ring in
 * Demo Mode, or a connected bench ring) into something a user can operate and
 * hear. Simulator, Train, Calibrate and Onboarding build on it.
 *
 * ── 1. Operate and hear the ring: `useRing` ────────────────────────────────
 * Call `useRing()` ONCE per screen. It returns a `RingController`:
 *   state   mode, isDemo, canOperate (simulated ring present), canReceive,
 *           armed, closesAt, windowMs, remainingMs (100 ms ticks, null when
 *           closed), pressingContact, holdProgress (0..1), holdArmed,
 *           lastResult, flashContact (700 ms, null when visual confirmation is off)
 *   inputs  squeeze(), pressStart(contact), pressEnd(contact), cancel(),
 *           closeWindow() — silent no-ops with a hardware ring
 * It announces, exactly once each: the window opening ("Command window open
 * for 3 seconds.") and closing, every result, and the emergency arming cue at
 * two seconds. When a dropped or cancelled press also closes the window, one
 * announcement says both ("Emergency hold cancelled after 3.2 seconds.
 * Nothing was sent. Command window closed."); a completed emergency hold is
 * never followed by "Command window closed.". Politeness and vibration come
 * from FeedbackProvider (reject, emergency and the arming cue are assertive).
 * Pass `{ announce: false }` if the screen speaks for
 * itself, `onResult` to react to outcomes and `onGate` for open/close
 * transitions (a refresh after a tap does not call it).
 *
 *   const ring = useRing({ onResult: (result) => handle(result) });
 *
 * ── 2. Show it: `PracticeSurface` ──────────────────────────────────────────
 *   <PracticeSurface ring={ring} hand={preferences.hand} targetContact={step.contact} />
 * Renders SqueezeControl, a Hand view / List view switch (hand by default,
 * list on screens under 480 px; the choice is remembered per tab in
 * sessionStorage "tactiq.practiceView" unless `view` is controlled), the
 * HandMap or ContactList wired to the ring, a visible "Last: …" line (when
 * visual confirmation is on), the "Simulation only" EmergencyNotice after a
 * completed hold (`showEmergencyNotice`, default true) and the
 * EmergencyHoldButton (`showEmergencyHold`, default true). With a hardware
 * ring the points are display-only and the last detected point is shown.
 * Pieces are exported too (SqueezeControl, EmergencyHoldButton,
 * EmergencyNotice, ViewSwitch) for layouts that need them apart.
 *
 * ── 3. Words: `describeRingResult`, `describeGate`, `useShortcutLabels` ────
 * `describeRingResult(result, mapping)` gives `message` (announced),
 * `visibleMessage` (adds "Simulated:" before shortcut outcomes), `shortLabel`
 * and `feedbackKind`. Get `mapping`, `labelFor(contact)` and
 * `labelForToken(token)` from `useShortcutLabels()`. Never re-announce what
 * useRing already announced; show `visibleMessage` as plain (non-live) text.
 *
 * ── 4. Record history: `useRecordResult` ───────────────────────────────────
 *   const record = useRecordResult();
 *   useRing({ onResult: (r) => record(r, { source: 'training', mode: 'lesson', targetContact, lessonId }) });
 * Evidence is filled in for you ("simulated" in Demo Mode, "measured" only
 * with a connected hardware ring). Outcomes: a command on the target (or with
 * no target) is "recognised", on another point "mismatch"; closed-window
 * presses are "window_closed", too-long presses "rejected_duration", and the
 * two emergency outcomes keep their names. `useRecordSqueeze()` records a
 * squeeze for lessons that practise opening the window. Pure versions:
 * `toGestureEvent`, `squeezeGestureEvent`, `evidenceForDevice`.
 *
 * Per screen:
 *   Simulator  — useRing + PracticeSurface; free mode records with no target,
 *                guided mode passes targetContact; source 'simulator'.
 *   Train      — useRing({ onResult }) + PracticeSurface with the step's
 *                targetContact; record with source 'training', mode 'lesson',
 *                lessonId. For squeeze steps use onGate(true) + useRecordSqueeze.
 *                For hold steps read result.kind 'emergency' / 'emergency_cancelled'.
 *   Calibrate  — useRing + PracticeSurface (showEmergencyHold={false}) with the
 *                prompted targetContact and detectedContact for misreads;
 *                source 'calibration', mode 'calibration'.
 *   Onboarding — embed PracticeSurface for a first try; pass `announce: false`
 *                only if the step already narrates every change.
 * Whenever a result has kind 'emergency', EMERGENCY_SIMULATION_NOTICE must be
 * visible: leave `showEmergencyNotice` on, or render <EmergencyNotice />.
 */
export {
  EMERGENCY_ARMING_MESSAGE,
  describeGate,
  describeRingResult,
  formatSeconds,
  ringResultFromEvent,
  type RingResult,
  type RingResultDescription,
  type RingResultKind,
} from './ringResults';
export {
  evidenceForDevice,
  squeezeGestureEvent,
  toGestureEvent,
  type GestureEventContext,
  type HistoryEvidence,
  type RecordContext,
} from './toGestureEvent';
export { FLASH_MS, REMAINING_TICK_MS, useRing, type RingController, type UseRingOptions } from './useRing';
export { useRecordResult, useRecordSqueeze, type RecordResult, type RecordSqueeze } from './useRecordResult';
export { useShortcutLabels, type ShortcutLabels } from './useShortcutLabels';
export {
  DEFAULT_PRACTICE_VIEW,
  PRACTICE_VIEW_STORAGE_KEY,
  NARROW_VIEWPORT_QUERY,
  initialPracticeView,
  isPracticeView,
  readStoredPracticeView,
  storePracticeView,
  type PracticeView,
} from './practiceView';
export { SqueezeControl, type SqueezeControlProps } from './SqueezeControl';
export { EmergencyHoldButton, type EmergencyHoldButtonProps } from './EmergencyHoldButton';
export { EMERGENCY_NOTICE_DETAIL, EmergencyNotice, type EmergencyNoticeProps } from './EmergencyNotice';
export { ViewSwitch, type ViewSwitchProps } from './ViewSwitch';
export { KEYBOARD_HINT, PracticeSurface, type PracticeSurfaceProps } from './PracticeSurface';
