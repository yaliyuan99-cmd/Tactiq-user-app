import { Check } from 'lucide-react';
import { getContact, type ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, Hand } from '@/domain/models';
import { cn } from '@/lib/cn';
import { acceptedFor, requiredPerPoint } from './calibrationFlow';

const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;
const SEGMENTS = ['tip', 'base'] as const;

export interface PointCoverageProps {
  readonly profile: CalibrationProfile | null;
  readonly hand: Hand;
  /** The point being asked for now, if any. */
  readonly current?: ContactKey | null;
  readonly className?: string;
}

/**
 * The eight points laid out as they sit on the hand, each with its accepted
 * taps. Fingers run the same way as the hand drawing, tips above bases.
 */
export function PointCoverage({ profile, hand, current = null, className }: PointCoverageProps) {
  const required = requiredPerPoint(profile);
  const fingers = hand === 'left' ? [...FINGERS].reverse() : FINGERS;

  return (
    <ul role="list" aria-label="Accepted taps at each point" className={cn('grid grid-cols-4 gap-1.5', className)}>
      {SEGMENTS.flatMap((segment) =>
        fingers.map((finger) => {
          const key = `${finger}_${segment}` as ContactKey;
          const contact = getContact(key);
          const accepted = Math.min(acceptedFor(profile, key), required);
          const done = accepted >= required;
          const isCurrent = key === current;
          return (
            <li
              key={key}
              data-contact-coverage={key}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'grid justify-items-center gap-1 rounded-lg border px-1 py-2',
                isCurrent ? 'border-primary bg-secondary' : 'border-border',
              )}
            >
              <span className="sr-only">{`${contact.label}: ${accepted} of ${required} accepted${isCurrent ? ', asking now' : ''}`}</span>
              <span aria-hidden="true" className="inline-flex h-5 items-center gap-0.5 text-sm font-semibold">
                {contact.abbreviation}
                {done && <Check className="h-3.5 w-3.5 text-status-confirmed" />}
              </span>
              <span aria-hidden="true" className="flex gap-0.5">
                {Array.from({ length: required }, (_, pip) => (
                  <span
                    key={pip}
                    className={cn('h-1.5 w-1.5 rounded-full', pip < accepted ? 'bg-primary' : 'border border-border-strong')}
                  />
                ))}
              </span>
            </li>
          );
        }),
      )}
    </ul>
  );
}
