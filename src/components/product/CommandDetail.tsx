import { cn } from '@/lib/cn';
import {
  INTERACTION_DETAILS,
  INTERACTION_LABELS,
  KIND_LABELS,
  platformRouteText,
  type ContactEntry,
} from './commandExplorerModel';

const CHIP = 'font-mono-label inline-flex items-center rounded-full border border-border px-2.5 py-0.5';

function Chips({ labels }: { labels: readonly string[] }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
      {labels.map((label) => (
        <span key={label} className={CHIP}>
          {label}
        </span>
      ))}
    </p>
  );
}

export interface CommandDetailProps {
  readonly entry: ContactEntry;
  readonly className?: string;
}

/**
 * What the selected contact point does. The first block is a status region, so
 * a screen reader hears the point and its command as the selection changes;
 * the reference rows below it are ordinary content, read on demand.
 */
export function CommandDetail({ entry, className }: CommandDetailProps) {
  const { contact, tap, hold } = entry;
  return (
    <div className={cn('rounded-lg border-[1.5px] border-foreground bg-card p-5 text-card-foreground shadow-card', className)}>
      <div role="status">
        <p className="font-mono-label text-muted-foreground">{contact.label}</p>
        <p className="mt-1 text-xl font-semibold">{tap.label}</p>
        <Chips labels={[INTERACTION_LABELS.tap, KIND_LABELS[tap.kind]]} />
        <p className="mt-3">{tap.description}</p>
      </div>

      <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="font-medium">Find it by touch</dt>
          <dd className="text-muted-foreground">{contact.howToFind}</dd>
        </div>
        <div>
          <dt className="font-medium">What the phone would do</dt>
          <dd className="text-muted-foreground">{platformRouteText(tap)}</dd>
        </div>
        <div>
          <dt className="font-medium">How long to press</dt>
          <dd className="text-muted-foreground">{INTERACTION_DETAILS.tap}</dd>
        </div>
      </dl>

      {hold && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-mono-label text-muted-foreground">Same point, longer press</p>
          <p className="mt-1 text-lg font-semibold">{hold.label}</p>
          <Chips labels={[INTERACTION_LABELS.hold_5s, KIND_LABELS[hold.kind]]} />
          <p className="mt-3 text-sm">{hold.description}</p>
          <p className="mt-2 text-sm text-muted-foreground">{INTERACTION_DETAILS.hold_5s}</p>
        </div>
      )}
    </div>
  );
}
