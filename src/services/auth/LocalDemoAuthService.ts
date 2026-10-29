import { createId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { STORAGE_KEYS, type StorageAdapter } from '@/services/storage/StorageAdapter';
import {
  AuthError,
  type AuthMode,
  type AuthService,
  type AuthUser,
  type GuestResult,
  type PasswordResetRequestResult,
  type SignInInput,
  type SignUpInput,
} from './types';
import { MESSAGES, requireValidDisplayName, requireValidEmail } from './validation';

/** A local profile as stored under STORAGE_KEYS.authAccounts. Never holds a password. */
export interface LocalAccountRecord {
  readonly id: string;
  /** Lower-cased and trimmed. */
  readonly email: string;
  readonly displayName: string;
  readonly createdAt: string;
}

/** The signed-in profile as stored under STORAGE_KEYS.authSession. */
export interface LocalSessionRecord {
  readonly userId: string;
  readonly signedInAt: string;
}

interface Snapshot {
  readonly accounts: readonly LocalAccountRecord[];
  readonly session: LocalSessionRecord | null;
}

export const GUEST_EMAIL = 'guest@demo.local';
export const GUEST_DISPLAY_NAME = 'Guest';

export const DEMO_MESSAGES = {
  notFound: 'No local profile uses that email on this device. Create one, or continue as a guest.',
  emailTaken: 'A local profile already uses that email. Sign in instead.',
  resetNothingToReset: 'Demo Mode keeps no passwords, so there is nothing to reset. Sign in with just your email.',
  resetUnavailable: 'Password reset needs a configured account backend.',
} as const;

const AUTH_KEYS: ReadonlySet<string> = new Set([STORAGE_KEYS.authAccounts, STORAGE_KEYS.authSession]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAccounts(value: unknown): LocalAccountRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is LocalAccountRecord =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.email === 'string' &&
      typeof item.displayName === 'string' &&
      typeof item.createdAt === 'string',
  );
}

function parseSession(value: unknown): LocalSessionRecord | null {
  if (isRecord(value) && typeof value.userId === 'string' && typeof value.signedInAt === 'string') {
    return { userId: value.userId, signedInAt: value.signedInAt };
  }
  return null;
}

function toUser(account: LocalAccountRecord): AuthUser {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
    provider: 'demo',
  };
}

/**
 * Demo Mode authentication: local profiles kept in this browser's storage.
 *
 * There is no password here. Any `password` passed to `signIn` or `signUp` is
 * ignored entirely: it is never stored, never compared and never logged. A
 * profile is found by its email alone, which is why the UI must say plainly
 * that Demo Mode profiles are not private and not protected.
 *
 * `onChange` fires once after every successful mutation made through this
 * instance, and whenever the auth keys change through another instance or
 * another tab (via `storage.subscribe`).
 *
 * If the browser refuses to persist (private mode, quota), the service keeps
 * working in memory for the rest of the page's life; `persisted` turns false.
 */
export class LocalDemoAuthService implements AuthService {
  readonly mode: AuthMode = 'demo';

  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  private unsubscribeStorage: (() => void) | null = null;
  /** Non-null once a write has failed; from then on state lives only here. */
  private memory: Snapshot | null = null;
  /** Suppresses storage echoes while this instance is writing. */
  private writing = 0;

  constructor(private readonly storage: StorageAdapter) {}

  /** False when the browser refused to save a change and profiles now live in memory only. */
  get persisted(): boolean {
    return this.memory === null;
  }

  async getSession(): Promise<AuthUser | null> {
    return this.currentUser();
  }

  /** Profiles live in this browser's storage, so the session needs no waiting. */
  peekSession(): AuthUser | null {
    return this.currentUser();
  }

