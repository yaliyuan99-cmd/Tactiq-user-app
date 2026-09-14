import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { type ContactKey } from '@/domain/contacts';

export interface ContactPressCallbacks {
  /** A press began (pointer down, or Enter/Space down). Fires once per press; key repeats are ignored. */
  readonly onPressStart?: (contact: ContactKey) => void;
  /** The press ended (pointer up / cancel / leave, key up, or focus lost mid-press). */
  readonly onPressEnd?: (contact: ContactKey) => void;
  /** A plain click. Only used when no press handlers are given. */
  readonly onActivate?: (contact: ContactKey) => void;
  readonly disabled?: boolean;
}

export interface ContactPressProps {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onBlur: () => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}

interface ActivePress {
  readonly contact: ContactKey;
  readonly source: 'pointer' | 'key';
  readonly pointerId: number | undefined;
}

/** A click this soon after a pointer press ended is the browser's follow-up click, not a new press. */
const FOLLOW_UP_CLICK_MS = 1000;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function isPressKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

/**
 * Shared press semantics for contact points (HandMap and ContactList).
 * Durations are measured by the caller between onPressStart and onPressEnd, so
 * a keyboard or switch user can perform both a brief tap and a five-second
 * hold. A click with no preceding pointer or key press (e.g. a screen reader's
 * double-tap) counts as an instant tap.
 */
export function useContactPress({ onPressStart, onPressEnd, onActivate, disabled = false }: ContactPressCallbacks) {
  const pressRef = useRef<ActivePress | null>(null);
  const lastPointerEndRef = useRef(Number.NEGATIVE_INFINITY);

  const hasPressHandlers = Boolean(onPressStart || onPressEnd);

  const start = (contact: ContactKey, source: ActivePress['source'], pointerId?: number) => {
    pressRef.current = { contact, source, pointerId };
    onPressStart?.(contact);
  };

  const end = () => {
    const press = pressRef.current;
    if (!press) return;
    pressRef.current = null;
    if (press.source === 'pointer') lastPointerEndRef.current = now();
    onPressEnd?.(press.contact);
  };

  const endPointer = (event: PointerEvent<HTMLElement>) => {
    const press = pressRef.current;
    if (!press || press.source !== 'pointer' || press.pointerId !== event.pointerId) return;
    const target = event.currentTarget;
    try {
      if (typeof target.hasPointerCapture === 'function' && event.pointerId !== undefined && target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    } catch {}
    end();
  };

  const getPressProps = (contact: ContactKey): ContactPressProps => ({
    onPointerDown: (event) => {
      if (disabled || !hasPressHandlers) return;
      if (typeof event.button === 'number' && event.button > 0) return;
      if (pressRef.current) return;
      const target = event.currentTarget;
      try {
        if (typeof target.setPointerCapture === 'function' && event.pointerId !== undefined) {
          target.setPointerCapture(event.pointerId);
        }
      } catch {}
      start(contact, 'pointer', event.pointerId);
    },
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onPointerLeave: endPointer,
    onKeyDown: (event) => {
      if (!hasPressHandlers || !isPressKey(event.key)) return;
      event.preventDefault();
      if (disabled || event.repeat || pressRef.current) return;
      start(contact, 'key');
    },
    onKeyUp: (event) => {
      if (!hasPressHandlers || !isPressKey(event.key)) return;
      event.preventDefault();
      const press = pressRef.current;
      if (press && press.source === 'key' && press.contact === contact) end();
    },
    onClick: (event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      if (!hasPressHandlers) {
        onActivate?.(contact);
        return;
      }
      if (pressRef.current) return;
      if (now() - lastPointerEndRef.current < FOLLOW_UP_CLICK_MS) return;
      start(contact, 'key');
      end();
    },
    onBlur: () => {
      if (pressRef.current?.source === 'key') end();
    },
    onContextMenu: (event) => {
      if (hasPressHandlers) event.preventDefault();
    },
  });

  return { getPressProps, hasPressHandlers };
}
