import { useState } from 'react';
import { Link } from 'react-router';
import { HandMap } from '@/components';
import { ROUTES } from '@/app/routes';
import { contactEntry } from '@/components/product';
import { CONTACT_KEYS, getContact, type ContactKey } from '@/domain/contacts';
import type { CommandMapping, Hand } from '@/domain/models';
import { useElementWidth } from '@/lib/useElementWidth';
import { SavedShortcutsPanel } from './SavedShortcutsPanel';
import { contactCommandLabel, mapCaption } from './commandPresentation';

const HEADING_ID = 'command-map-heading';
/** Below this width 44 px points overlap, so the map is display-only and the list below does the job. */
const MIN_INTERACTIVE_WIDTH = 358;
const CONTACT_OPTIONS: readonly ContactKey[] = CONTACT_KEYS;

export interface CommandMapSectionProps {
  readonly hand: Hand;
  readonly saved: CommandMapping;
  readonly dirty: boolean;
  readonly onChangeShortcuts: () => void;
}

/** The two saved shortcuts (with the way to change them) first, then the hand drawing with every point's command. */
export function CommandMapSection({ hand, saved, dirty, onChangeShortcuts }: CommandMapSectionProps) {
  const [selected, setSelected] = useState<ContactKey>('index_tip');
  const [mapRef, mapWidth] = useElementWidth<HTMLDivElement>();
  const interactive = mapWidth !== null && mapWidth >= MIN_INTERACTIVE_WIDTH;
  const entry = contactEntry(selected);
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>Where each command lives</h2>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Your thumb touches one of eight points on your fingers. The map shows the hand you chose in Settings.
      </p>
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <SavedShortcutsPanel saved={saved} dirty={dirty} onChangeShortcuts={onChangeShortcuts} />
        <div className="rounded-lg border-[1.5px] border-foreground bg-card p-4 shadow-card sm:p-6">
          <h3 className="mb-2">Contact points</h3>
          <div ref={mapRef}>
            <HandMap
              hand={hand}
              interactive={interactive}
              activeContact={selected}
              onActivate={setSelected}
              labelFor={(contact) => contactCommandLabel(contact, saved.shortcuts)}
              caption={interactive ? 'Choose a point to see what it does.' : mapCaption(hand)}
              showLegend
            />
          </div>
          <div role="status" className="mt-4 rounded-xl bg-muted p-4">
            <p className="font-mono-label text-muted-foreground">{getContact(selected).label}</p>
            <p className="mt-1 text-lg font-semibold">{contactCommandLabel(selected, saved.shortcuts)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{entry.contact.howToFind}</p>
          </div>
          {mapWidth !== null && !interactive && (
            <label className="mt-3 block text-sm font-medium">
              Point
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value as ContactKey)}
                className="target-44 mt-1 block w-full rounded-md border border-input bg-input-background px-3"
              >
                {CONTACT_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {getContact(key).label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
