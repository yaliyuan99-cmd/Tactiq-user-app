import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getFocusable, hideOthers, isTopDialog, lockScroll, popDialog, pushDialog } from './modal';

export type DialogSize = 'sm' | 'md' | 'lg';

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children?: ReactNode;
  /** Receives focus on open. Otherwise the first focusable control in the body, then the footer, then the close button. */
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly size?: DialogSize;
  /** Action row under the body, e.g. Cancel / Save. */
  readonly footer?: ReactNode;
  readonly closeLabel?: string;
  readonly hideCloseButton?: boolean;
  /** Defaults to true. */
  readonly closeOnBackdrop?: boolean;
}

const SIZES: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

/**
 * Modal dialog in a portal. Focus moves in on open, Tab is trapped, Escape and
 * the backdrop close it, focus returns to the opener, background scrolling is
 * locked and the rest of the page is hidden from assistive technology.
 */
export function Dialog(props: DialogProps) {
  if (!props.open || typeof document === 'undefined') return null;
  return <OpenDialog {...props} />;
}

function OpenDialog({
  onClose,
  title,
  description,
  children,
  initialFocusRef,
  size = 'md',
  footer,
  closeLabel = 'Close',
  hideCloseButton = false,
  closeOnBackdrop = true,
}: DialogProps) {
  const baseId = useId().replace(/:/g, '');
  const titleId = `dialog-${baseId}-title`;
  const descriptionId = description ? `dialog-${baseId}-description` : undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const token = pushDialog();
    const restoreHidden = hideOthers(root);
    const unlockScroll = lockScroll();

    const firstIn = (el: HTMLElement | null) => (el ? getFocusable(el)[0] : undefined);
    const initial =
      initialFocusRef?.current ?? firstIn(bodyRef.current) ?? firstIn(footerRef.current) ?? firstIn(panel) ?? panel;
    initial.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog(token)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(panel);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);
      if (event.shiftKey) {
        if (!inside || active === first || active === panel) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isTopDialog(token)) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        (getFocusable(panel)[0] ?? panel).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      popDialog(token);
      restoreHidden();
      unlockScroll();
      if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-50 overflow-y-auto" data-dialog-root="">
      <div
        aria-hidden="true"
        data-dialog-backdrop=""
        className="fixed inset-0 bg-foreground/45"
        onClick={() => {
          if (closeOnBackdrop) onCloseRef.current();
        }}
      />
      <div className="pointer-events-none relative flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn(
            'animate-enter-rise pointer-events-auto relative w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-raised',
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <h2 id={titleId}>{title}</h2>
              {description && (
                <div id={descriptionId} className="mt-2 text-muted-foreground">
                  {description}
                </div>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => onCloseRef.current()}
                className="target-44 -mr-2 -mt-2 inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div ref={bodyRef} className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {children}
          </div>
          {footer && (
            <div ref={footerRef} className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
