/**
 * Device contract. The mock adapter IS the simulated ring: it runs the same
 * gate → window → tap/hold state machine the bench firmware runs and emits
 * the same events a real ring would send, so every screen (simulator,
 * lessons, calibration, dashboard) consumes one event stream regardless of
 * whether a physical ring is connected.
 */
import type { CommandToken } from '@/domain/commands';
import type { ContactKey } from '@/domain/contacts';

export type DeviceMode = 'demo' | 'hardware';

export type DeviceConnectionStatus =
  /** Demo Mode: the mock ring is always available. */
  | 'ready'
  | 'unsupported'
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'permission_denied'
  | 'error';

export type DeviceErrorCode =
  | 'unsupported'
  | 'insecure_context'
  | 'permission_denied'
  | 'not_found'
  | 'connection_failed'
  | 'disconnected'
  | 'service_missing'
  | 'unknown';

export interface DeviceError {
  readonly code: DeviceErrorCode;
  /** What happened, in plain language. */
  readonly message: string;
  /** What to try next. */
  readonly hint: string;
}

export type BatteryReading =
  | { readonly reported: false; readonly note: string }
  | { readonly reported: true; readonly percentage: number };

export interface DeviceInfo {
  readonly id: string;
  readonly name: string;
  readonly firmwareVersion: string | null;
  readonly battery: BatteryReading;
  readonly lastConnectedAt: string | null;
  readonly evidence: 'simulated' | 'measured';
}

export interface RememberedDevice {
  readonly id: string;
  readonly name: string;
  readonly lastConnectedAt: string | null;
}

export interface DeviceState {
  readonly mode: DeviceMode;
  readonly status: DeviceConnectionStatus;
  readonly device: DeviceInfo | null;
  /** A hardware ring the user connected before; offered for reconnection. */
  readonly remembered: RememberedDevice | null;
  readonly error: DeviceError | null;
  /** The command window (principle P9). `closesAt` is a Date.now() timestamp. */
  readonly gate: { readonly armed: boolean; readonly closesAt: number | null };
  readonly commandWindowMs: number;
}

export interface DeviceCapabilities {
  readonly webBluetooth: boolean;
  readonly secureContext: boolean;
  /** Why hardware connection is unavailable, or null when it is possible. */
  readonly reason: string | null;
}

export type RejectReason =
  /** A tap arrived while the ring was not armed. */
  | 'not_armed'
  /**
   * A tap arrived after the squeeze but before the command window had opened
   * (inside GATE_HOLD_MS). The press is still dropped — the timing rule does
   * not change — but it is not the user doing the wrong thing, so it is kept
   * apart from 'not_armed' and described as the window still opening.
   */
  | 'window_opening'
  /** Longer than a tap, shorter than an emergency hold — dropped, never guessed (P7). */
  | 'indeterminate_duration'
  /** The window timed out while nothing was pressed. */
  | 'window_closed'
  /** The emergency hold was released before five seconds. */
  | 'hold_released_early';

export type DeviceEvent =
  | { readonly type: 'state'; readonly state: DeviceState; readonly at: number }
  | { readonly type: 'gate'; readonly armed: boolean; readonly closesAt: number | null; readonly at: number }
  /**
   * Mock ring only: a squeeze has been received and the command window has
   * not opened yet (`active: true`), or that phase has ended (`active:
   * false`, emitted just before the window opens, or when the squeeze is
   * abandoned). A hardware ring reports no such phase — the protocol has only
   * armed and idle — so this event never comes from one.
   */
  | { readonly type: 'activating'; readonly active: boolean; readonly at: number }
  /** Mock ring only: a contact press began inside an open window. */
  | { readonly type: 'press'; readonly contact: ContactKey; readonly at: number }
  /** Mock ring only, every ~100 ms during a hold on the emergency point. */
  | {
      readonly type: 'hold_progress';
      readonly contact: ContactKey;
      readonly elapsedMs: number;
      readonly totalMs: number;
      readonly armingCueReached: boolean;
      readonly at: number;
    }
  | {
      readonly type: 'token';
      readonly token: CommandToken;
      readonly contact: ContactKey;
      readonly durationMs: number;
      readonly at: number;
    }
  | {
      readonly type: 'reject';
      readonly contact: ContactKey | null;
      readonly reason: RejectReason;
      readonly durationMs: number | null;
      readonly at: number;
    }
  | { readonly type: 'hello'; readonly firmwareVersion: string; readonly at: number }
  | { readonly type: 'battery'; readonly percentage: number; readonly isStub: true; readonly at: number }
  | { readonly type: 'error'; readonly error: DeviceError; readonly at: number }
  /** Raw protocol line from a hardware ring, for the diagnostic log. */
  | { readonly type: 'line'; readonly raw: string; readonly at: number };

export type DeviceEventListener = (event: DeviceEvent) => void;

export interface DeviceAdapter {
  readonly kind: 'mock' | 'web_bluetooth';
  capabilities(): DeviceCapabilities;
  getState(): DeviceState;
  subscribe(listener: DeviceEventListener): () => void;
  /** Web Bluetooth: must be called from a user gesture; shows the browser chooser. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Disconnects and clears the remembered device. */
  forget(): Promise<void>;
  ping(): Promise<void>;
  configure(options: { commandWindowMs?: number }): void;
  destroy(): void;
}

/** Inputs the simulator, lessons and calibration feed into the mock ring. */
export interface MockRingControls {
  /** A deliberate squeeze of the ring body: opens the command window. */
  squeeze(): void;
  /** Thumb touches a contact (pointer/key down). */
  pressStart(contact: ContactKey): void;
  /** Thumb leaves the contact (pointer/key up). */
  pressEnd(contact: ContactKey): void;
  /** A complete brief tap, for callers without press timing (e.g. list buttons). */
  tap(contact: ContactKey, durationMs?: number): void;
  /** Cancel any press in progress (e.g. Escape, focus loss). */
  cancel(): void;
  /** Force-close the window (e.g. tests, "close window" control). */
  closeWindow(): void;
}

export interface MockDeviceAdapter extends DeviceAdapter {
  readonly kind: 'mock';
  readonly controls: MockRingControls;
}
