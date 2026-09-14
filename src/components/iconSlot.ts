import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react';
import { type LucideProps } from 'lucide-react';

/** Either a lucide icon component (`Inbox`) or an already-rendered element (`<Inbox />`). */
export type IconInput = ComponentType<LucideProps> | ReactNode;

function isIconComponent(icon: IconInput): icon is ComponentType<LucideProps> {
  if (typeof icon === 'function') return true;
  return typeof icon === 'object' && icon !== null && !isValidElement(icon) && '$$typeof' in icon && 'render' in icon;
}

/** Renders an icon slot as decoration; the surrounding text always carries the meaning. */
export function renderIcon(icon: IconInput, className: string): ReactNode {
  if (icon === undefined || icon === null || icon === false) return null;
  if (isIconComponent(icon)) return createElement(icon, { className, 'aria-hidden': true });
  return icon;
}
