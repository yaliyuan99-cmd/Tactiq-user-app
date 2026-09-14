/**
 * The simulated ring's gate → window → tap/hold logic, replicating the bench
 * firmware and Algorithm 3 of the AUSSEF paper. Framework-free: the clock and
 * timers are injected, so the same class drives Demo Mode and unit tests.
 *
 *   idle ──squeeze (held GATE_HOLD_MS)──▶ armed (window open)
 *   armed ──window timer──▶ idle                      (gate armed:false)
 *   armed ──press──▶ pressing (window timer suspended)
 *   pressing ──release ≤ TAP_MAX_MS──▶ token, window refreshed
 *   pressing ──release > TAP_MAX_MS──▶ reject (never guessed, P7)
 *   pressing pinky_tip ──held EMERGENCY_HOLD_MS──▶ emergency token, window closed
 */
import { type ContactKey } from '@/domain/contacts';
import { resolveCommand } from '@/domain/commands';
import { COMMAND_WINDOW_MS, EMERGENCY_ARMING_CUE_MS, EMERGENCY_HOLD_MS, GATE_HOLD_MS, TAP_MAX_MS } from '@/domain/timing';
import { type Clock, type Scheduler, type TimerHandle, globalScheduler, systemClock } from './scheduler';
import type { DeviceEvent } from './types';

/** The contact whose sustained hold is Emergency. Fixed; never remappable. */
export const EMERGENCY_CONTACT: ContactKey = 'pinky_tip';

/** How often a hold on the emergency point reports progress. */
export const HOLD_PROGRESS_INTERVAL_MS = 100;

/** Default duration used by `tap()` when the caller has no press timing. */
export const DEFAULT_TAP_DURATION_MS = 160;

export type RingEvent = Extract<DeviceEvent, { type: 'gate' | 'press' | 'hold_progress' | 'token' | 'reject' }>;
export type RingEventListener = (event: RingEvent) => void;

export interface RingSnapshot {
  readonly armed: boolean;
  readonly closesAt: number | null;
  readonly pressing: { readonly contact: ContactKey; readonly since: number } | null;
  readonly emergencyFired: boolean;
}

export interface RingStateMachineOptions {
  readonly now?: Clock;
  readonly scheduler?: Scheduler;
  readonly commandWindowMs?: number;
  readonly gateHoldMs?: number;
}

export class RingStateMachine {
  private readonly now: Clock;
  private readonly scheduler: Scheduler;
  private readonly gateHoldMs: number;
  private readonly listeners = new Set<RingEventListener>();
  private commandWindowMs: number;

  private armed = false;
  private closesAt: number | null = null;
  private pressing: { contact: ContactKey; since: number } | null = null;
  private emergencyFired = false;
  /** A press that was rejected as not armed; repeats of it (key auto-repeat) stay silent until release. */
  private unarmedPress: ContactKey | null = null;

  private gateTimer: TimerHandle | null = null;
  private windowTimer: TimerHandle | null = null;
  private holdTimer: TimerHandle | null = null;
  private progressTimer: TimerHandle | null = null;

  constructor(options: RingStateMachineOptions = {}) {
    this.now = options.now ?? systemClock;
    this.scheduler = options.scheduler ?? globalScheduler;
    this.gateHoldMs = options.gateHoldMs ?? GATE_HOLD_MS;
    this.commandWindowMs = validWindow(options.commandWindowMs) ?? COMMAND_WINDOW_MS;
  }

  subscribe(listener: RingEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): RingSnapshot {
    return {
      armed: this.armed,
      closesAt: this.closesAt,
      pressing: this.pressing ? { ...this.pressing } : null,
      emergencyFired: this.emergencyFired,
    };
  }

  getCommandWindowMs(): number {
    return this.commandWindowMs;
  }

  /** Applies from the next time the window opens or is refreshed. */
  configure(options: { commandWindowMs?: number }): void {
    const windowMs = validWindow(options.commandWindowMs);
    if (windowMs !== null) this.commandWindowMs = windowMs;
  }

  /** A deliberate squeeze: the window opens once the squeeze has been held for the gate time. */
  squeeze(): void {
    if (this.gateTimer !== null) return;
    this.gateTimer = this.scheduler.setTimeout(() => {
      this.gateTimer = null;
      this.armed = true;
      this.openWindow();
    }, this.gateHoldMs);
  }

  pressStart(contact: ContactKey): void {
    if (this.pressing) {
      if (this.pressing.contact === contact) return;
      this.cancel();
    }
    if (!this.armed) {
      if (this.unarmedPress === contact) return;
      this.unarmedPress = contact;
      this.emit({ type: 'reject', reason: 'not_armed', contact, durationMs: null, at: this.now() });
      return;
    }
    this.unarmedPress = null;
    this.emergencyFired = false;
    const since = this.now();
    this.pressing = { contact, since };
    this.clearWindowTimer();
    this.emit({ type: 'press', contact, at: since });
    if (contact === EMERGENCY_CONTACT) this.startHoldTracking(since);
  }

  pressEnd(contact: ContactKey): void {
    if (this.unarmedPress === contact) this.unarmedPress = null;
    if (!this.pressing || this.pressing.contact !== contact) return;
    this.finishPress(this.now() - this.pressing.since);
  }

