import { commandsForContact } from '@/domain/commands';
import { getContact, type ContactKey } from '@/domain/contacts';
import { type ContactMapStateProps } from './types';

export const DEFAULT_HOLD_LABEL = 'Five-second hold';

export interface ContactVisualState {
  readonly contact: ContactKey;
  readonly isShortcut: boolean;
  readonly isEmergencyCapable: boolean;
  readonly isActive: boolean;
  readonly isTarget: boolean;
  /** Detected somewhere other than the target: a misread. */
  readonly isMisread: boolean;
  readonly isFlashing: boolean;
  readonly showHold: boolean;
}

export function contactVisualState(contact: ContactKey, props: ContactMapStateProps): ContactVisualState {
  const commands = commandsForContact(contact);
  const isActive = props.activeContact === contact;
  return {
    contact,
    isShortcut: commands.some((c) => c.kind === 'shortcut'),
    isEmergencyCapable: commands.some((c) => c.kind === 'emergency'),
    isActive,
    isTarget: props.targetContact === contact,
    isMisread:
      props.detectedContact !== undefined &&
      props.detectedContact !== null &&
      props.detectedContact === contact &&
      props.detectedContact !== props.targetContact,
    isFlashing: props.flashContact === contact,
    showHold: isActive && typeof props.holdProgress === 'number',
  };
}

/** "Index fingertip, Confirm, target, detected here" — the accessible name of a map point. */
export function contactAccessibleName(state: ContactVisualState, labelFor?: (contact: ContactKey) => string): string {
  let name = getContact(state.contact).label;
  if (labelFor) name += `, ${labelFor(state.contact)}`;
  if (state.isTarget) name += ', target';
  if (state.isMisread) name += ', detected here';
  return name;
}
