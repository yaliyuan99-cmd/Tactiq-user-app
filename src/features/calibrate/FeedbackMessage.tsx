import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FeedbackTone } from './calibrationWording';

const TONES: Record<FeedbackTone, { Icon: LucideIcon; icon: string }> = {
  accepted: { Icon: CircleCheck, icon: 'text-status-confirmed' },
  retry: { Icon: CircleAlert, icon: 'text-status-target' },
  info: { Icon: Info, icon: 'text-status-simulation' },
};

export interface FeedbackMessageProps {
  readonly text: string;
  readonly tone: FeedbackTone;
  readonly className?: string;
}

/**
 * What the last tap meant, on screen. Not a live region: the page announces
 * the same words once through FeedbackProvider. The words carry the meaning;
 * the icon and its colour only repeat it.
 */
export function FeedbackMessage({ text, tone, className }: FeedbackMessageProps) {
  const { Icon, icon } = TONES[tone];
  return (
    <p
      data-tone={tone}
      className={cn('flex items-start gap-2.5 rounded-md border border-border bg-background px-4 py-3 font-medium', className)}
    >
      <Icon className={cn('mt-1 h-4 w-4 shrink-0', icon)} aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
