import { Link } from 'react-router';
import { DataTable, type DataTableColumn } from '@/components';
import { ROUTES } from '@/app/routes';
import {
  COMMANDS,
  getShortcutAction,
  isShortcutToken,
  type CommandDefinition,
  type ShortcutMapping,
} from '@/domain/commands';
import { getContact } from '@/domain/contacts';
import { EMERGENCY_HOLD_MS, TAP_MAX_MS, formatMs } from '@/domain/timing';
import { useDevice } from '@/services/device/DeviceProvider';
import { CommandFeedbackList } from './CommandFeedbackList';
import { CommandStatus } from './CommandStatus';
import { commandWindowNote, touchLabel } from './commandPresentation';

const HEADING_ID = 'all-commands-heading';
const FEEDBACK_HEADING_ID = 'command-feedback-heading';

function commandColumns(mapping: ShortcutMapping): readonly DataTableColumn<CommandDefinition>[] {
  return [
    {
      key: 'contact',
      header: 'Contact point',
      cell: (command) => {
        const contact = getContact(command.contact);
        return (
          <span className="inline-flex items-baseline gap-2">
            <span aria-hidden="true" className="font-mono-label rounded-sm border border-border-strong px-1 leading-snug">
              {contact.abbreviation}
            </span>
            {contact.label}
          </span>
        );
      },
    },
    { key: 'touch', header: 'Touch', cell: (command) => touchLabel(command.interaction) },
    {
      key: 'command',
      header: 'Command',
      rowHeader: true,
      cell: (command) => (
        <span className="block">
          <span className="block">{command.label}</span>
          {isShortcutToken(command.token) && (
            <span className="block text-sm font-normal text-muted-foreground">
              {getShortcutAction(mapping[command.token]).label}
            </span>
          )}
        </span>
      ),
    },
    { key: 'does', header: 'What it does', cell: (command) => command.description },
    { key: 'status', header: 'Status', cell: (command) => <CommandStatus kind={command.kind} /> },
  ];
}

export interface CommandTableSectionProps {
  readonly mapping: ShortcutMapping;
  readonly longerInteractionTime: boolean;
}

/** The nine commands as a table, then the feedback each one is designed to give. */
export function CommandTableSection({ mapping, longerInteractionTime }: CommandTableSectionProps) {
  // The window the app is actually using: a connected bench ring keeps its
  // firmware's window, which "Longer interaction time" cannot change.
  const { state } = useDevice();
  const note = commandWindowNote({ mode: state.mode, windowMs: state.commandWindowMs, longerInteractionTime });
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>All nine commands</h2>
      <div className="mt-2 max-w-3xl space-y-2 text-muted-foreground">
        <p>
          Every command starts with a squeeze of the ring, which opens a command window. {note.lead}{' '}
          <strong className="font-semibold text-foreground">{note.value}</strong>
          {note.tail}{' '}
          <Link to={ROUTES.settings} className="font-medium text-primary-strong underline">
            Change it in Settings
          </Link>
        </p>
        <p>
          A brief tap is a press of up to {formatMs(TAP_MAX_MS)}. A press longer than that but shorter than{' '}
          {formatMs(EMERGENCY_HOLD_MS)} is dropped, never guessed.
        </p>
      </div>

      <DataTable
        className="mt-5"
        caption="Command map"
        columns={commandColumns(mapping)}
        rows={COMMANDS}
        rowKey={(command) => command.token}
        emptyMessage="No commands."
      />

      <h3 id={FEEDBACK_HEADING_ID} className="mt-8">
        How you would know it worked
      </h3>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Open a command to see the feedback it is designed to give, and how a phone would carry it out.
      </p>
      <div className="mt-4">
        <CommandFeedbackList />
      </div>
    </section>
  );
}
