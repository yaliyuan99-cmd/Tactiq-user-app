import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Hand as HandIcon, Volume2 } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button } from '@/components/Button';
import { ButtonLink } from '@/components/ButtonLink';
import { EvidenceLabel } from '@/components/EvidenceLabel';
import { ContactList } from '@/components/hand/ContactList';
import { HandMap } from '@/components/hand/HandMap';
import { getCommand, type CommandToken } from '@/domain/commands';
import { type ContactKey } from '@/domain/contacts';
import { type Hand } from '@/domain/models';
import { COMMAND_WINDOW_MS, EMERGENCY_HOLD_MS, TAP_MAX_MS } from '@/domain/timing';
import { cn } from '@/lib/cn';
import { useElementWidth } from '@/lib/useElementWidth';
import { CONTACT_ENTRIES, contactEntry } from './commandExplorerModel';
import { MockPhone } from './MockPhone';
import { applyCommand, INITIAL_PHONE, PHONE_ITEMS, type PhoneState } from './tryItModel';

/** Below this column width 44 px points would overlap, so the list is shown (see HandMap). */
const MIN_HAND_WIDTH = 358;

/** A short first run, so nobody has to guess what to do. Afterwards every point is free. */
const GUIDE: readonly { readonly contact: ContactKey; readonly hint: string }[] = [
  { contact: 'middle_base', hint: 'tap the middle finger base for Next' },
  { contact: 'ring_tip', hint: 'tap the ring fingertip to read it again' },
  { contact: 'index_tip', hint: 'tap the index fingertip to open it' },
  { contact: 'index_base', hint: 'tap the index finger base to go back' },
];

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export interface TryItLiveProps {
  readonly hand?: Hand;
  readonly className?: string;
}

/**
 * The homepage's working demonstration: squeeze, tap a real button on the hand,
 * and watch a pretend phone respond. It follows the same rules as the ring
 * design (a command needs an open window, and a press that is neither a tap nor
 * a full hold is dropped), and everything in it is labelled Simulated.
 */
