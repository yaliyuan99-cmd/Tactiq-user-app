import { Link } from 'react-router';
import { HandMap } from '@/components';
import { ROUTES } from '@/app/routes';
import type { CommandMapping, Hand } from '@/domain/models';
import { SavedShortcutsPanel } from './SavedShortcutsPanel';
import { contactCommandLabel, mapCaption } from './commandPresentation';

const HEADING_ID = 'command-map-heading';

export interface CommandMapSectionProps {
  readonly hand: Hand;
  readonly saved: CommandMapping;
  readonly dirty: boolean;
  readonly onChangeShortcuts: () => void;
}

/** The two saved shortcuts (with the way to change them) first, then the hand drawing with every point's command. */
export function CommandMapSection({ hand, saved, dirty, onChangeShortcuts }: CommandMapSectionProps) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>Where each command lives</h2>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Your thumb touches one of eight points on your fingers. The map shows the hand you chose in Settings.
      </p>
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <SavedShortcutsPanel saved={saved} dirty={dirty} onChangeShortcuts={onChangeShortcuts} />
        <div className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-6">
          <h3 className="mb-2">Contact points</h3>
          <HandMap
            hand={hand}
            interactive={false}
            labelFor={(contact) => contactCommandLabel(contact, saved.shortcuts)}
            caption={mapCaption(hand)}
            showLegend
          />
          <p className="mt-4 text-center text-sm">
            <Link
              to={ROUTES.settings}
              className="target-44 inline-flex items-center font-medium text-primary-strong underline"
            >
              Change hand in Settings
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
