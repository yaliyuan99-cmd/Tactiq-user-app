import { useId, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { type ContactKey } from '@/domain/contacts';
import { type Hand } from '@/domain/models';
import { EvidenceLabel } from '@/components/EvidenceLabel';
import { cn } from '@/lib/cn';
import { CommandDetail } from './CommandDetail';
import { ProductStage } from './ProductStage';
import {
  CONTACT_ENTRIES,
  contactEntry,
  INTERACTION_LABELS,
  KIND_LABELS,
  type ContactEntry,
} from './commandExplorerModel';

type ExplorerView = 'grid' | 'list';

const VIEWS = [
  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
  { id: 'list', label: 'List', Icon: List },
] as const;

const CELL =
  'target-44 flex h-full w-full flex-col justify-center gap-0.5 rounded-md border px-3 py-2.5 text-left ' +
  'transition-colors duration-[var(--dur-tap)]';
const ROW =
  'target-44 grid w-full items-center gap-x-4 gap-y-1 rounded-md border px-4 py-3 text-left ' +
  'transition-colors duration-[var(--dur-tap)] min-[34rem]:grid-cols-[minmax(0,1fr)_auto]';

function selectedClasses(isSelected: boolean): string {
  return isSelected
    ? 'border-primary bg-secondary text-secondary-foreground ring-2 ring-primary'
    : 'border-border-strong bg-card hover:bg-secondary';
}

interface ChoiceProps {
  readonly entry: ContactEntry;
  readonly isSelected: boolean;
  readonly onSelect: (contact: ContactKey) => void;
}

function GridCell({ entry, isSelected, onSelect }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-label={entry.accessibleName}
      aria-pressed={isSelected}
      data-contact={entry.contact.key}
      onClick={() => onSelect(entry.contact.key)}
      className={cn(CELL, selectedClasses(isSelected))}
    >
      <span className="font-medium">{entry.contact.label}</span>
      <span className={cn('text-sm', isSelected ? undefined : 'text-muted-foreground')}>{entry.summary}</span>
    </button>
  );
}

function ListRow({ entry, isSelected, onSelect }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      data-contact={entry.contact.key}
      onClick={() => onSelect(entry.contact.key)}
      className={cn(ROW, selectedClasses(isSelected))}
    >
      <span className="min-w-0">
        <span className="font-medium">{entry.contact.label}</span>
        <span className={isSelected ? undefined : 'text-muted-foreground'}> — {entry.summary}</span>
      </span>
      <span className="font-mono-label flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground min-[34rem]:justify-end">
        <span>{entry.hold ? `${INTERACTION_LABELS.tap}, or ${INTERACTION_LABELS.hold_5s.toLowerCase()}` : INTERACTION_LABELS.tap}</span>
        <span>{KIND_LABELS[entry.tap.kind]}</span>
      </span>
    </button>
  );
}

export interface CommandExplorerProps {
  readonly hand?: Hand;
  readonly initialContact?: ContactKey;
  readonly className?: string;
}

/**
 * The eight contact points, browsable with a keyboard and a screen reader.
 *
 * Two equivalent views over the same selection: a grid that keeps the hand's
 * anatomy (one column per finger, fingertip above finger base) and a list that
 * spells out each point's command, press length and whether it is fixed. The
 * drawing beside them is decorative — the controls carry the meaning, and no
 * control is named by an abbreviation.
 */
export function CommandExplorer({ hand = 'right', initialContact = 'index_tip', className }: CommandExplorerProps) {
  const [selected, setSelected] = useState<ContactKey>(initialContact);
  const [view, setView] = useState<ExplorerView>('grid');
  const viewLabelId = `explorer-view-${useId().replace(/:/g, '')}`;
  const entry = contactEntry(selected);

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start lg:gap-12', className)}>
      <div className="grid gap-3">
        <ProductStage
          hand={hand}
          variant="compact"
          highlightContact={selected}
          legend={false}
          className="mx-auto max-w-[15rem] sm:max-w-[18rem]"
        />
        <p className="text-sm text-muted-foreground">
          {hand === 'left' ? 'Left' : 'Right'} hand, palm towards you. The highlighted point is {entry.contact.label.toLowerCase()}.
        </p>
        <p>
          <EvidenceLabel kind="design_intent" detail="no ring has been built" />
        </p>
        <p className="text-sm text-muted-foreground">
          Nothing is connected here. This is the planned command map, and the app simulates the ring so you can learn
          and practise it.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span id={viewLabelId} className="font-mono-label text-muted-foreground">
            View
          </span>
          <div role="group" aria-labelledby={viewLabelId} className="flex gap-1">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={cn(
                  'target-44 inline-flex items-center gap-2 rounded-md border px-4 py-2 font-medium',
                  view === id
                    ? 'border-primary bg-secondary text-secondary-foreground ring-2 ring-primary'
                    : 'border-border-strong bg-card hover:bg-secondary',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === 'grid' ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-4 sm:grid-rows-2">
            {CONTACT_ENTRIES.map((item) => (
              <li key={item.contact.key} className="flex">
                <GridCell entry={item} isSelected={item.contact.key === selected} onSelect={setSelected} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-2">
            {CONTACT_ENTRIES.map((item) => (
              <li key={item.contact.key}>
                <ListRow entry={item} isSelected={item.contact.key === selected} onSelect={setSelected} />
              </li>
            ))}
          </ul>
        )}

        <CommandDetail entry={entry} />
      </div>
    </div>
  );
}