export function TryItLive({ hand = 'right', className }: TryItLiveProps) {
  const [phone, setPhone] = useState<PhoneState>(INITIAL_PHONE);
  const [undo, setUndo] = useState<PhoneState | null>(null);
  const [spoken, setSpoken] = useState(`${PHONE_ITEMS[0]?.title}. Squeeze the ring to begin.`);
  const [remaining, setRemaining] = useState(0);
  const [guideStep, setGuideStep] = useState(0);
  const [pressing, setPressing] = useState<ContactKey | null>(null);
  const [holdProgress, setHoldProgress] = useState<number | null>(null);
  const [flash, setFlash] = useState<ContactKey | null>(null);
  const [columnRef, columnWidth] = useElementWidth<HTMLDivElement>();

  const windowOpen = remaining > 0;
  const windowEndsAt = useRef(0);
  const press = useRef<{ contact: ContactKey; startedAt: number; armed: boolean; done: boolean } | null>(null);

  useEffect(() => {
    if (!windowOpen) return undefined;
    const timer = window.setInterval(() => {
      const left = Math.max(0, windowEndsAt.current - clock());
      setRemaining(left);
      if (left === 0 && !press.current) setSpoken((current) => (current.startsWith('Window') ? current : 'Window closed. Squeeze again.'));
    }, 100);
    return () => window.clearInterval(timer);
  }, [windowOpen]);

  const closeWindow = () => {
    windowEndsAt.current = 0;
    setRemaining(0);
  };

  const run = useCallback(
    (token: CommandToken, contact: ContactKey) => {
      const result = applyCommand(phone, token, undo);
      setUndo(token === 'undo' ? null : phone);
      setPhone(result.state);
      setSpoken(`${getCommand(token).label}: ${result.spoken}`);
      setFlash(contact);
      setGuideStep((step) => (GUIDE[step]?.contact === contact ? step + 1 : step));
    },
    [phone, undo],
  );

  // The five-second hold completes while the press is still down.
  useEffect(() => {
    if (pressing !== 'pinky_tip') return undefined;
    const timer = window.setInterval(() => {
      const current = press.current;
      if (!current || !current.armed || current.done) return;
      const progress = Math.min(1, (clock() - current.startedAt) / EMERGENCY_HOLD_MS);
      setHoldProgress(progress);
      if (progress === 1) {
        current.done = true;
        run('emergency', 'pinky_tip');
        closeWindow();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [pressing, run]);

  const squeeze = () => {
    windowEndsAt.current = clock() + COMMAND_WINDOW_MS;
    setRemaining(COMMAND_WINDOW_MS);
    const guide = GUIDE[guideStep];
    setSpoken(guide ? `Window open. Now ${guide.hint}.` : 'Window open. Tap any point.');
  };

  const pressStart = (contact: ContactKey) => {
    press.current = { contact, startedAt: clock(), armed: windowOpen, done: false };
    setPressing(contact);
    setFlash(null);
    if (contact === 'pinky_tip' && windowOpen) setHoldProgress(0);
  };

  const pressEnd = (contact: ContactKey) => {
    const current = press.current;
    press.current = null;
    setPressing(null);
    setHoldProgress(null);
    if (!current || current.done) return;
    if (!current.armed) {
      setSpoken('Ignored. The ring is asleep until you squeeze it, so a stray touch does nothing.');
      return;
    }
    if (clock() - current.startedAt > TAP_MAX_MS) {
      setSpoken(
        contact === 'pinky_tip'
          ? 'Dropped. Too long for a tap, too short for the five-second hold.'
          : 'Dropped. That was too long for a tap, so the ring does not guess.',
      );
      closeWindow();
      return;
    }
    run(contactEntry(contact).tap.token, contact);
    closeWindow();
  };

  const guide = GUIDE[guideStep];
  const fits = columnWidth === null || columnWidth >= MIN_HAND_WIDTH;
  const mapProps = {
    activeContact: pressing,
    targetContact: guide?.contact ?? null,
    flashContact: flash,
    holdProgress: pressing === 'pinky_tip' ? holdProgress : null,
    holdLabel: 'Emergency hold progress',
    labelFor: (contact: ContactKey) => CONTACT_ENTRIES.find((e) => e.contact.key === contact)?.summary ?? '',
    onPressStart: pressStart,
    onPressEnd: pressEnd,
  };

  return (
    <section
      aria-label="Try it: a simulated ring and phone"
      className={cn('hero-band rounded-md p-4 sm:p-6', className)}
    >
      <div className="flex flex-col gap-5">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(13rem,15rem)] md:items-center">
        <div ref={columnRef} className="min-w-0">
          {fits ? <HandMap hand={hand} size="md" {...mapProps} /> : <ContactList {...mapProps} />}
        </div>

        <div className="grid gap-4">
          <MockPhone phone={phone} />
        </div>
      </div>

      {/* First on a phone, where the eight points become a long list: the squeeze comes first in use too. */}
      <div className="order-first grid gap-3 md:order-none">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full origin-left rounded-full bg-primary"
            style={{ transform: `scaleX(${remaining / COMMAND_WINDOW_MS})` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={squeeze}
            className={cn('flex-1 basis-56', windowOpen && 'window-open')}
            leadingIcon={<HandIcon className="h-5 w-5" />}
          >
            {windowOpen ? `Window open, ${Math.ceil(remaining / 1000)} s` : 'Squeeze the ring'}
          </Button>
          <ButtonLink to={ROUTES.demo} variant="secondary" size="lg" trailingIcon={<ArrowRight className="h-5 w-5 transition-transform group-hover/button:translate-x-0.5" />}>
            Full demo
          </ButtonLink>
        </div>
        <p role="status" className="flex min-h-[4.75rem] items-start gap-2 rounded-xl bg-muted px-3 py-2.5">
          <Volume2 className="mt-1 h-4 w-4 shrink-0 text-primary-strong" aria-hidden="true" />
          <span>{spoken}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <EvidenceLabel kind="simulated" />
          <span>No ring and no real phone. Hold the pinky fingertip for five seconds to try the emergency hold: nothing is sent.</span>
        </p>
      </div>
      </div>
    </section>
  );
}

export default TryItLive;
