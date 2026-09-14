import { type ContactKey } from '@/domain/contacts';
import { type Hand } from '@/domain/models';
import { type ContactPressCallbacks } from './useContactPress';

/** Props shared by HandMap and its list-based alternative, ContactList. */
export interface ContactMapStateProps extends ContactPressCallbacks {
  /** When false, points are drawn but are not buttons. Defaults to true. */
  readonly interactive?: boolean;
  /** The point currently pressed; shown pressed (aria-pressed) and in the accent colour. */
  readonly activeContact?: ContactKey | null;
  /** The point the user was asked to tap. */
  readonly targetContact?: ContactKey | null;
  /** Where a press was detected. Highlighted as "detected here" when it differs from the target. */
  readonly detectedContact?: ContactKey | null;
  /** Adds the visual-confirmation flash to this point. */
  readonly flashContact?: ContactKey | null;
  /** 0..1 progress of a hold on the active contact, drawn as a ring. Omit when no hold is running. */
  readonly holdProgress?: number | null;
  readonly holdArmed?: boolean;
  /** Accessible name for the hold ring. Defaults to "Five-second hold". */
  readonly holdLabel?: string;
  /** Extra words for each point, usually the command name. */
  readonly labelFor?: (contact: ContactKey) => string;
  readonly caption?: string;
  readonly className?: string;
}

export interface HandMapProps extends ContactMapStateProps {
  readonly hand: Hand;
  readonly showLegend?: boolean;
  readonly size?: 'sm' | 'md' | 'lg';
}

export type ContactListProps = ContactMapStateProps;