  onChange(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    if (!this.unsubscribeStorage) {
      this.unsubscribeStorage = this.storage.subscribe((key) => {
        if (this.writing > 0 || this.memory || !AUTH_KEYS.has(key)) return;
        this.emit();
      });
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.unsubscribeStorage) {
        this.unsubscribeStorage();
        this.unsubscribeStorage = null;
      }
    };
  }

  async signIn(input: SignInInput): Promise<AuthUser> {
    const email = requireValidEmail(input.email);
    const { accounts } = this.load();
    const account = accounts.find((a) => a.email === email);
    if (!account) throw new AuthError('not_found', DEMO_MESSAGES.notFound);
    this.save({ accounts, session: this.sessionFor(account) });
    return toUser(account);
  }

  async signUp(input: SignUpInput): Promise<AuthUser> {
    const email = requireValidEmail(input.email);
    const displayName = requireValidDisplayName(input.displayName);
    const { accounts } = this.load();
    if (accounts.some((a) => a.email === email)) throw new AuthError('email_taken', DEMO_MESSAGES.emailTaken);
    const account: LocalAccountRecord = { id: createId('user'), email, displayName, createdAt: nowIso() };
    this.save({ accounts: [...accounts, account], session: this.sessionFor(account) });
    return toUser(account);
  }

  async signOut(): Promise<void> {
    const { accounts } = this.load();
    this.save({ accounts, session: null });
  }

  async continueAsGuest(): Promise<GuestResult> {
    const { accounts } = this.load();
    const existing = accounts.find((a) => a.email === GUEST_EMAIL);
    const guest: LocalAccountRecord = existing ?? {
      id: createId('user'),
      email: GUEST_EMAIL,
      displayName: GUEST_DISPLAY_NAME,
      createdAt: nowIso(),
    };
    this.save({ accounts: existing ? accounts : [...accounts, guest], session: this.sessionFor(guest) });
    return { user: toUser(guest), created: existing === undefined };
  }

  async requestPasswordReset(_email: string): Promise<PasswordResetRequestResult> {
    return { delivered: false, message: DEMO_MESSAGES.resetNothingToReset };
  }

  async completePasswordReset(_newPassword: string): Promise<void> {
    throw new AuthError('unavailable', DEMO_MESSAGES.resetUnavailable);
  }

  async updateProfile(patch: { displayName?: string }): Promise<AuthUser> {
    const { accounts, session } = this.load();
    const account = session ? accounts.find((a) => a.id === session.userId) : undefined;
    if (!account) throw new AuthError('not_found', MESSAGES.signedOut);
    if (patch.displayName === undefined) return toUser(account);
    const updated: LocalAccountRecord = { ...account, displayName: requireValidDisplayName(patch.displayName) };
    this.save({ accounts: accounts.map((a) => (a.id === account.id ? updated : a)), session });
    return toUser(updated);
  }

  async deleteAccount(): Promise<void> {
    const { accounts, session } = this.load();
    if (!session) return;
    this.save({ accounts: accounts.filter((a) => a.id !== session.userId), session: null });
  }

  private sessionFor(account: LocalAccountRecord): LocalSessionRecord {
    return { userId: account.id, signedInAt: nowIso() };
  }

  private load(): Snapshot {
    if (this.memory) return this.memory;
    return {
      accounts: parseAccounts(this.storage.get<unknown>(STORAGE_KEYS.authAccounts)),
      session: parseSession(this.storage.get<unknown>(STORAGE_KEYS.authSession)),
    };
  }

  private currentUser(): AuthUser | null {
    const { accounts, session } = this.load();
    if (!session) return null;
    const account = accounts.find((a) => a.id === session.userId);
    return account ? toUser(account) : null;
  }

  private save(next: Snapshot): void {
    if (this.memory) {
      this.memory = next;
    } else {
      this.writing += 1;
      try {
        const accountsSaved = this.storage.set(STORAGE_KEYS.authAccounts, next.accounts);
        let sessionSaved = true;
        if (next.session) sessionSaved = this.storage.set(STORAGE_KEYS.authSession, next.session);
        else this.storage.remove(STORAGE_KEYS.authSession);
        if (!accountsSaved || !sessionSaved) this.memory = next;
      } finally {
        this.writing -= 1;
      }
    }
    this.emit();
  }

  private emit(): void {
    const user = this.currentUser();
    for (const listener of [...this.listeners]) {
      try {
        listener(user);
      } catch {}
    }
  }
}