  /** A complete brief tap for callers without press timing. Synchronous. */
  tap(contact: ContactKey, durationMs: number = DEFAULT_TAP_DURATION_MS): void {
    this.pressStart(contact);
    if (this.unarmedPress === contact) {
      this.unarmedPress = null;
      return;
    }
    if (!this.pressing || this.pressing.contact !== contact) return;
    this.finishPress(Math.max(0, durationMs));
  }

  /** Abandons any press in progress without a token. */
  cancel(): void {
    this.unarmedPress = null;
    const press = this.pressing;
    if (!press) return;
    this.stopHoldTracking();
    this.pressing = null;
    if (press.contact === EMERGENCY_CONTACT && !this.emergencyFired) {
      const at = this.now();
      this.emit({ type: 'reject', reason: 'hold_released_early', contact: press.contact, durationMs: at - press.since, at });
    }
    this.resumeWindow();
  }

  closeWindow(): void {
    this.clearGateTimer();
    this.cancel();
    this.disarm();
  }

  /** Clears every timer. The machine returns to idle and can be used again. */
  destroy(): void {
    this.clearGateTimer();
    this.clearWindowTimer();
    this.stopHoldTracking();
    this.armed = false;
    this.closesAt = null;
    this.pressing = null;
    this.unarmedPress = null;
    this.emergencyFired = false;
  }

  /* ---------------------------------------------------------------- */

  /** Opens or refreshes the window from now. The timer stays suspended while a contact is held. */
  private openWindow(): void {
    const at = this.now();
    this.closesAt = at + this.commandWindowMs;
    this.clearWindowTimer();
    if (!this.pressing) this.startWindowTimer(this.commandWindowMs);
    this.emit({ type: 'gate', armed: true, closesAt: this.closesAt, at });
  }

  private disarm(): void {
    this.clearWindowTimer();
    if (!this.armed) return;
    this.armed = false;
    this.closesAt = null;
    this.emit({ type: 'gate', armed: false, closesAt: null, at: this.now() });
  }

  private resumeWindow(): void {
    if (!this.armed || this.closesAt === null) return;
    const remaining = this.closesAt - this.now();
    if (remaining <= 0) this.disarm();
    else this.startWindowTimer(remaining);
  }

  private startWindowTimer(ms: number): void {
    this.clearWindowTimer();
    this.windowTimer = this.scheduler.setTimeout(() => {
      this.windowTimer = null;
      this.disarm();
    }, ms);
  }

  private clearWindowTimer(): void {
    if (this.windowTimer !== null) this.scheduler.clearTimeout(this.windowTimer);
    this.windowTimer = null;
  }

  private clearGateTimer(): void {
    if (this.gateTimer !== null) this.scheduler.clearTimeout(this.gateTimer);
    this.gateTimer = null;
  }

  private finishPress(durationMs: number): void {
    const press = this.pressing;
    if (!press) return;
    this.stopHoldTracking();
    const { contact } = press;

    if (this.emergencyFired) {
      this.pressing = null;
      this.resumeWindow();
      return;
    }
    // Fallback when the hold timer was throttled (e.g. a background tab): the full hold still counts.
    if (contact === EMERGENCY_CONTACT && durationMs >= EMERGENCY_HOLD_MS) {
      this.fireEmergency();
      this.pressing = null;
      return;
    }

    this.pressing = null;
    const at = this.now();
    const command = durationMs <= TAP_MAX_MS ? resolveCommand(contact, 'tap') : null;
    if (command) {
      this.emit({ type: 'token', token: command.token, contact, durationMs, at });
      this.openWindow();
      return;
    }
    const reason = contact === EMERGENCY_CONTACT ? 'hold_released_early' : 'indeterminate_duration';
    this.emit({ type: 'reject', reason, contact, durationMs, at });
    this.resumeWindow();
  }

  private startHoldTracking(since: number): void {
    this.stopHoldTracking();
    this.progressTimer = this.scheduler.setInterval(() => {
      if (!this.pressing || this.emergencyFired) return;
      const elapsedMs = this.now() - since;
      if (elapsedMs >= EMERGENCY_HOLD_MS) {
        this.fireEmergency();
        return;
      }
      const armingCueReached = elapsedMs >= EMERGENCY_ARMING_CUE_MS;
      const totalMs = EMERGENCY_HOLD_MS;
      this.emit({ type: 'hold_progress', contact: EMERGENCY_CONTACT, elapsedMs, totalMs, armingCueReached, at: this.now() });
    }, HOLD_PROGRESS_INTERVAL_MS);
    this.holdTimer = this.scheduler.setTimeout(() => {
      this.holdTimer = null;
      if (this.pressing && !this.emergencyFired) this.fireEmergency();
    }, EMERGENCY_HOLD_MS);
  }

  private stopHoldTracking(): void {
    if (this.progressTimer !== null) this.scheduler.clearInterval(this.progressTimer);
    if (this.holdTimer !== null) this.scheduler.clearTimeout(this.holdTimer);
    this.progressTimer = null;
    this.holdTimer = null;
  }

  /** Exactly once per hold, while still held: an SOS must not wait for release. */
  private fireEmergency(): void {
    if (this.emergencyFired) return;
    this.emergencyFired = true;
    this.stopHoldTracking();
    this.emit({ type: 'token', token: 'emergency', contact: EMERGENCY_CONTACT, durationMs: EMERGENCY_HOLD_MS, at: this.now() });
    this.disarm();
  }

  private emit(event: RingEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {}
    }
  }
}

function validWindow(ms: number | undefined): number | null {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : null;
}
